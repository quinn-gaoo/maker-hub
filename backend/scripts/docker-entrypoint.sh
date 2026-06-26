#!/usr/bin/env sh
set -eu

if ! command -v uv >/dev/null 2>&1; then
  python -m pip install --no-cache-dir uv
fi

uv sync --frozen --no-dev

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  attempt=1
  max_attempts=${MIGRATION_MAX_ATTEMPTS:-30}
  until uv run alembic upgrade head; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Database migration failed after ${max_attempts} attempts." >&2
      exit 1
    fi

    echo "Database is not ready yet, retrying migration (${attempt}/${max_attempts})..."
    attempt=$((attempt + 1))
    sleep 2
  done
fi

exec uv run python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
