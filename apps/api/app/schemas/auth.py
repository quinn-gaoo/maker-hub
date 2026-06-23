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
    created_at: datetime


class EmailRegisterRequest(APIModel):
    name: str | None = None
    email: str
    password: str


class EmailLoginRequest(APIModel):
    email: str
    password: str
