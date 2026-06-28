from pydantic import Field

from app.schemas.common import APIModel


class ProjectImageUploadResponse(APIModel):
    image_url: str
    image_id: str
    sort_order: int


class UploadedImageResponse(APIModel):
    image_url: str


class UserAvatarUploadResponse(APIModel):
    avatar_url: str = Field(alias="avatarUrl")
