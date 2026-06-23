import datetime as dt

from pydantic import Field

from app.schemas.common import APIModel
from app.schemas.users import UserSummary


class CommentCreate(APIModel):
    content: str = Field(min_length=1, max_length=500)


class CommentResponse(APIModel):
    id: str
    content: str
    created_at: dt.datetime
    author: UserSummary
