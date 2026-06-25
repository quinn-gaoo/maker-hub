from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


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

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def admin_email_list(self) -> list[str]:
        return [item.strip().lower() for item in self.admin_emails.split(",") if item.strip()]

    def is_admin_email(self, email: str | None) -> bool:
        if not email:
            return False
        return email.strip().lower() in set(self.admin_email_list)


@lru_cache
def get_settings() -> Settings:
    return Settings()
