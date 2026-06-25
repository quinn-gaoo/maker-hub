#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKEND_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
REPO_DIR=$(CDPATH= cd -- "$BACKEND_DIR/.." && pwd)

DEPLOY_BRANCH=${DEPLOY_BRANCH:-main}
BACKEND_SERVICE=${BACKEND_SERVICE:-makerhub-backend}
UV_DEFAULT_INDEX=${UV_DEFAULT_INDEX:-https://pypi.tuna.tsinghua.edu.cn/simple}

cd "$REPO_DIR"
git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

cd "$BACKEND_DIR"
UV_SYSTEM_CERTS=1 UV_DEFAULT_INDEX="$UV_DEFAULT_INDEX" uv sync
uv run alembic upgrade head

sudo systemctl restart "$BACKEND_SERVICE"
sudo systemctl is-active --quiet "$BACKEND_SERVICE"
