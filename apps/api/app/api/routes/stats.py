from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.stats import HomeStatsResponse
from app.services import get_home_stats

router = APIRouter(prefix="/stats")


@router.get("/home", response_model=HomeStatsResponse)
def get_homepage_stats(db: Session = Depends(get_db)):
    return get_home_stats(db)
