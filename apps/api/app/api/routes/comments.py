from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import AuthenticatedUser, verify_internal_user
from app.schemas.comments import CommentCreate, CommentResponse
from app.services import create_comment, delete_comment, list_comments_for_project

router = APIRouter()


@router.get("/projects/{project_id}/comments", response_model=list[CommentResponse])
def get_project_comments(project_id: str, db: Session = Depends(get_db)):
    return list_comments_for_project(db, project_id)


@router.post("/projects/{project_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def post_project_comment(
    project_id: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(verify_internal_user),
):
    return create_comment(db, project_id, current_user.user_id, payload.content)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(verify_internal_user),
):
    delete_comment(db, comment_id, current_user.user_id)

