from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services import create_feedback

router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def post_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    return create_feedback(db, payload)
