from __future__ import annotations

from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from alembic.runtime.migration import MigrationContext


def _get_alembic_config() -> Config:
    api_dir = Path(__file__).resolve().parents[2]
    config = Config(str(api_dir / "alembic.ini"))
    config.set_main_option("script_location", str(api_dir / "alembic"))
    return config


def ensure_database_ready(engine: Engine) -> None:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError as exc:
        raise RuntimeError("数据库未启动或无法连接，请先启动数据库服务。") from exc
    except SQLAlchemyError as exc:
        raise RuntimeError("数据库连接检查失败，请确认 DATABASE_URL 配置是否正确。") from exc

    alembic_config = _get_alembic_config()
    script = ScriptDirectory.from_config(alembic_config)
    expected_heads = set(script.get_heads())

    try:
        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            current_heads = set(context.get_current_heads())
    except SQLAlchemyError as exc:
        raise RuntimeError("数据库迁移状态检查失败，请确认数据库结构是否可访问。") from exc

    if current_heads != expected_heads:
        raise RuntimeError("数据库未迁移到最新版本，请先执行 `./.venv/bin/alembic upgrade head`。")
