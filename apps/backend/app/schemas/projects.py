import datetime as dt

from pydantic import Field, HttpUrl, field_validator

from app.schemas.comments import CommentResponse
from app.schemas.common import APIModel
from app.schemas.tags import TagResponse
from app.schemas.users import UserSummary


class ProjectBase(APIModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=5000)
    project_url: HttpUrl = Field(alias="projectUrl")
    github_url: HttpUrl | None = Field(default=None, alias="githubUrl")
    tags: list[str] = Field(min_length=1, max_length=8)
    images: list[HttpUrl] = Field(min_length=0, max_length=3, default_factory=list)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen = set()
        for item in value:
            cleaned = item.strip()
            if not cleaned:
                continue
            key = cleaned.casefold()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(cleaned[:24])

        if not normalized:
            raise ValueError("至少保留一个有效标签")

        return normalized


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(ProjectBase):
    pass


class AdminProjectCreate(ProjectBase):
    owner_user_id: str = Field(alias="ownerUserId")
    is_official: bool = Field(default=False, alias="isOfficial")


class ProjectImageResponse(APIModel):
    id: str
    image_url: str
    sort_order: int


class ProjectCardResponse(APIModel):
    id: str
    slug: str
    title: str
    description: str
    project_url: str
    github_url: str | None = None
    cover_image_url: str | None
    is_official: bool = False
    view_count: int
    upvote_count: int
    downvote_count: int
    current_reaction: str | None = None
    created_at: dt.datetime
    author: UserSummary
    tags: list[TagResponse]
    comment_count: int


class ProjectDetailResponse(ProjectCardResponse):
    images: list[ProjectImageResponse]
    comments: list[CommentResponse]


class ProjectViewCountResponse(APIModel):
    project_id: str
    view_count: int


class ProjectReactionRequest(APIModel):
    reaction: str


class ProjectReactionResponse(APIModel):
    project_id: str
    upvote_count: int
    downvote_count: int
    current_reaction: str | None = None
