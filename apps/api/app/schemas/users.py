from pydantic import Field, HttpUrl, field_validator

from app.schemas.common import APIModel


class UserSummary(APIModel):
    id: str
    name: str | None
    username: str | None
    avatar_url: str | None
    bio: str | None


class UserProfileResponse(UserSummary):
    pass


class UserProfileUpdate(APIModel):
    name: str = Field(min_length=1, max_length=80)
    username: str = Field(min_length=2, max_length=32, pattern=r"^[a-zA-Z0-9_-]+$")
    avatar_url: HttpUrl | None = Field(default=None, alias="avatarUrl")
    bio: str = Field(default="", max_length=500)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()
