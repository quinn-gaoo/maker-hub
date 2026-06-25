import datetime as dt

from pydantic import Field

from app.schemas.common import APIModel


class AdminUserListItem(APIModel):
    id: str
    name: str | None
    email: str | None
    username: str | None
    avatar_url: str | None
    bio: str | None
    status: str
    role: str
    project_count: int
    comment_count: int
    created_at: dt.datetime


class AdminProjectListItem(APIModel):
    id: str
    slug: str
    title: str
    status: str
    is_official: bool = False
    project_url: str
    github_url: str | None
    cover_image_url: str | None
    view_count: int
    comment_count: int
    created_at: dt.datetime
    updated_at: dt.datetime
    author_id: str
    author_name: str | None
    author_username: str | None


class AdminCommentListItem(APIModel):
    id: str
    content: str
    status: str
    created_at: dt.datetime
    project_id: str
    project_title: str
    author_id: str
    author_name: str | None
    author_username: str | None


class AdminFeedbackListItem(APIModel):
    id: str
    content: str
    status: str
    created_at: dt.datetime


class AdminDashboardStatsResponse(APIModel):
    total_users: int
    active_users: int
    banned_users: int
    admin_users: int
    total_projects: int
    published_projects: int
    hidden_projects: int
    deleted_projects: int
    total_comments: int
    pending_feedback: int
    resolved_feedback: int


class AdminUserUpdate(APIModel):
    status: str = Field(pattern="^(active|banned)$")
    role: str = Field(pattern="^(user|admin)$")


class AdminProjectUpdate(APIModel):
    status: str = Field(pattern="^(published|hidden|deleted)$")


class AdminFeedbackUpdate(APIModel):
    status: str = Field(pattern="^(new|reviewed|resolved)$")
