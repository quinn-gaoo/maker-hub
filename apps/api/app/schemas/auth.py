from datetime import datetime

from app.schemas.common import APIModel


class AuthSessionUser(APIModel):
    id: str
    email: str | None
    name: str | None
    image: str | None
    username: str | None


class AuthSessionResponse(APIModel):
    authenticated: bool
    user: AuthSessionUser | None = None


class OAuthStartResponse(APIModel):
    authorization_url: str


class OAuthProviderStatus(APIModel):
    id: str
    label: str
    enabled: bool


class OAuthCallbackState(APIModel):
    code_verifier: str
    callback_url: str
    redirect_uri: str | None = None
    created_at: datetime


class OAuthCompleteRequest(APIModel):
    code: str
    state: str


class OAuthCompleteResponse(APIModel):
    authenticated: bool
    user: AuthSessionUser | None = None
    callback_url: str


class EmailRegisterRequest(APIModel):
    name: str | None = None
    email: str
    password: str
    verification_code: str


class EmailLoginRequest(APIModel):
    email: str
    password: str


class SendEmailVerificationCodeRequest(APIModel):
    email: str


class SendEmailVerificationCodeResponse(APIModel):
    message: str
    cooldown_seconds: int
    expires_in_seconds: int
