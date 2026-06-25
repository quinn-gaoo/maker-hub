from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import AuthenticatedUser, get_session_user, require_admin_user, verify_internal_user
from app.schemas.common import PaginatedResponse
from app.schemas.projects import (
    AdminProjectCreate,
    ProjectCardResponse,
    ProjectCreate,
    ProjectDetailResponse,
    ProjectReactionRequest,
    ProjectReactionResponse,
    ProjectUpdate,
    ProjectViewCountResponse,
)
from app.services import (
    create_admin_project,
    create_project,
    delete_project,
    get_manageable_project,
    get_project_by_id,
    increment_project_view_count,
    list_projects,
    react_to_project,
    update_project,
)

router = APIRouter(prefix="/projects")


@router.get("/manage/{project_id}", response_model=ProjectDetailResponse)
def get_manage_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(verify_internal_user),
):
    return get_manageable_project(db, project_id, current_user.user_id)


@router.get("", response_model=PaginatedResponse[ProjectCardResponse])
def get_projects(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    tag: str | None = None,
    user: str | None = None,
    q: str | None = None,
    official: bool | None = Query(default=None),
    sort: str = Query(default="latest", pattern="^(latest|top|discussed)$"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser | None = Depends(get_session_user),
):
    items, total = list_projects(
        db,
        page=page,
        page_size=page_size,
        tag=tag,
        user=user,
        q=q,
        official=official,
        sort=sort,
        current_user_id=current_user.user_id if current_user else None,
    )
    return PaginatedResponse(items=items, page=page, page_size=page_size, total=total)


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser | None = Depends(get_session_user),
):
    return get_project_by_id(db, project_id, current_user.user_id if current_user else None)


@router.post("/{project_id}/views", response_model=ProjectViewCountResponse)
def post_project_view(project_id: str, db: Session = Depends(get_db)):
    return increment_project_view_count(db, project_id)


@router.post("/{project_id}/reactions", response_model=ProjectReactionResponse)
def post_project_reaction(
    project_id: str,
    payload: ProjectReactionRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser | None = Depends(get_session_user),
):
    if not current_user:
        from app.core.errors import unauthorized

        raise unauthorized("登录后才能点赞或点踩。")
    return react_to_project(db, project_id, current_user.user_id, payload.reaction)


@router.post("", response_model=ProjectDetailResponse, status_code=status.HTTP_201_CREATED)
def post_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(verify_internal_user),
):
    return create_project(db, current_user.user_id, payload)


@router.post("/admin/create", response_model=ProjectDetailResponse, status_code=status.HTTP_201_CREATED)
def post_admin_project(
    payload: AdminProjectCreate,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    return create_admin_project(db, payload)


@router.patch("/{project_id}", response_model=ProjectDetailResponse)
def patch_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(verify_internal_user),
):
    return update_project(db, current_user.user_id, project_id, payload)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(verify_internal_user),
):
    delete_project(db, current_user.user_id, project_id)
