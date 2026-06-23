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
    auth_github_id: str | None = None
    auth_github_secret: str | None = None
    cos_secret_id: str
    cos_secret_key: str
    cos_bucket: str
    cos_region: str
    cos_public_base_url: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
