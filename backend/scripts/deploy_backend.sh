#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
BACKEND_DIR=$(CDPATH= cd "$SCRIPT_DIR/.." && pwd -P)
REPO_DIR=$(CDPATH= cd "$BACKEND_DIR/.." && pwd -P)

DEPLOY_BRANCH=${DEPLOY_BRANCH:-main}
BACKEND_SERVICE=${BACKEND_SERVICE:-makerhub-backend}
SYSTEMD_SERVICE_FILE=${SYSTEMD_SERVICE_FILE:-$BACKEND_DIR/scripts/${BACKEND_SERVICE}.service}
SYSTEMD_SERVICE_TARGET=${SYSTEMD_SERVICE_TARGET:-/etc/systemd/system/${BACKEND_SERVICE}.service}
DEPLOY_SERVICE_USER=${DEPLOY_SERVICE_USER:-}
DEPLOY_SERVICE_GROUP=${DEPLOY_SERVICE_GROUP:-}
SKIP_GIT_PULL=${SKIP_GIT_PULL:-0}

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

  owner=""
  if owner=$(stat -c '%U' "$BACKEND_DIR" 2>/dev/null); then
    :
  elif owner=$(stat -f '%Su' "$BACKEND_DIR" 2>/dev/null); then
    :
  fi

  if [ -n "$owner" ] && [ "$owner" != "UNKNOWN" ] && id -u "$owner" >/dev/null 2>&1; then
    printf '%s' "$owner"
    return
  fi

  printf '%s' "$(id -un)"
}

service_exists() {
  run_as_root systemctl list-unit-files "$BACKEND_SERVICE.service" --no-legend 2>/dev/null | grep -q "^$BACKEND_SERVICE.service"
}

cd "$REPO_DIR"
if service_exists; then
  if run_as_root systemctl is-active --quiet "$BACKEND_SERVICE"; then
    echo "$BACKEND_SERVICE is active, stopping it before deployment..."
    run_as_root systemctl stop "$BACKEND_SERVICE"
  else
    echo "$BACKEND_SERVICE exists but is not active."
  fi
else
  echo "$BACKEND_SERVICE is not installed yet."
fi

if [ "$SKIP_GIT_PULL" != "1" ]; then
  git fetch origin "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"
  git pull --ff-only origin "$DEPLOY_BRANCH"
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is not installed or not in PATH. Install uv first, then rerun this script." >&2
  echo "Install command: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
fi

UV_BIN=$(command -v uv)

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
  -e "s|__UV_BIN__|$UV_BIN|g" \
  "$SYSTEMD_SERVICE_FILE" > "$rendered_service"

run_as_root cp "$rendered_service" "$SYSTEMD_SERVICE_TARGET"
run_as_root systemctl daemon-reload
run_as_root systemctl enable "$BACKEND_SERVICE"
run_as_root systemctl reset-failed "$BACKEND_SERVICE" >/dev/null 2>&1 || true

UV_SYSTEM_CERTS=1 uv sync
uv run alembic upgrade head

if ! run_as_root systemctl start "$BACKEND_SERVICE"; then
  run_as_root systemctl status "$BACKEND_SERVICE" --no-pager -l || true
  run_as_root journalctl -u "$BACKEND_SERVICE" -n 120 --no-pager || true
  exit 1
fi

if ! run_as_root systemctl is-active --quiet "$BACKEND_SERVICE"; then
  run_as_root systemctl status "$BACKEND_SERVICE" --no-pager -l || true
  run_as_root journalctl -u "$BACKEND_SERVICE" -n 120 --no-pager || true
  exit 1
fi

echo "Backend deployed on host with systemd."
