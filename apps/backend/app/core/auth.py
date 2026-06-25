from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Response

from app.core.config import get_settings

SESSION_COOKIE_NAME = "makerhub_session"
SESSION_TTL_DAYS = 30
PASSWORD_HASH_ITERATIONS = 600_000


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
