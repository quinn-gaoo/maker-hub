from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.exc import ProgrammingError
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
from app.core.errors import bad_request, service_unavailable, unauthorized
from app.email import send_email
from app.core.security import AuthenticatedUser, get_session_user
from app.models.auth import Account, EmailVerificationCode, Session as AuthSession
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    AuthSessionUser,
    EmailLoginRequest,
    EmailRegisterRequest,
    OAuthCallbackState,
    OAuthProviderStatus,
    OAuthStartResponse,
    SendEmailVerificationCodeRequest,
    SendEmailVerificationCodeResponse,
)
from app.services import ensure_user_profile

router = APIRouter(prefix="/auth")
REGISTER_VERIFICATION_PURPOSE = "register"


def _handle_verification_storage_error(db: Session, exc: ProgrammingError) -> None:
    db.rollback()
    if "email_verification_codes" in str(exc):
        raise service_unavailable("验证码功能尚未初始化，请先执行数据库迁移。") from exc
    raise exc


def _verification_secret() -> str:
    return get_settings().auth_session_secret


def _build_verification_code() -> str:
    settings = get_settings()
    digits = "".join(secrets.choice("0123456789") for _ in range(settings.email_verification_code_length))
    return f"{settings.email_verification_code_prefix}-{digits}"


def _hash_verification_code(email: str, purpose: str, code: str) -> str:
    payload = f"{normalize_email(email)}:{purpose}:{code.strip().upper()}"
    return hmac.new(_verification_secret().encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def _verification_code_expiry() -> datetime:
    settings = get_settings()
    return datetime.now(UTC) + timedelta(minutes=settings.email_verification_code_ttl_minutes)


def _validate_email_address(email: str) -> str:
    normalized = normalize_email(email)
    if not normalized:
        raise bad_request("邮箱不能为空。", {"email": "邮箱不能为空"})
    if "@" not in normalized:
        raise bad_request("请输入有效的邮箱地址。", {"email": "请输入有效的邮箱地址"})
    return normalized


def _verify_registration_code(db: Session, email: str, submitted_code: str) -> EmailVerificationCode:
    normalized_code = submitted_code.strip().upper()
    expected_hash = _hash_verification_code(email, REGISTER_VERIFICATION_PURPOSE, normalized_code)
    try:
        record = db.execute(
            select(EmailVerificationCode)
            .where(
                EmailVerificationCode.email == email,
                EmailVerificationCode.purpose == REGISTER_VERIFICATION_PURPOSE,
                EmailVerificationCode.code_hash == expected_hash,
            )
            .order_by(EmailVerificationCode.created_at.desc())
        ).scalar_one_or_none()
    except ProgrammingError as exc:
        _handle_verification_storage_error(db, exc)

    if not record:
        raise bad_request("验证码错误。", {"verificationCode": "验证码错误"})
    if record.used_at is not None:
        raise bad_request("验证码已使用，请重新获取。", {"verificationCode": "验证码已使用"})
    if record.expires_at <= datetime.now(UTC):
        raise bad_request("验证码已过期，请重新获取。", {"verificationCode": "验证码已过期"})
    return record


def _send_registration_email(to_email: str, code: str) -> None:
    settings = get_settings()
    ttl_minutes = settings.email_verification_code_ttl_minutes
    subject = f"{settings.smtp_from_name} 注册验证码"
    text_content = (
        f"你好，\n\n"
        f"欢迎注册 MakerHub。\n"
        f"你的邮箱验证码是：{code}\n\n"
        f"该验证码将在 {ttl_minutes} 分钟后失效，请尽快完成验证。\n"
        f"为了保护你的账号安全，请不要将验证码透露给任何人。\n\n"
        f"如果这不是你的操作，可以直接忽略这封邮件。"
    )
    html_content = f"""
    <div style="margin:0;padding:32px 16px;background-color:#f4efe6;">
      <div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
        <div style="margin-bottom:16px;text-align:center;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background-color:#111827;color:#f9fafb;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">
            MakerHub
          </div>
        </div>
        <div style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:24px;padding:36px 32px;box-shadow:0 20px 45px rgba(17,24,39,0.08);">
          <p style="margin:0 0 12px;font-size:14px;color:#92400e;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
            Email Verification
          </p>
          <h1 style="margin:0 0 16px;font-size:30px;line-height:1.2;color:#111827;">
            完成你的 MakerHub 注册
          </h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#4b5563;">
            你好，感谢你注册 MakerHub。请输入下面的验证码来完成邮箱验证。
          </p>
          <div style="margin:0 0 24px;padding:20px;border-radius:20px;background:linear-gradient(135deg,#fff7ed 0%,#fffbeb 100%);border:1px solid #fed7aa;text-align:center;">
            <div style="margin-bottom:8px;font-size:12px;color:#9a3412;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
              Verification Code
            </div>
            <div style="font-size:34px;line-height:1.1;font-weight:800;letter-spacing:0.2em;color:#c2410c;">
              {code}
            </div>
          </div>
          <div style="margin:0 0 24px;padding:16px 18px;border-radius:16px;background-color:#f9fafb;border:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#374151;">
              该验证码将在 <strong>{ttl_minutes} 分钟</strong> 后失效，请尽快完成验证。
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
              为了保护你的账号安全，请不要将验证码透露给任何人。
            </p>
          </div>
          <p style="margin:0;font-size:13px;line-height:1.8;color:#6b7280;">
            如果这不是你的操作，可以直接忽略这封邮件。
          </p>
        </div>
        <p style="margin:16px 0 0;text-align:center;font-size:12px;line-height:1.7;color:#9ca3af;">
          This email was sent by MakerHub for account verification.
        </p>
      </div>
    </div>
    """.strip()
    send_email(to_email=to_email, subject=subject, text_content=text_content, html_content=html_content)


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


@router.post("/email-verification-code", response_model=SendEmailVerificationCodeResponse)
def send_register_verification_code(payload: SendEmailVerificationCodeRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    email = _validate_email_address(payload.email)

    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise bad_request("该邮箱已注册。", {"email": "该邮箱已注册"})

    try:
        latest = db.execute(
            select(EmailVerificationCode)
            .where(
                EmailVerificationCode.email == email,
                EmailVerificationCode.purpose == REGISTER_VERIFICATION_PURPOSE,
            )
            .order_by(EmailVerificationCode.created_at.desc())
        ).scalar_one_or_none()
    except ProgrammingError as exc:
        _handle_verification_storage_error(db, exc)

    now = datetime.now(UTC)
    cooldown = timedelta(seconds=settings.email_verification_code_cooldown_seconds)
    if latest and latest.created_at > now - cooldown:
        raise bad_request(
            f"验证码发送过于频繁，请在 {settings.email_verification_code_cooldown_seconds} 秒后重试。",
            {"email": "请稍后再试"},
        )

    code = _build_verification_code()
    expires_at = _verification_code_expiry()
    try:
        db.execute(
            delete(EmailVerificationCode).where(
                EmailVerificationCode.email == email,
                EmailVerificationCode.purpose == REGISTER_VERIFICATION_PURPOSE,
            )
        )
    except ProgrammingError as exc:
        _handle_verification_storage_error(db, exc)

    db.add(
        EmailVerificationCode(
            id=create_session_token(),
            email=email,
            purpose=REGISTER_VERIFICATION_PURPOSE,
            code_hash=_hash_verification_code(email, REGISTER_VERIFICATION_PURPOSE, code),
            expires_at=expires_at,
        )
    )
    try:
        _send_registration_email(email, code)
    except Exception:
        db.rollback()
        raise
    db.commit()

    return SendEmailVerificationCodeResponse(
        message="验证码已发送到你的邮箱，请注意查收。",
        cooldown_seconds=settings.email_verification_code_cooldown_seconds,
        expires_in_seconds=settings.email_verification_code_ttl_minutes * 60,
    )


@router.post("/register", response_model=AuthSessionResponse)
def register_with_email(payload: EmailRegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = _validate_email_address(payload.email)
    password = payload.password
    name = payload.name.strip() if payload.name else None
    verified_at = datetime.now(UTC)

    if len(password) < 8:
        raise bad_request("密码至少需要 8 个字符。", {"password": "密码至少需要 8 个字符"})

    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise bad_request("该邮箱已注册。", {"email": "该邮箱已注册"})

    verification_record = _verify_registration_code(db, email, payload.verification_code)

    user = User(
        id=create_session_token(),
        name=name or email.split("@", 1)[0],
        email=email,
        email_verified=verified_at,
        password_hash=hash_password(password),
        image=None,
    )
    db.add(user)
    verification_record.used_at = verified_at
    db.add(verification_record)
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
    email = _validate_email_address(payload.email)
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
