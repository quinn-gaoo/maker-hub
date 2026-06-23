from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(Text(), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column("userId", ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(255), primary_key=True)
    provider_account_id: Mapped[str] = mapped_column("providerAccountId", String(255), primary_key=True)
    refresh_token: Mapped[str | None] = mapped_column(Text(), nullable=True)
    access_token: Mapped[str | None] = mapped_column(Text(), nullable=True)
    expires_at: Mapped[int | None] = mapped_column(nullable=True)
    token_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scope: Mapped[str | None] = mapped_column(String(255), nullable=True)
    id_token: Mapped[str | None] = mapped_column(Text(), nullable=True)
    session_state: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user = relationship("User", back_populates="accounts")


class Session(Base):
    __tablename__ = "sessions"

    session_token: Mapped[str] = mapped_column("sessionToken", String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column("userId", ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="sessions")


class VerificationToken(Base):
    __tablename__ = "verification_token"

    identifier: Mapped[str] = mapped_column(String(255), primary_key=True)
    token: Mapped[str] = mapped_column(String(255), primary_key=True)
    expires: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
