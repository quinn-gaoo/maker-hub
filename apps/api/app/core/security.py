import hashlib
import hmac
import time
from dataclasses import dataclass

from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.orm import Session as DbSession

from app.api.deps import get_db
from app.core.config import get_settings
from app.core.errors import unauthorized
from app.models.auth import Session
from app.models.user import User

SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000


@dataclass
class AuthenticatedUser:
    user_id: str
    email: str | None
    user: User | None = None


async def verify_internal_user(
    request: Request,
    x_user_id: str | None = Header(default=None),
    x_user_email: str | None = Header(default=None),
    x_timestamp: str | None = Header(default=None),
    x_signature: str | None = Header(default=None),
) -> AuthenticatedUser:
    if not x_user_id or not x_timestamp or not x_signature:
        raise unauthorized("缺少内部鉴权头。")

    try:
        timestamp = int(x_timestamp)
    except ValueError as exc:
        raise unauthorized("时间戳不合法。") from exc

    if abs(int(time.time() * 1000) - timestamp) > SIGNATURE_MAX_AGE_MS:
        raise unauthorized("签名已过期。")

    body = (await request.body()).decode("utf-8")
    payload = f"{x_user_id}:{x_user_email or ''}:{x_timestamp}:{body}"
    expected = hmac.new(
        get_settings().internal_api_signing_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, x_signature):
        raise unauthorized("签名校验失败。")

    return AuthenticatedUser(user_id=x_user_id, email=x_user_email or None)


def get_session_user(
    makerhub_session: str | None = Cookie(default=None),
    db: DbSession = Depends(get_db),
) -> AuthenticatedUser | None:
    if not makerhub_session:
        return None

    session = db.query(Session).filter(Session.session_token == makerhub_session).first()
    if not session:
        return None
    user = db.get(User, session.user_id)
    if not user:
        return None
    return AuthenticatedUser(user_id=user.id, email=user.email, user=user)
