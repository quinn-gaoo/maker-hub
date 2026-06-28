from pathlib import Path

from app.core.environment import (
    EnvironmentCheckIssue,
    _collect_database_issues,
    _collect_settings_issues,
)
from app.core.config import get_env_file_path, get_settings
from app.db.session import get_engine, get_session_local


def test_collect_settings_issues_reports_missing_required_env(monkeypatch):
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_local.cache_clear()
    env_file = get_env_file_path()
    monkeypatch.setattr("app.core.config.DEFAULT_ENV_FILE_PATH", Path(str(env_file.parent / "missing-test.env")))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("EMAIL_VERIFICATION_SECRET", raising=False)
    monkeypatch.delenv("COS_SECRET_ID", raising=False)
    monkeypatch.delenv("COS_SECRET_KEY", raising=False)
    monkeypatch.delenv("COS_BUCKET", raising=False)
    monkeypatch.delenv("COS_REGION", raising=False)
    monkeypatch.delenv("COS_PUBLIC_BASE_URL", raising=False)

    issues = _collect_settings_issues()

    assert issues
    assert any(issue.code == "ENV_DATABASE_URL_INVALID" for issue in issues)


class _DatabaseDownEngine:
    def connect(self):
        from sqlalchemy.exc import OperationalError

        raise OperationalError("SELECT 1", {}, RuntimeError("connection refused"))


def test_collect_database_issues_reports_database_unavailable():
    issues = _collect_database_issues(_DatabaseDownEngine())

    assert issues == [
        EnvironmentCheckIssue(
            code="DATABASE_UNAVAILABLE",
            message="数据库未启动或无法连接，请先启动数据库服务。",
        )
    ]


class _ConnectionContext:
    def __enter__(self):
        return object()

    def __exit__(self, exc_type, exc, tb):
        return False


class _MigrationOutdatedEngine:
    def connect(self):
        return _ConnectionContext()


def test_run_environment_check_reports_outdated_migration(monkeypatch):
    monkeypatch.setattr("app.core.environment.get_settings", lambda: object())
    monkeypatch.setattr("app.core.environment.get_engine", lambda: _MigrationOutdatedEngine())
    monkeypatch.setattr("app.core.environment._get_alembic_config", lambda: object())

    class _ScriptDirectory:
        def get_heads(self):
            return ["head-2"]

    class _MigrationContext:
        def get_current_heads(self):
            return ["head-1"]

    monkeypatch.setattr("app.core.environment.ScriptDirectory.from_config", lambda config: _ScriptDirectory())
    monkeypatch.setattr("app.core.environment.MigrationContext.configure", lambda connection: _MigrationContext())

    from app.core.environment import run_environment_checks

    result = run_environment_checks()

    assert result.ok is False
    assert result.issues == [
        EnvironmentCheckIssue(
            code="DATABASE_MIGRATION_OUTDATED",
            message="数据库未迁移到最新版本，请先执行 `uv run alembic upgrade head`。",
        )
    ]


def teardown_function():
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_local.cache_clear()
