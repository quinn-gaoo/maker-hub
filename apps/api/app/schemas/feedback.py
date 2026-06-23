import datetime as dt

from pydantic import Field

from app.schemas.common import APIModel


class FeedbackCreate(APIModel):
    content: str = Field(min_length=1, max_length=1000)


class FeedbackResponse(APIModel):
    id: str
    content: str
    status: str
    created_at: dt.datetime
