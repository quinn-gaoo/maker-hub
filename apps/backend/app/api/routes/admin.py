from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import AuthenticatedUser, require_admin_user
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
from app.schemas.common import PaginatedResponse
from app.services import (
    admin_delete_comment,
    get_admin_dashboard_stats,
    list_admin_comments,
    list_admin_feedback,
    list_admin_projects,
    list_admin_users,
    update_admin_feedback,
    update_admin_project,
    update_admin_user,
)

router = APIRouter(prefix="/admin")


@router.get("/dashboard", response_model=AdminDashboardStatsResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    return get_admin_dashboard_stats(db)


@router.get("/users", response_model=PaginatedResponse[AdminUserListItem])
def get_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = None,
    status: str | None = Query(default=None, pattern="^(active|banned)$"),
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    items, total = list_admin_users(db, page=page, page_size=page_size, q=q, status=status)
    return PaginatedResponse(items=items, page=page, page_size=page_size, total=total)


@router.patch("/users/{user_id}", response_model=AdminUserListItem)
def patch_user(
    user_id: str,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_user),
):
    return update_admin_user(db, user_id, payload, current_user.user_id)


@router.get("/projects", response_model=PaginatedResponse[AdminProjectListItem])
def get_projects(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = None,
    status: str | None = Query(default=None, pattern="^(published|hidden|deleted)$"),
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    items, total = list_admin_projects(db, page=page, page_size=page_size, q=q, status=status)
    return PaginatedResponse(items=items, page=page, page_size=page_size, total=total)


@router.patch("/projects/{project_id}", response_model=AdminProjectListItem)
def patch_project(
    project_id: str,
    payload: AdminProjectUpdate,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    return update_admin_project(db, project_id, payload)


@router.get("/comments", response_model=PaginatedResponse[AdminCommentListItem])
def get_comments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = None,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    items, total = list_admin_comments(db, page=page, page_size=page_size, q=q)
    return PaginatedResponse(items=items, page=page, page_size=page_size, total=total)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    admin_delete_comment(db, comment_id)


@router.get("/feedback", response_model=PaginatedResponse[AdminFeedbackListItem])
def get_feedback(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None, pattern="^(new|reviewed|resolved)$"),
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    items, total = list_admin_feedback(db, page=page, page_size=page_size, status=status)
    return PaginatedResponse(items=items, page=page, page_size=page_size, total=total)


@router.patch("/feedback/{feedback_id}", response_model=AdminFeedbackListItem)
def patch_feedback(
    feedback_id: str,
    payload: AdminFeedbackUpdate,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_admin_user),
):
    return update_admin_feedback(db, feedback_id, payload)
