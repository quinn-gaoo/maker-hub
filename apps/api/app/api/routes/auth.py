from __future__ import annotations

from datetime import UTC, datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import (
    build_frontend_callback_url,
    build_callback_url,
    build_github_authorization_url,
    build_google_authorization_url,
    clear_session_cookie,
    create_session_token,
    decode_state,
    encode_state,
    generate_code_challenge,
    generate_code_verifier,
    hash_password,
    normalize_email,
    session_expiry,
    set_session_cookie,
    verify_password,
)
from app.core.config import get_settings
from app.core.errors import bad_request, unauthorized
from app.core.security import AuthenticatedUser, get_session_user
from app.models.auth import Account, Session as AuthSession
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    AuthSessionUser,
    EmailLoginRequest,
    EmailRegisterRequest,
    OAuthCallbackState,
    OAuthProviderStatus,
    OAuthStartResponse,
)
from app.services import ensure_user_profile

router = APIRouter(prefix="/auth")


def _provider_status() -> list[OAuthProviderStatus]:
    settings = get_settings()
    return [
        OAuthProviderStatus(id="email", label="邮箱", enabled=True),
        OAuthProviderStatus(id="google", label="Google", enabled=bool(settings.auth_google_id and settings.auth_google_secret)),
        OAuthProviderStatus(id="github", label="GitHub", enabled=bool(settings.auth_github_id and settings.auth_github_secret)),
    ]


def _build_state(callback_url: str | None) -> tuple[str, str]:
    verifier = generate_code_verifier()
    state = encode_state(
        OAuthCallbackState(
            code_verifier=verifier,
            callback_url=build_frontend_callback_url(callback_url),
            created_at=datetime.now(UTC),
        )
    )
    return state, verifier


@router.get("/providers", response_model=list[OAuthProviderStatus])
def get_auth_providers():
    return _provider_status()


@router.get("/session", response_model=AuthSessionResponse)
def get_auth_session(current_user: AuthenticatedUser | None = Depends(get_session_user)):
    if not current_user:
        return AuthSessionResponse(authenticated=False, user=None)
    return AuthSessionResponse(
        authenticated=True,
        user=AuthSessionUser(
            id=current_user.user.id,
            email=current_user.user.email,
            name=current_user.user.name,
            image=current_user.user.image,
            username=current_user.user.username,
        ),
    )


def _persist_session(db: Session, user_id: str) -> tuple[str, datetime]:
    token = create_session_token()
    expires = session_expiry()
    db.add(AuthSession(session_token=token, user_id=user_id, expires=expires))
    db.commit()
    return token, expires


@router.post("/register", response_model=AuthSessionResponse)
def register_with_email(payload: EmailRegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    password = payload.password
    name = payload.name.strip() if payload.name else None

    if not email:
        raise bad_request("邮箱不能为空。", {"email": "邮箱不能为空"})
    if "@" not in email:
        raise bad_request("请输入有效的邮箱地址。", {"email": "请输入有效的邮箱地址"})
    if len(password) < 8:
        raise bad_request("密码至少需要 8 个字符。", {"password": "密码至少需要 8 个字符"})

    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise bad_request("该邮箱已注册。", {"email": "该邮箱已注册"})

    user = User(
        id=create_session_token(),
        name=name or email.split("@", 1)[0],
        email=email,
        password_hash=hash_password(password),
        image=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_user_profile(db, user)

    token, expires = _persist_session(db, user.id)
    set_session_cookie(response, token, expires)
    return AuthSessionResponse(
        authenticated=True,
        user=AuthSessionUser(
            id=user.id,
            email=user.email,
            name=user.name,
            image=user.image,
            username=user.username,
        ),
    )


@router.post("/login", response_model=AuthSessionResponse)
def login_with_email(payload: EmailLoginRequest, response: Response, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    if not email or "@" not in email:
        raise bad_request("请输入有效的邮箱地址。", {"email": "请输入有效的邮箱地址"})
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise unauthorized("邮箱或密码错误。")

    token, expires = _persist_session(db, user.id)
    set_session_cookie(response, token, expires)
    return AuthSessionResponse(
        authenticated=True,
        user=AuthSessionUser(
            id=user.id,
            email=user.email,
            name=user.name,
            image=user.image,
            username=user.username,
        ),
    )


@router.get("/{provider}/start", response_model=OAuthStartResponse)
def start_oauth(provider: str, callback_url: str | None = Query(default=None)):
    state, verifier = _build_state(callback_url)
    challenge = generate_code_challenge(verifier)

    if provider == "google":
        return OAuthStartResponse(authorization_url=build_google_authorization_url(state, challenge))
    if provider == "github":
        return OAuthStartResponse(authorization_url=build_github_authorization_url(state, challenge))
    raise bad_request("不支持的登录提供商。")


async def _exchange_google_code(code: str, code_verifier: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=20) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.auth_google_id,
                "client_secret": settings.auth_google_secret,
                "code": code,
                "code_verifier": code_verifier,
                "grant_type": "authorization_code",
                "redirect_uri": build_callback_url("google"),
            },
        )
        token_response.raise_for_status()
        token_payload = token_response.json()
        access_token = token_payload["access_token"]
        user_response = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_response.raise_for_status()
        profile = user_response.json()
    return {
        "provider": "google",
        "provider_account_id": str(profile["sub"]),
        "type": "oauth",
        "access_token": access_token,
        "refresh_token": token_payload.get("refresh_token"),
        "expires_at": token_payload.get("expires_in"),
        "token_type": token_payload.get("token_type"),
        "scope": token_payload.get("scope"),
        "id_token": token_payload.get("id_token"),
        "session_state": None,
        "user": {
            "id": f"google:{profile['sub']}",
            "email": profile.get("email"),
            "name": profile.get("name"),
            "image": profile.get("picture"),
            "email_verified": profile.get("email_verified"),
        },
    }


async def _exchange_github_code(code: str, code_verifier: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=20, headers={"Accept": "application/json"}) as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.auth_github_id,
                "client_secret": settings.auth_github_secret,
                "code": code,
                "code_verifier": code_verifier,
                "redirect_uri": build_callback_url("github"),
            },
        )
        token_response.raise_for_status()
        token_payload = token_response.json()
        access_token = token_payload["access_token"]
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_response.raise_for_status()
        profile = user_response.json()
        email_response = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        email_response.raise_for_status()
        emails = email_response.json()
    primary_email = next((item["email"] for item in emails if item.get("primary")), None) or (emails[0]["email"] if emails else None)
    return {
        "provider": "github",
        "provider_account_id": str(profile["id"]),
        "type": "oauth",
        "access_token": access_token,
        "refresh_token": token_payload.get("refresh_token"),
        "expires_at": None,
        "token_type": token_payload.get("token_type"),
        "scope": token_payload.get("scope"),
        "id_token": None,
        "session_state": None,
        "user": {
            "id": f"github:{profile['id']}",
            "email": primary_email,
            "name": profile.get("name") or profile.get("login"),
            "image": profile.get("avatar_url"),
            "email_verified": None,
        },
    }


async def _upsert_auth_user(db: Session, auth_payload: dict) -> User:
    account = db.execute(
        select(Account).where(
            Account.provider == auth_payload["provider"],
            Account.provider_account_id == auth_payload["provider_account_id"],
        )
    ).scalar_one_or_none()

    user_data = auth_payload["user"]
    if account:
        user = db.get(User, account.user_id)
        if user:
            user.name = user_data["name"]
            user.email = user_data["email"]
            user.image = user_data["image"]
    else:
        user = User(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            image=user_data["image"],
        )
        db.add(user)
        db.flush()
        db.add(
            Account(
                id=create_session_token(),
                user_id=user.id,
                type=auth_payload["type"],
                provider=auth_payload["provider"],
                provider_account_id=auth_payload["provider_account_id"],
                access_token=auth_payload["access_token"],
                refresh_token=auth_payload["refresh_token"],
                expires_at=auth_payload["expires_at"],
                token_type=auth_payload["token_type"],
                scope=auth_payload["scope"],
                id_token=auth_payload["id_token"],
                session_state=auth_payload["session_state"],
            )
        )

    db.commit()
    db.refresh(user)
    ensure_user_profile(db, user)
    return user


async def _complete_oauth(provider: str, code: str, state: str, db: Session) -> RedirectResponse:
    state_payload = decode_state(state)
    if provider == "google":
        auth_payload = await _exchange_google_code(code, state_payload.code_verifier)
    elif provider == "github":
        auth_payload = await _exchange_github_code(code, state_payload.code_verifier)
    else:
        raise bad_request("不支持的登录提供商。")

    user = await _upsert_auth_user(db, auth_payload)
    token = create_session_token()
    expires = session_expiry()
    db.add(AuthSession(session_token=token, user_id=user.id, expires=expires))
    db.commit()

    destination = state_payload.callback_url
    response = RedirectResponse(url=destination, status_code=302)
    set_session_cookie(response, token, expires)
    return response


@router.get("/google/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    return await _complete_oauth("google", code, state, db)


@router.get("/github/callback")
async def github_callback(code: str, state: str, db: Session = Depends(get_db)):
    return await _complete_oauth("github", code, state, db)


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    session_token = request.cookies.get("makerhub_session")
    if session_token:
        db.query(AuthSession).filter(AuthSession.session_token == session_token).delete()
        db.commit()
    response = RedirectResponse(url=get_settings().auth_frontend_url.rstrip("/") + "/", status_code=302)
    clear_session_cookie(response)
    return response
