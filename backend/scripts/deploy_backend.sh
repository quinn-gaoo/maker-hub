#!/usr/bin/env sh
set -eu

REPO_DIR=$(git rev-parse --show-toplevel)
BACKEND_DIR="$REPO_DIR/backend"

DEPLOY_BRANCH=${DEPLOY_BRANCH:-main}
BACKEND_SERVICE=${BACKEND_SERVICE:-makerhub-backend}
UV_DEFAULT_INDEX=${UV_DEFAULT_INDEX:-https://pypi.tuna.tsinghua.edu.cn/simple}
SYSTEMD_SERVICE_FILE=${SYSTEMD_SERVICE_FILE:-$BACKEND_DIR/scripts/${BACKEND_SERVICE}.service}
SYSTEMD_SERVICE_TARGET=${SYSTEMD_SERVICE_TARGET:-/etc/systemd/system/${BACKEND_SERVICE}.service}

run_as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

cd "$REPO_DIR"
git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

cd "$BACKEND_DIR"
if [ ! -f ".env" ]; then
  echo "Missing backend/.env. Copy backend/.env.example to backend/.env and fill required values first." >&2
  exit 1
fi

if [ ! -f "$SYSTEMD_SERVICE_FILE" ]; then
  echo "Missing systemd service template: $SYSTEMD_SERVICE_FILE" >&2
  exit 1
fi

run_as_root cp "$SYSTEMD_SERVICE_FILE" "$SYSTEMD_SERVICE_TARGET"
run_as_root systemctl daemon-reload
run_as_root systemctl enable "$BACKEND_SERVICE"

UV_SYSTEM_CERTS=1 UV_DEFAULT_INDEX="$UV_DEFAULT_INDEX" uv sync
uv run alembic upgrade head

run_as_root systemctl restart "$BACKEND_SERVICE"
run_as_root systemctl is-active --quiet "$BACKEND_SERVICE"
