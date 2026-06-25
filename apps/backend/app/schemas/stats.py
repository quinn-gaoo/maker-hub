from app.schemas.common import APIModel
from app.schemas.users import UserSummary


class HomeStatsResponse(APIModel):
    creator_count: int
    project_count: int
    comment_count: int
    recent_users: list[UserSummary]
