from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from fastapi import Response

from app.core.config import get_settings
from app.core.errors import bad_request, unauthorized
from app.schemas.auth import OAuthCallbackState

SESSION_COOKIE_NAME = "makerhub_session"
STATE_TTL_MINUTES = 10
SESSION_TTL_DAYS = 30
PASSWORD_HASH_ITERATIONS = 600_000


def _sign_value(value: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def encode_state(payload: OAuthCallbackState) -> str:
    settings = get_settings()
    raw = json.dumps(payload.model_dump(mode="json"), separators=(",", ":"))
    signature = _sign_value(raw, settings.auth_session_secret)
    token = json.dumps({"payload": raw, "signature": signature}, separators=(",", ":"))
    return base64.urlsafe_b64encode(token.encode("utf-8")).decode("utf-8")


def decode_state(value: str) -> OAuthCallbackState:
    settings = get_settings()
    try:
      token = base64.urlsafe_b64decode(value.encode("utf-8")).decode("utf-8")
      parsed = json.loads(token)
      raw = parsed["payload"]
      signature = parsed["signature"]
    except Exception as exc:  # noqa: BLE001
      raise bad_request("OAuth state 不合法。") from exc

    expected = _sign_value(raw, settings.auth_session_secret)
    if not hmac.compare_digest(signature, expected):
      raise unauthorized("OAuth state 校验失败。")

    payload = OAuthCallbackState.model_validate_json(raw)
    if payload.created_at < datetime.now(UTC) - timedelta(minutes=STATE_TTL_MINUTES):
      raise unauthorized("OAuth state 已过期。")

    return payload


def generate_code_verifier() -> str:
    return secrets.token_urlsafe(64)


def generate_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def create_session_token() -> str:
    return secrets.token_urlsafe(48)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    return "$".join(
        [
            "pbkdf2_sha256",
            str(PASSWORD_HASH_ITERATIONS),
            base64.urlsafe_b64encode(salt).decode("utf-8"),
            base64.urlsafe_b64encode(derived).decode("utf-8"),
        ]
    )


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        algorithm, iterations, salt_value, digest_value = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode("utf-8") + b"=" * (-len(salt_value) % 4))
        expected = base64.urlsafe_b64decode(digest_value.encode("utf-8") + b"=" * (-len(digest_value) % 4))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    except Exception:  # noqa: BLE001
        return False
    return hmac.compare_digest(actual, expected)


def session_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(days=SESSION_TTL_DAYS)


def set_session_cookie(response: Response, session_token: str, expires: datetime) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
        expires=expires,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")


def build_callback_url(provider: str) -> str:
    settings = get_settings()
    if provider == "google" and settings.auth_google_redirect_uri:
        return settings.auth_google_redirect_uri
    if provider == "github" and settings.auth_github_redirect_uri:
        return settings.auth_github_redirect_uri
    return f"{settings.auth_base_url.rstrip('/')}/api/v1/auth/{provider}/callback"


def build_frontend_callback_url(callback_url: str | None = None) -> str:
    settings = get_settings()
    return callback_url or settings.auth_frontend_url.rstrip("/") + "/"


def build_google_authorization_url(state: str, code_challenge: str, redirect_uri: str | None = None) -> str:
    settings = get_settings()
    if not settings.auth_google_id:
        raise bad_request("Google 登录暂未配置。")
    params = {
        "client_id": settings.auth_google_id,
        "redirect_uri": redirect_uri or build_callback_url("google"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent",
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)


def build_github_authorization_url(state: str, code_challenge: str, redirect_uri: str | None = None) -> str:
    settings = get_settings()
    if not settings.auth_github_id:
        raise bad_request("GitHub 登录暂未配置。")
    params = {
        "client_id": settings.auth_github_id,
        "redirect_uri": redirect_uri or build_callback_url("github"),
        "response_type": "code",
        "scope": "read:user user:email",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return "https://github.com/login/oauth/authorize?" + urlencode(params)
