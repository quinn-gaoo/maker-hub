import datetime as dt

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    email_verified: Mapped[DateTime | None] = mapped_column("emailVerified", DateTime(timezone=True), nullable=True)
    image: Mapped[str | None] = mapped_column(Text(), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(Text(), nullable=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)
    avatar_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    bio: Mapped[str] = mapped_column(Text(), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="user", nullable=False, server_default="user")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    project_reactions = relationship("ProjectReaction", back_populates="user", cascade="all, delete-orphan")
