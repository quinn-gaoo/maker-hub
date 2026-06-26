from app.core.environment import ensure_environment_ready


def ensure_database_ready() -> None:
    try:
        ensure_environment_ready()
    except Exception as exc:
        raise RuntimeError(f"启动环境检查未通过：{exc}") from exc
