#!/usr/bin/env sh
set -eu

REPO_DIR=$(git rev-parse --show-toplevel)
BACKEND_DIR="$REPO_DIR/backend"

DEPLOY_BRANCH=${DEPLOY_BRANCH:-main}
BACKEND_SERVICE=${BACKEND_SERVICE:-makerhub-backend}
UV_DEFAULT_INDEX=${UV_DEFAULT_INDEX:-https://pypi.tuna.tsinghua.edu.cn/simple}
SYSTEMD_SERVICE_FILE=${SYSTEMD_SERVICE_FILE:-$BACKEND_DIR/scripts/${BACKEND_SERVICE}.service}
SYSTEMD_SERVICE_TARGET=${SYSTEMD_SERVICE_TARGET:-/etc/systemd/system/${BACKEND_SERVICE}.service}
DEPLOY_SERVICE_USER=${DEPLOY_SERVICE_USER:-}
DEPLOY_SERVICE_GROUP=${DEPLOY_SERVICE_GROUP:-}

run_as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

detect_service_user() {
  if [ -n "$DEPLOY_SERVICE_USER" ]; then
    printf '%s' "$DEPLOY_SERVICE_USER"
    return
  fi

  for candidate in www-data www root; do
    if id -u "$candidate" >/dev/null 2>&1; then
      printf '%s' "$candidate"
      return
    fi
  done

  printf '%s' root
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

SERVICE_USER=$(detect_service_user)
if [ -n "$DEPLOY_SERVICE_GROUP" ]; then
  SERVICE_GROUP=$DEPLOY_SERVICE_GROUP
else
  SERVICE_GROUP=$(id -gn "$SERVICE_USER" 2>/dev/null || printf '%s' "$SERVICE_USER")
fi

rendered_service=$(mktemp)
trap 'rm -f "$rendered_service"' EXIT
sed \
  -e "s/^User=.*/User=$SERVICE_USER/" \
  -e "s/^Group=.*/Group=$SERVICE_GROUP/" \
  -e "s|__BACKEND_DIR__|$BACKEND_DIR|g" \
  "$SYSTEMD_SERVICE_FILE" > "$rendered_service"

run_as_root cp "$rendered_service" "$SYSTEMD_SERVICE_TARGET"
run_as_root systemctl daemon-reload
run_as_root systemctl enable "$BACKEND_SERVICE"
run_as_root systemctl reset-failed "$BACKEND_SERVICE" >/dev/null 2>&1 || true

UV_SYSTEM_CERTS=1 UV_DEFAULT_INDEX="$UV_DEFAULT_INDEX" uv sync
uv run alembic upgrade head

if ! run_as_root systemctl restart "$BACKEND_SERVICE"; then
  run_as_root systemctl status "$BACKEND_SERVICE" --no-pager -l || true
  run_as_root journalctl -u "$BACKEND_SERVICE" -n 80 --no-pager || true
  exit 1
fi

if ! run_as_root systemctl is-active --quiet "$BACKEND_SERVICE"; then
  run_as_root systemctl status "$BACKEND_SERVICE" --no-pager -l || true
  run_as_root journalctl -u "$BACKEND_SERVICE" -n 80 --no-pager || true
  exit 1
fi
