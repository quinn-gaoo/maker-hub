from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
import httpx
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.auth import (
    build_callback_url,
    clear_session_cookie,
    create_session_token,
    hash_password,
    normalize_email,
    session_expiry,
    set_session_cookie,
    verify_password,
)
from app.core.config import get_settings
from app.core.errors import bad_request, service_unavailable, unauthorized
from app.core.logging import get_logger
from app.email import send_email
from app.core.security import AuthenticatedUser, get_session_user
from app.models.auth import Account, EmailVerificationCode, Session as AuthSession
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    AuthSessionUser,
    EmailLoginRequest,
    EmailRegisterRequest,
    OAuthCompleteRequest,
    OAuthCompleteResponse,
    SendEmailVerificationCodeRequest,
    SendEmailVerificationCodeResponse,
)
from app.services import ensure_user_profile

router = APIRouter(prefix="/auth")
REGISTER_VERIFICATION_PURPOSE = "register"
OAUTH_HTTP_TIMEOUT_SECONDS = 20
logger = get_logger(__name__)


def _handle_verification_storage_error(db: Session, exc: ProgrammingError) -> None:
    db.rollback()
    if "email_verification_codes" in str(exc):
        raise service_unavailable("验证码功能尚未初始化，请先执行数据库迁移。") from exc
    raise exc


def _verification_secret() -> str:
    return get_settings().auth_session_secret


async def _run_oauth_request(
    request_coro,
    *,
    provider_label: str,
    action_label: str,
    request_url: str,
):
    try:
        response = await request_coro
        response.raise_for_status()
        return response
    except httpx.ReadTimeout as exc:
        logger.warning(
            "OAuth 上游响应超时：provider=%s action=%s url=%s error=%s",
            provider_label,
            action_label,
            request_url,
            exc,
        )
        raise service_unavailable(f"{provider_label} 登录服务响应超时，请稍后重试。") from exc
    except httpx.ConnectTimeout as exc:
        logger.warning(
            "OAuth 上游连接超时：provider=%s action=%s url=%s error=%s",
            provider_label,
            action_label,
            request_url,
            exc,
        )
        raise service_unavailable(f"连接 {provider_label} 登录服务超时，请稍后重试。") from exc
    except httpx.ConnectError as exc:
        logger.warning(
            "OAuth 上游连接失败：provider=%s action=%s url=%s error=%s",
            provider_label,
            action_label,
            request_url,
            exc,
        )
        raise service_unavailable(f"当前无法连接 {provider_label} 登录服务，请稍后重试。") from exc
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "OAuth 上游返回异常状态：provider=%s action=%s url=%s status=%s",
            provider_label,
            action_label,
            request_url,
            exc.response.status_code,
        )
        raise service_unavailable(f"{provider_label} 登录服务{action_label}失败，请稍后重试。") from exc
    except httpx.HTTPError as exc:
        logger.exception(
            "OAuth 上游请求异常：provider=%s action=%s url=%s",
            provider_label,
            action_label,
            request_url,
            exc_info=exc,
        )
        raise service_unavailable(f"{provider_label} 登录服务暂时不可用，请稍后重试。") from exc


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


def _build_auth_session_user(user: User) -> AuthSessionUser:
    return AuthSessionUser(
        id=user.id,
        email=user.email,
        name=user.name,
        image=user.image,
        username=user.username,
        role=user.role,
        is_admin=user.role == "admin",
    )


@router.get("/session", response_model=AuthSessionResponse)
def get_auth_session(
    current_user: AuthenticatedUser | None = Depends(get_session_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        return AuthSessionResponse(authenticated=False, user=None)
    user = ensure_user_profile(db, current_user.user)
    return AuthSessionResponse(
        authenticated=True,
        user=_build_auth_session_user(user),
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
        user=_build_auth_session_user(user),
    )


@router.post("/login", response_model=AuthSessionResponse)
def login_with_email(payload: EmailLoginRequest, response: Response, db: Session = Depends(get_db)):
    email = _validate_email_address(payload.email)
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise unauthorized("邮箱或密码错误。")
    if user.status != "active":
        raise unauthorized("账号已被禁用。")

    user = ensure_user_profile(db, user)
    token, expires = _persist_session(db, user.id)
    set_session_cookie(response, token, expires)
    return AuthSessionResponse(
        authenticated=True,
        user=_build_auth_session_user(user),
    )


async def _exchange_google_code(code: str, code_verifier: str, redirect_uri: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=OAUTH_HTTP_TIMEOUT_SECONDS) as client:
        token_response = await _run_oauth_request(
            client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.auth_google_id,
                    "client_secret": settings.auth_google_secret,
                    "code": code,
                    "code_verifier": code_verifier,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            ),
            provider_label="Google",
            action_label="交换授权信息",
            request_url="https://oauth2.googleapis.com/token",
        )
        token_payload = token_response.json()
        access_token = token_payload["access_token"]
        user_response = await _run_oauth_request(
            client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            ),
            provider_label="Google",
            action_label="获取用户信息",
            request_url="https://openidconnect.googleapis.com/v1/userinfo",
        )
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


async def _exchange_github_code(code: str, code_verifier: str, redirect_uri: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=OAUTH_HTTP_TIMEOUT_SECONDS, headers={"Accept": "application/json"}) as client:
        token_response = await _run_oauth_request(
            client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.auth_github_id,
                    "client_secret": settings.auth_github_secret,
                    "code": code,
                    "code_verifier": code_verifier,
                    "redirect_uri": redirect_uri,
                },
            ),
            provider_label="GitHub",
            action_label="交换授权信息",
            request_url="https://github.com/login/oauth/access_token",
        )
        token_payload = token_response.json()
        access_token = token_payload["access_token"]
        user_response = await _run_oauth_request(
            client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
            ),
            provider_label="GitHub",
            action_label="获取用户信息",
            request_url="https://api.github.com/user",
        )
        profile = user_response.json()
        email_response = await _run_oauth_request(
            client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {access_token}"},
            ),
            provider_label="GitHub",
            action_label="获取邮箱信息",
            request_url="https://api.github.com/user/emails",
        )
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
            account.access_token = auth_payload["access_token"]
            account.refresh_token = auth_payload["refresh_token"]
            account.expires_at = auth_payload["expires_at"]
            account.token_type = auth_payload["token_type"]
            account.scope = auth_payload["scope"]
            account.id_token = auth_payload["id_token"]
            account.session_state = auth_payload["session_state"]
    else:
        user = None
        if user_data["email"]:
            user = db.execute(select(User).where(User.email == user_data["email"])).scalar_one_or_none()

        if user:
            user.name = user_data["name"] or user.name
            user.image = user_data["image"] or user.image
        else:
            user = User(
                id=user_data["id"],
                name=user_data["name"],
                email=user_data["email"],
                image=user_data["image"],
                email_verified=datetime.now(UTC) if user_data["email"] else None,
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

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise bad_request("该第三方账号绑定失败，请确认邮箱是否已被其他账号占用。") from exc

    db.refresh(user)
    ensure_user_profile(db, user)
    return user


async def _finish_oauth(
    provider: str,
    code: str,
    code_verifier: str,
    callback_url: str,
    redirect_uri: str,
    db: Session,
) -> tuple[User, str, str, datetime]:
    logger.info(
        "开始处理 OAuth 登录：provider=%s redirect_uri=%s callback_url=%s",
        provider,
        redirect_uri,
        callback_url,
    )
    if provider == "google":
        auth_payload = await _exchange_google_code(code, code_verifier, redirect_uri)
    elif provider == "github":
        auth_payload = await _exchange_github_code(code, code_verifier, redirect_uri)
    else:
        raise bad_request("不支持的登录提供商。")

    user = await _upsert_auth_user(db, auth_payload)
    if user.status != "active":
        raise unauthorized("账号已被禁用。")
    token = create_session_token()
    expires = session_expiry()
    db.add(AuthSession(session_token=token, user_id=user.id, expires=expires))
    db.commit()
    logger.info("OAuth 登录处理完成：provider=%s user_id=%s", provider, user.id)
    return user, callback_url, token, expires


async def _complete_oauth(
    provider: str,
    code: str,
    code_verifier: str,
    callback_url: str,
    redirect_uri: str,
    db: Session,
) -> RedirectResponse:
    user, destination, token, expires = await _finish_oauth(
        provider,
        code,
        code_verifier,
        callback_url,
        redirect_uri,
        db,
    )

    response = RedirectResponse(url=destination, status_code=302)
    set_session_cookie(response, token, expires)
    return response


@router.post("/{provider}/complete", response_model=OAuthCompleteResponse)
async def complete_oauth(
    provider: str,
    payload: OAuthCompleteRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user, destination, token, expires = await _finish_oauth(
        provider,
        payload.code,
        payload.code_verifier,
        payload.callback_url,
        payload.redirect_uri,
        db,
    )
    set_session_cookie(response, token, expires)
    return OAuthCompleteResponse(
        authenticated=True,
        callback_url=destination,
        user=_build_auth_session_user(user),
    )


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    session_token = request.cookies.get("makerhub_session")
    if session_token:
        db.query(AuthSession).filter(AuthSession.session_token == session_token).delete()
        db.commit()
    response = RedirectResponse(url=get_settings().auth_frontend_url.rstrip("/") + "/", status_code=302)
    clear_session_cookie(response)
    return response
