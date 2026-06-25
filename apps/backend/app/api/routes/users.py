from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import AuthenticatedUser, get_session_user, verify_internal_user
from app.schemas.common import PaginatedResponse
from app.schemas.projects import ProjectCardResponse
from app.schemas.users import UserProfileResponse, UserProfileUpdate
from app.services import get_profile, list_projects, update_profile

router = APIRouter(prefix="/users")


@router.patch("/me", response_model=UserProfileResponse)
def patch_my_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(verify_internal_user),
):
    return update_profile(db, current_user.user_id, payload)


@router.get("/{username}", response_model=UserProfileResponse)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    return get_profile(db, username)


@router.get("/{username}/projects", response_model=PaginatedResponse[ProjectCardResponse])
def get_user_projects(
    username: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser | None = Depends(get_session_user),
):
    items, total = list_projects(
        db,
        page=page,
        page_size=page_size,
        user=username,
        current_user_id=current_user.user_id if current_user else None,
    )
    return PaginatedResponse(items=items, page=page, page_size=page_size, total=total)
