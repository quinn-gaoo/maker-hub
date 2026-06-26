from __future__ import annotations

from dataclasses import asdict, dataclass

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.config import get_env_file_path, get_settings
from app.db.session import get_engine


@dataclass
class EnvironmentCheckIssue:
    code: str
    message: str


@dataclass
class EnvironmentCheckResult:
    ok: bool
    issues: list[EnvironmentCheckIssue]

    def to_dict(self) -> dict[str, object]:
        return {
            "ok": self.ok,
            "issues": [asdict(item) for item in self.issues],
        }


class EnvironmentCheckError(RuntimeError):
    def __init__(self, result: EnvironmentCheckResult):
        self.result = result
        super().__init__(self.summary)

    @property
    def summary(self) -> str:
        return "；".join(issue.message for issue in self.result.issues)


def _get_alembic_config() -> Config:
    api_dir = get_env_file_path().parent
    config = Config(str(api_dir / "alembic.ini"))
    config.set_main_option("script_location", str(api_dir / "alembic"))
    return config


def _collect_settings_issues() -> list[EnvironmentCheckIssue]:
    try:
        get_settings()
        return []
    except ValidationError as exc:
        issues: list[EnvironmentCheckIssue] = []
        for error in exc.errors():
            field_name = ".".join(str(part) for part in error.get("loc", ()))
            if not field_name:
                field_name = "unknown"
            env_name = field_name.upper()
            issue_type = error.get("type", "")
            if issue_type == "missing":
                message = f"环境变量 {env_name} 缺失，请检查 {get_env_file_path().name} 或运行环境配置。"
            else:
                message = f"环境变量 {env_name} 无效：{error.get('msg', '配置校验失败。')}"
            issues.append(EnvironmentCheckIssue(code=f"ENV_{env_name}_INVALID", message=message))
        return issues


def _collect_database_issues(engine: Engine) -> list[EnvironmentCheckIssue]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError:
        return [EnvironmentCheckIssue(code="DATABASE_UNAVAILABLE", message="数据库未启动或无法连接，请先启动数据库服务。")]
    except SQLAlchemyError:
        return [EnvironmentCheckIssue(code="DATABASE_CONFIG_INVALID", message="数据库连接检查失败，请确认 DATABASE_URL 配置是否正确。")]

    alembic_config = _get_alembic_config()
    script = ScriptDirectory.from_config(alembic_config)
    expected_heads = set(script.get_heads())

    try:
        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            current_heads = set(context.get_current_heads())
    except SQLAlchemyError:
        return [EnvironmentCheckIssue(code="DATABASE_MIGRATION_CHECK_FAILED", message="数据库迁移状态检查失败，请确认数据库结构是否可访问。")]

    if current_heads != expected_heads:
        return [EnvironmentCheckIssue(code="DATABASE_MIGRATION_OUTDATED", message="数据库未迁移到最新版本，请先执行 `uv run alembic upgrade head`。")]
    return []


def run_environment_checks() -> EnvironmentCheckResult:
    issues = _collect_settings_issues()
    if issues:
        return EnvironmentCheckResult(ok=False, issues=issues)

    engine = get_engine()
    issues.extend(_collect_database_issues(engine))
    return EnvironmentCheckResult(ok=not issues, issues=issues)


def ensure_environment_ready() -> None:
    result = run_environment_checks()
    if not result.ok:
        raise EnvironmentCheckError(result)
