from dataclasses import dataclass

from fastapi import Cookie, Depends, Header
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.errors import unauthorized
from app.models.auth import Session
from app.models.user import User

@dataclass
class AuthenticatedUser:
    user_id: str
    email: str | None
    user: User | None = None

    @property
    def is_admin(self) -> bool:
        if self.user:
            return self.user.role == "admin"
        return get_settings().is_admin_email(self.email)


def verify_internal_user(
    makerhub_session: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
    db: DbSession = Depends(get_db),
) -> AuthenticatedUser:
    session_token = _resolve_session_token(makerhub_session, authorization)
    if not session_token:
        raise unauthorized("请先登录。")

    session = db.query(Session).filter(Session.session_token == session_token).first()
    if not session:
        raise unauthorized("登录会话不存在。")
    user = db.get(User, session.user_id)
    if not user:
        raise unauthorized("用户不存在。")
    if user.status != "active":
        raise unauthorized("账号已被禁用。")
    return AuthenticatedUser(user_id=user.id, email=user.email, user=user)


def require_admin_user(current_user: AuthenticatedUser = Depends(verify_internal_user)) -> AuthenticatedUser:
    if not current_user.is_admin:
        from app.core.errors import forbidden

        raise forbidden("当前账号没有管理后台权限。")
    return current_user


def get_session_user(
    makerhub_session: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
    db: DbSession = Depends(get_db),
) -> AuthenticatedUser | None:
    session_token = _resolve_session_token(makerhub_session, authorization)
    if not session_token:
        return None

    session = db.query(Session).filter(Session.session_token == session_token).first()
    if not session:
        return None
    user = db.get(User, session.user_id)
    if not user:
        return None
    if user.status != "active":
        return None
    return AuthenticatedUser(user_id=user.id, email=user.email, user=user)


def _resolve_session_token(
    makerhub_session: str | None,
    authorization: str | None,
) -> str | None:
    if makerhub_session:
        return makerhub_session
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()
