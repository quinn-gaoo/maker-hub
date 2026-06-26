from __future__ import annotations

import datetime as dt
import uuid
from pathlib import Path
import sys

from sqlalchemy import delete, select

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import get_session_local
from app.models.comment import Comment
from app.models.project import Project, ProjectImage
from app.models.project_reaction import ProjectReaction
from app.models.tag import Tag
from app.models.user import User
from app.services import REACTION_DOWNVOTE, REACTION_UPVOTE, slugify

SEED_PREFIX = "seed-demo"
USER_COUNT = 14
PROJECT_COUNT = 36

PROJECT_NAMES = [
    "PromptPilot",
    "CanvasForge",
    "OpsBoard",
    "FlowGarden",
    "TinyAgent",
    "ClipStudio",
    "InsightDock",
    "MuseKit",
    "VectorNest",
    "DataLantern",
    "BuildRoom",
    "EchoPage",
]
PROJECT_TYPES = ["AI 工作流", "创作工具", "开发效率", "数据看板", "内容生成", "自动化助手"]
TAG_NAMES = ["AI Tool", "Prompt", "Design", "NoCode", "Agent", "Productivity", "Data", "Creator"]
COMMENTS = [
    "这个交互很顺，适合继续打磨成完整产品。",
    "建议补一个真实案例，会更容易让人理解价值。",
    "视觉风格很清楚，第一屏就能看懂。",
    "如果支持导出或者分享链接，我会更愿意持续使用。",
    "这个方向挺有意思，期待看到下一版。",
    "信息架构可以再收紧一点，核心卖点已经很明确了。",
]


def seeded_user_id(index: int) -> str:
    return f"{SEED_PREFIX}-user-{index:02d}"


def seeded_project_id(index: int) -> str:
    return f"{SEED_PREFIX}-project-{index:02d}"


def reset_seed_data(db) -> None:
    project_ids = [seeded_project_id(index) for index in range(1, PROJECT_COUNT + 1)]
    user_ids = [seeded_user_id(index) for index in range(1, USER_COUNT + 1)]

    db.execute(delete(ProjectReaction).where(ProjectReaction.project_id.in_(project_ids)))
    db.execute(delete(Comment).where(Comment.project_id.in_(project_ids)))
    db.execute(delete(ProjectImage).where(ProjectImage.project_id.in_(project_ids)))
    db.execute(delete(Project).where(Project.id.in_(project_ids)))
    db.execute(delete(User).where(User.id.in_(user_ids)))


def get_or_create_seed_tags(db) -> dict[str, Tag]:
    tags: dict[str, Tag] = {}
    for name in TAG_NAMES:
        slug = slugify(name)
        tag = db.execute(select(Tag).where(Tag.slug == slug)).scalar_one_or_none()
        if tag is None:
            tag = Tag(id=str(uuid.uuid4()), name=name, slug=slug)
            db.add(tag)
        tags[name] = tag
    return tags


def create_users(db) -> list[User]:
    users: list[User] = []
    now = dt.datetime.now(dt.UTC)
    for index in range(1, USER_COUNT + 1):
        user = User(
            id=seeded_user_id(index),
            name=f"Seed Creator {index:02d}",
            email=f"seed.creator.{index:02d}@makerhub.test",
            username=f"seedcreator{index:02d}",
            image=f"https://api.dicebear.com/9.x/initials/svg?seed=Seed%20Creator%20{index:02d}",
            avatar_url=f"https://api.dicebear.com/9.x/initials/svg?seed=Seed%20Creator%20{index:02d}",
            bio=f"用于测试分页和排序的第 {index:02d} 位创作者。",
            status="active",
            created_at=now - dt.timedelta(days=USER_COUNT - index),
        )
        db.add(user)
        users.append(user)
    return users


def create_projects(db, users: list[User], tags: dict[str, Tag]) -> list[Project]:
    projects: list[Project] = []
    now = dt.datetime.now(dt.UTC)
    tag_values = list(tags.values())

    for index in range(1, PROJECT_COUNT + 1):
        author = users[(index - 1) % 6]
        title = f"{PROJECT_NAMES[(index - 1) % len(PROJECT_NAMES)]} {index:02d}"
        created_at = now - dt.timedelta(hours=index * 5)
        project = Project(
            id=seeded_project_id(index),
            user_id=author.id,
            slug=f"{SEED_PREFIX}-project-{index:02d}",
            title=title,
            description=(
                f"{title} 是一条测试数据，用来验证首页分页、最新排序、高赞排序和热议排序。"
                f"它属于{PROJECT_TYPES[index % len(PROJECT_TYPES)]}方向。"
            ),
            project_url=f"https://makerhub.test/projects/{index:02d}",
            github_url=f"https://github.com/makerhub-demo/{slugify(title)}",
            cover_image_url=f"https://picsum.photos/seed/makerhub-{index:02d}/1200/720",
            view_count=(index * 137) % 2400 + 12,
            status="published",
            created_at=created_at,
            updated_at=created_at,
        )
        project.tags = [
            tag_values[(index - 1) % len(tag_values)],
            tag_values[(index + 2) % len(tag_values)],
        ]
        project.images = [
            ProjectImage(
                image_url=f"https://picsum.photos/seed/makerhub-{index:02d}-{image_index}/1200/720",
                sort_order=image_index,
            )
            for image_index in range(1, 4)
        ]
        db.add(project)
        projects.append(project)

    return projects


def create_activity(db, projects: list[Project], users: list[User]) -> None:
    now = dt.datetime.now(dt.UTC)
    for index, project in enumerate(projects, start=1):
        upvote_count = (PROJECT_COUNT - index + 3) % USER_COUNT
        downvote_count = 1 if index % 7 == 0 else 0
        comment_count = (index * 3) % 11

        reaction_users = [user for user in users if user.id != project.user_id]
        for reaction_index, user in enumerate(reaction_users[:upvote_count], start=1):
            db.add(
                ProjectReaction(
                    project_id=project.id,
                    user_id=user.id,
                    reaction=REACTION_UPVOTE,
                    created_at=now - dt.timedelta(minutes=index * reaction_index),
                    updated_at=now - dt.timedelta(minutes=index * reaction_index),
                )
            )

        for user in reaction_users[upvote_count : upvote_count + downvote_count]:
            db.add(
                ProjectReaction(
                    project_id=project.id,
                    user_id=user.id,
                    reaction=REACTION_DOWNVOTE,
                    created_at=now - dt.timedelta(minutes=index),
                    updated_at=now - dt.timedelta(minutes=index),
                )
            )

        for comment_index in range(comment_count):
            user = reaction_users[(comment_index + index) % len(reaction_users)]
            db.add(
                Comment(
                    project_id=project.id,
                    user_id=user.id,
                    content=f"{COMMENTS[comment_index % len(COMMENTS)]} #{index:02d}-{comment_index + 1}",
                    status="published",
                    created_at=now - dt.timedelta(hours=index, minutes=comment_index * 7),
                )
            )


def main() -> None:
    with get_session_local()() as db:
        reset_seed_data(db)
        tags = get_or_create_seed_tags(db)
        users = create_users(db)
        projects = create_projects(db, users, tags)
        db.flush()
        create_activity(db, projects, users)
        db.commit()

    print(f"Seeded {USER_COUNT} users and {PROJECT_COUNT} projects for pagination/sorting tests.")
    print("Generated sort spread: latest uses created_at, top uses upvotes, discussed uses comments.")


if __name__ == "__main__":
    main()
