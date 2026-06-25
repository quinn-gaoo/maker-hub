from __future__ import annotations

import re
import uuid

from qcloud_cos import CosConfig, CosS3Client
from qcloud_cos.cos_exception import CosServiceError
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.errors import bad_request, forbidden, not_found
from app.models.comment import Comment
from app.models.feedback import Feedback
from app.models.project import Project, ProjectImage
from app.models.project_reaction import ProjectReaction
from app.models.tag import Tag
from app.models.user import User
from app.schemas.admin import (
    AdminCommentListItem,
    AdminDashboardStatsResponse,
    AdminFeedbackListItem,
    AdminFeedbackUpdate,
    AdminProjectListItem,
    AdminProjectUpdate,
    AdminUserListItem,
    AdminUserUpdate,
)
from app.schemas.comments import CommentResponse
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.schemas.projects import (
    AdminProjectCreate,
    ProjectCardResponse,
    ProjectCreate,
    ProjectDetailResponse,
    ProjectImageResponse,
    ProjectReactionResponse,
    ProjectViewCountResponse,
    ProjectUpdate,
)
from app.schemas.stats import HomeStatsResponse
from app.schemas.tags import TagResponse
from app.schemas.uploads import ProjectImageUploadResponse
from app.schemas.users import UserProfileResponse, UserProfileUpdate, UserSummary

MAX_PROJECT_IMAGES = 3
MAX_COMMENT_LENGTH = 500
MAX_FEEDBACK_LENGTH = 1000
IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"}
CONTENT_TYPE_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
}
REACTION_UPVOTE = "up"
REACTION_DOWNVOTE = "down"
VALID_REACTIONS = {REACTION_UPVOTE, REACTION_DOWNVOTE}
ADMIN_ALLOWED_USER_STATUSES = {"active", "banned"}
ADMIN_ALLOWED_PROJECT_STATUSES = {"published", "hidden", "deleted"}
ADMIN_ALLOWED_FEEDBACK_STATUSES = {"new", "reviewed", "resolved"}


def slugify(value: str) -> str:
    base = re.sub(r"[^a-z0-9\u4e00-\u9fa5]+", "-", value.lower().strip()).strip("-")
    return (base or "project")[:80]


def ensure_published_project(project: Project | None) -> Project:
    if not project or project.status != "published":
        raise not_found("项目不存在。")
    return project


def get_user_or_404(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if not user or user.status == "banned":
        raise forbidden("当前用户无法执行该操作。")
    return user


def ensure_user_profile(db: Session, user: User) -> User:
    base = slugify(user.name or user.email or "creator").replace("-", "")[:24] or "creator"
    candidate = base
    suffix = 1
    while db.execute(select(User.id).where(User.username == candidate, User.id != user.id)).scalar_one_or_none():
        suffix += 1
        candidate = f"{base}{suffix}"

    if not user.username:
        user.username = candidate
    if not user.avatar_url:
        user.avatar_url = user.image
    if not user.bio:
        user.bio = ""
    if not user.status:
        user.status = "active"
    ensure_admin_role(user)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def unique_slug(db: Session, title: str, current_project_id: str | None = None) -> str:
    base = slugify(title)
    candidate = base
    suffix = 1
    while True:
        stmt = select(Project.id).where(Project.slug == candidate)
        if current_project_id:
            stmt = stmt.where(Project.id != current_project_id)
        existing = db.execute(stmt).scalar_one_or_none()
        if not existing:
            return candidate
        suffix += 1
        candidate = f"{base}-{suffix}"


def normalize_project_urls(image_urls: list[str]) -> list[str]:
    if len(image_urls) < 1 or len(image_urls) > MAX_PROJECT_IMAGES:
        raise bad_request("图片数量必须在 1 到 3 张之间。", {"images": "图片数量不合法"})
    return image_urls


def validate_project_urls(image_urls: list[str]) -> list[str]:
    if len(image_urls) > MAX_PROJECT_IMAGES:
        raise bad_request("图片数量必须在 0 到 3 张之间。", {"images": "图片数量不合法"})
    return image_urls


def get_or_create_tags(db: Session, tag_names: list[str]) -> list[Tag]:
    tags: list[Tag] = []
    for name in tag_names:
        slug = slugify(name)
        existing = db.execute(select(Tag).where(or_(Tag.name == name, Tag.slug == slug))).scalar_one_or_none()
        if existing:
            tags.append(existing)
            continue
        tag = Tag(id=str(uuid.uuid4()), name=name, slug=slug)
        db.add(tag)
        tags.append(tag)
    return tags


def map_user(user: User) -> UserSummary:
    return UserSummary(
        id=user.id,
        name=user.name,
        username=user.username,
        avatar_url=user.avatar_url or user.image,
        bio=user.bio,
    )


def get_home_stats(db: Session) -> HomeStatsResponse:
    creator_count = db.execute(
        select(func.count()).select_from(User).where(User.status == "active", User.username.is_not(None))
    ).scalar_one()
    project_count = db.execute(
        select(func.count()).select_from(Project).where(Project.status == "published")
    ).scalar_one()
    comment_count = db.execute(
        select(func.count()).select_from(Comment).where(Comment.status == "published")
    ).scalar_one()
    recent_users = (
        db.execute(
            select(User)
            .where(User.status == "active", User.username.is_not(None))
            .order_by(User.created_at.desc())
            .limit(5)
        )
        .scalars()
        .all()
    )

    return HomeStatsResponse(
        creator_count=creator_count,
        project_count=project_count,
        comment_count=comment_count,
        recent_users=[map_user(user) for user in recent_users],
    )


def map_tag(tag: Tag) -> TagResponse:
    return TagResponse(id=tag.id, name=tag.name, slug=tag.slug)


def map_comment(comment: Comment) -> CommentResponse:
    return CommentResponse(
        id=comment.id,
        content=comment.content,
        created_at=comment.created_at,
        author=map_user(comment.user),
    )


def map_feedback(feedback: Feedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=feedback.id,
        content=feedback.content,
        status=feedback.status,
        created_at=feedback.created_at,
    )


def ensure_admin_role(user: User) -> User:
    settings = get_settings()
    if settings.is_admin_email(user.email) and user.role != "admin":
        user.role = "admin"
    elif user.role not in {"user", "admin"}:
        user.role = "user"
    return user


def summarize_reactions(project: Project, current_user_id: str | None = None) -> tuple[int, int, str | None]:
    upvote_count = sum(1 for item in project.reactions if item.reaction == REACTION_UPVOTE)
    downvote_count = sum(1 for item in project.reactions if item.reaction == REACTION_DOWNVOTE)
    current_reaction = next((item.reaction for item in project.reactions if item.user_id == current_user_id), None)
    return upvote_count, downvote_count, current_reaction


def map_project_card(
    project: Project,
    comment_count: int | None = None,
    current_user_id: str | None = None,
) -> ProjectCardResponse:
    upvote_count, downvote_count, current_reaction = summarize_reactions(project, current_user_id)
    return ProjectCardResponse(
        id=project.id,
        slug=project.slug,
        title=project.title,
        description=project.description,
        project_url=project.project_url,
        github_url=project.github_url,
        cover_image_url=project.cover_image_url,
        is_official=project.is_official,
        view_count=project.view_count,
        upvote_count=upvote_count,
        downvote_count=downvote_count,
        current_reaction=current_reaction,
        created_at=project.created_at,
        author=map_user(project.user),
        tags=[map_tag(tag) for tag in project.tags],
        comment_count=comment_count if comment_count is not None else len([item for item in project.comments if item.status == "published"]),
    )


def map_project_detail(project: Project, current_user_id: str | None = None) -> ProjectDetailResponse:
    published_comments = [comment for comment in project.comments if comment.status == "published"]
    return ProjectDetailResponse(
        **map_project_card(project, len(published_comments), current_user_id).model_dump(),
        images=[
            ProjectImageResponse(id=image.id, image_url=image.image_url, sort_order=image.sort_order)
            for image in sorted(project.images, key=lambda item: item.sort_order)
        ],
        comments=[map_comment(comment) for comment in published_comments],
    )


def list_projects(
    db: Session,
    page: int,
    page_size: int,
    tag: str | None = None,
    user: str | None = None,
    q: str | None = None,
    sort: str = "latest",
    current_user_id: str | None = None,
) -> tuple[list[ProjectCardResponse], int]:
    upvote_counts = (
        select(ProjectReaction.project_id, func.count(ProjectReaction.id).label("upvote_count"))
        .where(ProjectReaction.reaction == REACTION_UPVOTE)
        .group_by(ProjectReaction.project_id)
        .subquery()
    )
    comment_counts = (
        select(Comment.project_id, func.count(Comment.id).label("comment_count"))
        .where(Comment.status == "published")
        .group_by(Comment.project_id)
        .subquery()
    )
    base_query: Select[tuple[Project]] = (
        select(Project)
        .outerjoin(upvote_counts, upvote_counts.c.project_id == Project.id)
        .outerjoin(comment_counts, comment_counts.c.project_id == Project.id)
        .options(
            joinedload(Project.user),
            joinedload(Project.tags),
            joinedload(Project.comments),
            joinedload(Project.reactions),
        )
        .where(Project.status == "published")
    )

    if tag:
        base_query = base_query.join(Project.tags).where(Tag.slug == tag)

    if user:
        base_query = base_query.join(Project.user).where(User.username == user)

    if q:
        base_query = base_query.where(or_(Project.title.ilike(f"%{q}%"), Project.description.ilike(f"%{q}%")))

    if sort == "top":
        base_query = base_query.order_by(
            func.coalesce(upvote_counts.c.upvote_count, 0).desc(),
            Project.created_at.desc(),
        )
    elif sort == "discussed":
        base_query = base_query.order_by(
            func.coalesce(comment_counts.c.comment_count, 0).desc(),
            Project.created_at.desc(),
        )
    else:
        base_query = base_query.order_by(Project.created_at.desc())

    total = db.execute(select(func.count()).select_from(base_query.subquery())).scalar_one()
    items = (
        db.execute(base_query.offset((page - 1) * page_size).limit(page_size))
        .unique()
        .scalars()
        .all()
    )

    return [map_project_card(project, current_user_id=current_user_id) for project in items], total


def get_project_by_id(db: Session, project_id: str, current_user_id: str | None = None) -> ProjectDetailResponse:
    project = db.execute(
        select(Project)
        .options(
            joinedload(Project.user),
            joinedload(Project.tags),
            joinedload(Project.images),
            joinedload(Project.comments).joinedload(Comment.user),
            joinedload(Project.reactions),
        )
        .where(Project.id == project_id)
    ).unique().scalar_one_or_none()
    return map_project_detail(ensure_published_project(project), current_user_id)


def get_manageable_project(db: Session, project_id: str, user_id: str) -> ProjectDetailResponse:
    project = db.execute(
        select(Project)
        .options(
            joinedload(Project.user),
            joinedload(Project.tags),
            joinedload(Project.images),
            joinedload(Project.comments).joinedload(Comment.user),
            joinedload(Project.reactions),
        )
        .where(Project.id == project_id)
    ).unique().scalar_one_or_none()

    if not project:
        raise not_found("项目不存在。")
    if project.user_id != user_id:
        raise forbidden("不能编辑别人的项目。")
    return map_project_detail(project, user_id)


def increment_project_view_count(db: Session, project_id: str) -> ProjectViewCountResponse:
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
    project = ensure_published_project(project)
    project.view_count += 1
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectViewCountResponse(project_id=project.id, view_count=project.view_count)


def react_to_project(db: Session, project_id: str, user_id: str, reaction: str) -> ProjectReactionResponse:
    if reaction not in VALID_REACTIONS:
        raise bad_request("不支持的反馈类型。", {"reaction": "reaction 必须是 up 或 down"})

    project = db.execute(
        select(Project)
        .options(joinedload(Project.reactions))
        .where(Project.id == project_id)
    ).unique().scalar_one_or_none()
    project = ensure_published_project(project)
    get_user_or_404(db, user_id)

    existing = next((item for item in project.reactions if item.user_id == user_id), None)
    if existing and existing.reaction == reaction:
        db.delete(existing)
    elif existing:
        existing.reaction = reaction
        db.add(existing)
    else:
        db.add(ProjectReaction(project_id=project.id, user_id=user_id, reaction=reaction))

    db.commit()
    refreshed = db.execute(
        select(Project)
        .options(joinedload(Project.reactions))
        .where(Project.id == project.id)
    ).unique().scalar_one()
    upvote_count, downvote_count, current_reaction = summarize_reactions(refreshed, user_id)
    return ProjectReactionResponse(
        project_id=refreshed.id,
        upvote_count=upvote_count,
        downvote_count=downvote_count,
        current_reaction=current_reaction,
    )


def create_project(db: Session, user_id: str, payload: ProjectCreate) -> ProjectDetailResponse:
    owner = get_user_or_404(db, user_id)
    images = validate_project_urls([str(image) for image in payload.images])
    project = Project(
        user_id=owner.id,
        slug=unique_slug(db, payload.title),
        title=payload.title.strip(),
        description=payload.description.strip(),
        project_url=str(payload.project_url),
        github_url=str(payload.github_url) if payload.github_url else None,
        cover_image_url=images[0] if images else None,
        is_official=False,
    )
    project.tags = get_or_create_tags(db, payload.tags)
    project.images = [ProjectImage(image_url=image_url, sort_order=index + 1) for index, image_url in enumerate(images)]
    db.add(project)
    db.commit()
    db.refresh(project)
    return get_project_by_id(db, project.id)


def create_admin_project(db: Session, payload: AdminProjectCreate) -> ProjectDetailResponse:
    owner = get_user_or_404(db, payload.owner_user_id)
    images = validate_project_urls([str(image) for image in payload.images])
    project = Project(
        user_id=owner.id,
        slug=unique_slug(db, payload.title),
        title=payload.title.strip(),
        description=payload.description.strip(),
        project_url=str(payload.project_url),
        github_url=str(payload.github_url) if payload.github_url else None,
        cover_image_url=images[0] if images else None,
        is_official=payload.is_official,
    )
    project.tags = get_or_create_tags(db, payload.tags)
    project.images = [ProjectImage(image_url=image_url, sort_order=index + 1) for index, image_url in enumerate(images)]
    db.add(project)
    db.commit()
    db.refresh(project)
    return get_project_by_id(db, project.id)


def update_project(db: Session, user_id: str, project_id: str, payload: ProjectUpdate) -> ProjectDetailResponse:
    project = db.execute(
        select(Project)
        .options(joinedload(Project.tags), joinedload(Project.images), joinedload(Project.user))
        .where(Project.id == project_id)
    ).unique().scalar_one_or_none()
    if not project:
        raise not_found("项目不存在。")
    if project.user_id != user_id:
        raise forbidden("不能编辑别人的项目。")

    images = normalize_project_urls([str(image) for image in payload.images])
    project.slug = unique_slug(db, payload.title, current_project_id=project.id)
    project.title = payload.title.strip()
    project.description = payload.description.strip()
    project.project_url = str(payload.project_url)
    project.github_url = str(payload.github_url) if payload.github_url else None
    project.cover_image_url = images[0]
    project.tags = get_or_create_tags(db, payload.tags)
    project.images.clear()
    project.images.extend(
        [ProjectImage(image_url=image_url, sort_order=index + 1) for index, image_url in enumerate(images)]
    )
    db.add(project)
    db.commit()
    return get_project_by_id(db, project.id)


def delete_project(db: Session, user_id: str, project_id: str) -> None:
    project = db.get(Project, project_id)
    if not project:
        raise not_found("项目不存在。")
    if project.user_id != user_id:
        raise forbidden("不能删除别人的项目。")
    project.status = "deleted"
    db.add(project)
    db.commit()


def list_tags(db: Session) -> list[TagResponse]:
    tags = db.execute(select(Tag).order_by(Tag.name.asc())).scalars().all()
    return [map_tag(tag) for tag in tags]


def get_profile(db: Session, username: str) -> UserProfileResponse:
    user = db.execute(select(User).where(func.lower(User.username) == username.lower())).scalar_one_or_none()
    if not user:
        raise not_found("用户不存在。")
    return UserProfileResponse(**map_user(user).model_dump())


def update_profile(db: Session, user_id: str, payload: UserProfileUpdate) -> UserProfileResponse:
    user = get_user_or_404(db, user_id)
    username = payload.username.strip().lower()
    existing = db.execute(
        select(User.id).where(func.lower(User.username) == username, User.id != user.id)
    ).scalar_one_or_none()
    if existing:
        raise bad_request("用户名已被占用。", {"username": "用户名已被占用"})

    user.name = payload.name.strip()
    user.username = username
    user.avatar_url = str(payload.avatar_url) if payload.avatar_url else None
    user.bio = payload.bio.strip()
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserProfileResponse(**map_user(user).model_dump())


def list_comments_for_project(db: Session, project_id: str) -> list[CommentResponse]:
    project = db.execute(
        select(Project)
        .options(joinedload(Project.comments).joinedload(Comment.user))
        .where(Project.id == project_id)
    ).unique().scalar_one_or_none()
    if not project or project.status != "published":
        raise not_found("项目不存在。")
    comments = [comment for comment in project.comments if comment.status == "published"]
    return [map_comment(comment) for comment in comments]


def create_comment(db: Session, project_id: str, user_id: str, content: str) -> CommentResponse:
    project = db.get(Project, project_id)
    if not project or project.status != "published":
        raise not_found("项目不存在。")
    owner = get_user_or_404(db, user_id)
    cleaned = content.strip()
    if not cleaned:
        raise bad_request("评论不能为空。", {"content": "评论不能为空"})
    if len(cleaned) > MAX_COMMENT_LENGTH:
        raise bad_request("评论过长。", {"content": "评论不能超过 500 字"})
    comment = Comment(project_id=project_id, user_id=owner.id, content=cleaned)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    db.refresh(owner)
    comment.user = owner
    return map_comment(comment)


def delete_comment(db: Session, comment_id: str, user_id: str) -> None:
    comment = db.execute(select(Comment).options(joinedload(Comment.user)).where(Comment.id == comment_id)).scalar_one_or_none()
    if not comment:
        raise not_found("评论不存在。")
    actor = db.get(User, user_id)
    is_admin = bool(actor and actor.role == "admin")
    if comment.user_id != user_id and not is_admin:
        raise forbidden("不能删除别人的评论。")
    comment.status = "deleted"
    db.add(comment)
    db.commit()


def create_feedback(db: Session, payload: FeedbackCreate) -> FeedbackResponse:
    cleaned = payload.content.strip()
    if not cleaned:
        raise bad_request("反馈内容不能为空。", {"content": "反馈内容不能为空"})
    if len(cleaned) > MAX_FEEDBACK_LENGTH:
        raise bad_request("反馈内容过长。", {"content": "反馈不能超过 1000 字"})
    feedback = Feedback(content=cleaned)
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return map_feedback(feedback)


def get_admin_dashboard_stats(db: Session) -> AdminDashboardStatsResponse:
    return AdminDashboardStatsResponse(
        total_users=db.execute(select(func.count()).select_from(User)).scalar_one(),
        active_users=db.execute(select(func.count()).select_from(User).where(User.status == "active")).scalar_one(),
        banned_users=db.execute(select(func.count()).select_from(User).where(User.status == "banned")).scalar_one(),
        admin_users=db.execute(select(func.count()).select_from(User).where(User.role == "admin")).scalar_one(),
        total_projects=db.execute(select(func.count()).select_from(Project)).scalar_one(),
        published_projects=db.execute(
            select(func.count()).select_from(Project).where(Project.status == "published")
        ).scalar_one(),
        hidden_projects=db.execute(
            select(func.count()).select_from(Project).where(Project.status == "hidden")
        ).scalar_one(),
        deleted_projects=db.execute(
            select(func.count()).select_from(Project).where(Project.status == "deleted")
        ).scalar_one(),
        total_comments=db.execute(
            select(func.count()).select_from(Comment).where(Comment.status == "published")
        ).scalar_one(),
        pending_feedback=db.execute(
            select(func.count()).select_from(Feedback).where(Feedback.status.in_(["new", "reviewed"]))
        ).scalar_one(),
        resolved_feedback=db.execute(
            select(func.count()).select_from(Feedback).where(Feedback.status == "resolved")
        ).scalar_one(),
    )


def list_admin_users(
    db: Session,
    page: int,
    page_size: int,
    q: str | None = None,
    status: str | None = None,
) -> tuple[list[AdminUserListItem], int]:
    project_counts = (
        select(Project.user_id, func.count(Project.id).label("project_count"))
        .group_by(Project.user_id)
        .subquery()
    )
    comment_counts = (
        select(Comment.user_id, func.count(Comment.id).label("comment_count"))
        .where(Comment.status == "published")
        .group_by(Comment.user_id)
        .subquery()
    )
    query = (
        select(
            User,
            func.coalesce(project_counts.c.project_count, 0),
            func.coalesce(comment_counts.c.comment_count, 0),
        )
        .outerjoin(project_counts, project_counts.c.user_id == User.id)
        .outerjoin(comment_counts, comment_counts.c.user_id == User.id)
    )

    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                User.name.ilike(like),
                User.email.ilike(like),
                User.username.ilike(like),
            )
        )

    if status:
        query = query.where(User.status == status)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return (
        [
            AdminUserListItem(
                id=user.id,
                name=user.name,
                email=user.email,
                username=user.username,
                avatar_url=user.avatar_url or user.image,
                bio=user.bio,
                status=user.status,
                role=user.role,
                project_count=project_count,
                comment_count=comment_count,
                created_at=user.created_at,
            )
            for user, project_count, comment_count in rows
        ],
        total,
    )


def update_admin_user(db: Session, user_id: str, payload: AdminUserUpdate, acting_user_id: str) -> AdminUserListItem:
    if payload.status not in ADMIN_ALLOWED_USER_STATUSES:
        raise bad_request("不支持的用户状态。", {"status": "status 不合法"})

    user = db.get(User, user_id)
    if not user:
        raise not_found("用户不存在。")
    if acting_user_id == user_id and payload.status == "banned":
        raise bad_request("不能封禁当前管理员自己。", {"status": "不能封禁自己"})

    user.status = payload.status
    user.role = payload.role
    ensure_admin_role(user)
    db.add(user)
    db.commit()
    db.refresh(user)

    project_count = db.execute(select(func.count()).select_from(Project).where(Project.user_id == user.id)).scalar_one()
    comment_count = db.execute(
        select(func.count()).select_from(Comment).where(Comment.user_id == user.id, Comment.status == "published")
    ).scalar_one()
    return AdminUserListItem(
        id=user.id,
        name=user.name,
        email=user.email,
        username=user.username,
        avatar_url=user.avatar_url or user.image,
        bio=user.bio,
        status=user.status,
        role=user.role,
        project_count=project_count,
        comment_count=comment_count,
        created_at=user.created_at,
    )


def list_admin_projects(
    db: Session,
    page: int,
    page_size: int,
    q: str | None = None,
    status: str | None = None,
) -> tuple[list[AdminProjectListItem], int]:
    comment_counts = (
        select(Comment.project_id, func.count(Comment.id).label("comment_count"))
        .where(Comment.status == "published")
        .group_by(Comment.project_id)
        .subquery()
    )
    query = (
        select(Project, User, func.coalesce(comment_counts.c.comment_count, 0))
        .join(User, User.id == Project.user_id)
        .outerjoin(comment_counts, comment_counts.c.project_id == Project.id)
    )

    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                Project.title.ilike(like),
                Project.description.ilike(like),
                User.username.ilike(like),
            )
        )

    if status:
        query = query.where(Project.status == status)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(Project.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return (
        [
            AdminProjectListItem(
                id=project.id,
                slug=project.slug,
                title=project.title,
                status=project.status,
                is_official=project.is_official,
                project_url=project.project_url,
                github_url=project.github_url,
                cover_image_url=project.cover_image_url,
                view_count=project.view_count,
                comment_count=comment_count,
                created_at=project.created_at,
                updated_at=project.updated_at,
                author_id=user.id,
                author_name=user.name,
                author_username=user.username,
            )
            for project, user, comment_count in rows
        ],
        total,
    )


def update_admin_project(db: Session, project_id: str, payload: AdminProjectUpdate) -> AdminProjectListItem:
    if payload.status not in ADMIN_ALLOWED_PROJECT_STATUSES:
        raise bad_request("不支持的项目状态。", {"status": "status 不合法"})

    project = db.get(Project, project_id)
    if not project:
        raise not_found("项目不存在。")

    project.status = payload.status
    db.add(project)
    db.commit()

    row = db.execute(
        select(Project, User, func.count(Comment.id))
        .join(User, User.id == Project.user_id)
        .outerjoin(Comment, Comment.project_id == Project.id)
        .where(Project.id == project_id, or_(Comment.id.is_(None), Comment.status == "published"))
        .group_by(Project.id, User.id)
    ).one()
    refreshed_project, user, comment_count = row
    return AdminProjectListItem(
        id=refreshed_project.id,
        slug=refreshed_project.slug,
        title=refreshed_project.title,
        status=refreshed_project.status,
        is_official=refreshed_project.is_official,
        project_url=refreshed_project.project_url,
        github_url=refreshed_project.github_url,
        cover_image_url=refreshed_project.cover_image_url,
        view_count=refreshed_project.view_count,
        comment_count=comment_count,
        created_at=refreshed_project.created_at,
        updated_at=refreshed_project.updated_at,
        author_id=user.id,
        author_name=user.name,
        author_username=user.username,
    )


def list_admin_comments(
    db: Session,
    page: int,
    page_size: int,
    q: str | None = None,
) -> tuple[list[AdminCommentListItem], int]:
    query = select(Comment, Project, User).join(Project, Project.id == Comment.project_id).join(User, User.id == Comment.user_id)

    if q:
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                Comment.content.ilike(like),
                Project.title.ilike(like),
                User.username.ilike(like),
            )
        )

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    rows = db.execute(
        query.order_by(Comment.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    return (
        [
            AdminCommentListItem(
                id=comment.id,
                content=comment.content,
                status=comment.status,
                created_at=comment.created_at,
                project_id=project.id,
                project_title=project.title,
                author_id=user.id,
                author_name=user.name,
                author_username=user.username,
            )
            for comment, project, user in rows
        ],
        total,
    )


def admin_delete_comment(db: Session, comment_id: str) -> None:
    comment = db.get(Comment, comment_id)
    if not comment:
        raise not_found("评论不存在。")
    comment.status = "deleted"
    db.add(comment)
    db.commit()


def list_admin_feedback(
    db: Session,
    page: int,
    page_size: int,
    status: str | None = None,
) -> tuple[list[AdminFeedbackListItem], int]:
    query = select(Feedback)
    if status:
        query = query.where(Feedback.status == status)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar_one()
    items = db.execute(
        query.order_by(Feedback.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()

    return (
        [
            AdminFeedbackListItem(
                id=item.id,
                content=item.content,
                status=item.status,
                created_at=item.created_at,
            )
            for item in items
        ],
        total,
    )


def update_admin_feedback(db: Session, feedback_id: str, payload: AdminFeedbackUpdate) -> AdminFeedbackListItem:
    if payload.status not in ADMIN_ALLOWED_FEEDBACK_STATUSES:
        raise bad_request("不支持的反馈状态。", {"status": "status 不合法"})

    feedback = db.get(Feedback, feedback_id)
    if not feedback:
        raise not_found("反馈不存在。")
    feedback.status = payload.status
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return AdminFeedbackListItem(
        id=feedback.id,
        content=feedback.content,
        status=feedback.status,
        created_at=feedback.created_at,
    )


def attach_project_image(
    db: Session,
    project_id: str,
    user_id: str,
    file_name: str,
    content_type: str,
    body: bytes,
) -> ProjectImageUploadResponse:
    if content_type not in IMAGE_CONTENT_TYPES:
        raise bad_request("只允许上传图片文件。", {"content_type": "图片格式不支持"})
    project = db.execute(
        select(Project).options(joinedload(Project.images)).where(Project.id == project_id)
    ).unique().scalar_one_or_none()
    if not project:
        raise not_found("项目不存在。")
    if project.user_id != user_id:
        raise forbidden("不能上传到别人的项目。")
    if len(project.images) >= MAX_PROJECT_IMAGES:
        raise bad_request("最多上传 3 张图片。", {"images": "最多上传 3 张图片"})

    settings = get_settings()
    ext = CONTENT_TYPE_EXTENSIONS[content_type]
    image_id = str(uuid.uuid4())
    object_key = f"projects/{project_id}/{image_id}.{ext}"
    image_url = _upload_to_cos(
        object_key=object_key,
        content_type=content_type,
        body=body,
        settings=settings,
    )
    next_sort_order = len(project.images) + 1
    image = ProjectImage(project_id=project.id, image_url=image_url, sort_order=next_sort_order)
    project.images.append(image)
    project.cover_image_url = project.images[0].image_url if project.images else image_url
    db.add(project)
    db.commit()
    db.refresh(image)
    return ProjectImageUploadResponse(image_url=image.image_url, image_id=image.id, sort_order=image.sort_order)


def _upload_to_cos(object_key: str, content_type: str, body: bytes, settings) -> str:
    config = CosConfig(
        Region=settings.cos_region,
        SecretId=settings.cos_secret_id,
        SecretKey=settings.cos_secret_key,
    )
    client = CosS3Client(config)
    try:
        client.put_object(
            Bucket=settings.cos_bucket,
            Key=f"/{object_key}",
            Body=body,
            ContentType=content_type,
        )
    except CosServiceError as exc:
        message = exc.get_error_msg() or "图片上传到 COS 失败"
        code = exc.get_error_code() or "COS_ERROR"
        raise bad_request(f"COS 上传失败：{code} - {message}", {"image": f"{code}: {message}"}) from exc
    except Exception as exc:  # noqa: BLE001
        raise bad_request("图片上传到 COS 失败。", {"image": "图片上传到 COS 失败"}) from exc

    return f"{settings.cos_public_base_url.rstrip('/')}/{object_key}"
