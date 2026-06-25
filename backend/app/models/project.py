import datetime as dt
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text(), nullable=False)
    project_url: Mapped[str] = mapped_column(Text(), nullable=False)
    github_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    is_official: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=False, server_default="false")
    view_count: Mapped[int] = mapped_column(Integer(), nullable=False, default=0, server_default="0")
    status: Mapped[str] = mapped_column(String(32), default="published", nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="projects")
    images = relationship(
        "ProjectImage",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectImage.sort_order",
    )
    tags = relationship("Tag", secondary="project_tags", back_populates="projects")
    comments = relationship("Comment", back_populates="project", cascade="all, delete-orphan")
    reactions = relationship("ProjectReaction", back_populates="project", cascade="all, delete-orphan")


class ProjectImage(Base):
    __tablename__ = "project_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    image_url: Mapped[str] = mapped_column(Text(), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer(), nullable=False)

    project = relationship("Project", back_populates="images")
