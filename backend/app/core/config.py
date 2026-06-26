from pathlib import Path
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"
REQUIRED_NON_EMPTY_SETTINGS = (
    "database_url",
    "internal_api_signing_secret",
    "auth_session_secret",
    "cos_secret_id",
    "cos_secret_key",
    "cos_bucket",
    "cos_region",
    "cos_public_base_url",
)


class Settings(BaseSettings):
    app_name: str = "MakerHub API"
    app_env: str = "development"
    database_url: str
    internal_api_signing_secret: str
    auth_session_secret: str
    auth_base_url: str = "http://localhost:8000"
    auth_frontend_url: str = "http://localhost:3000"
    public_api_base_url: str = "http://127.0.0.1:8000"
    auth_google_id: str | None = None
    auth_google_secret: str | None = None
    auth_google_redirect_uri: str | None = None
    auth_github_id: str | None = None
    auth_github_secret: str | None = None
    auth_github_redirect_uri: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from_email: str | None = None
    smtp_from_name: str = "MakerHub"
    email_verification_code_prefix: str = "MKH"
    email_verification_code_length: int = 6
    email_verification_code_ttl_minutes: int = 10
    email_verification_code_cooldown_seconds: int = 60
    admin_emails: str = ""
    cos_secret_id: str
    cos_secret_key: str
    cos_bucket: str
    cos_region: str
    cos_public_base_url: str

    model_config = SettingsConfigDict(env_file_encoding="utf-8", extra="ignore")

    @field_validator(*REQUIRED_NON_EMPTY_SETTINGS)
    @classmethod
    def validate_non_empty_setting(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("不能为空。")
        return value

    @property
    def admin_email_list(self) -> list[str]:
        return [item.strip().lower() for item in self.admin_emails.split(",") if item.strip()]

    def is_admin_email(self, email: str | None) -> bool:
        if not email:
            return False
        return email.strip().lower() in set(self.admin_email_list)


def get_env_file_path() -> Path:
    return DEFAULT_ENV_FILE_PATH


@lru_cache
def get_settings() -> Settings:
    return Settings(_env_file=get_env_file_path())
