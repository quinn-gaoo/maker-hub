#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
BACKEND_DIR=$(CDPATH= cd "$SCRIPT_DIR/.." && pwd -P)
REPO_DIR=$(CDPATH= cd "$BACKEND_DIR/.." && pwd -P)

DEPLOY_BRANCH=${DEPLOY_BRANCH:-main}
COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.backend.yml}
BACKEND_SERVICE=${BACKEND_SERVICE:-backend}
HEALTH_TIMEOUT_SECONDS=${HEALTH_TIMEOUT_SECONDS:-180}
SKIP_GIT_PULL=${SKIP_GIT_PULL:-0}

docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE" "$@"
  else
    echo "Docker Compose is not installed. Install Docker Compose v2 first." >&2
    exit 1
  fi
}

cd "$REPO_DIR"
if [ "$SKIP_GIT_PULL" != "1" ]; then
  git fetch origin "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"
  git pull --ff-only origin "$DEPLOY_BRANCH"
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "Missing backend/.env. Copy backend/.env.docker.example or backend/.env.example to backend/.env and fill required values first." >&2
  exit 1
fi

docker_compose up -d

container_id=$(docker_compose ps -q "$BACKEND_SERVICE")
if [ -z "$container_id" ]; then
  docker_compose logs --tail=120 "$BACKEND_SERVICE" || true
  exit 1
fi

elapsed=0
while [ "$elapsed" -lt "$HEALTH_TIMEOUT_SECONDS" ]; do
  health_status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)
  if [ "$health_status" = "healthy" ] || [ "$health_status" = "running" ]; then
    echo "Backend deployed with Docker Compose."
    exit 0
  fi

  sleep 3
  elapsed=$((elapsed + 3))
done

docker_compose ps
docker_compose logs --tail=120 "$BACKEND_SERVICE" || true
echo "Backend container did not become healthy within ${HEALTH_TIMEOUT_SECONDS}s." >&2
exit 1

echo "Backend deployed with Docker Compose."
