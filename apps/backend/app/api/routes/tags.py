from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.tags import TagResponse
from app.services import list_tags

router = APIRouter(prefix="/tags")


@router.get("", response_model=list[TagResponse])
def get_tags(db: Session = Depends(get_db)):
    return list_tags(db)

