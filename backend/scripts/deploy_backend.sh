#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
BACKEND_DIR=$(CDPATH= cd "$SCRIPT_DIR/.." && pwd -P)
REPO_DIR=$(CDPATH= cd "$BACKEND_DIR/.." && pwd -P)
SERVICE_NAME=${SERVICE_NAME:-maker-hub.service}

DEPLOY_BRANCH=${DEPLOY_BRANCH:-main}
SKIP_GIT_PULL=${SKIP_GIT_PULL:-0}

cd "$REPO_DIR"

if [ "$SKIP_GIT_PULL" != "1" ]; then
  git fetch origin "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"
  git pull --ff-only origin "$DEPLOY_BRANCH"
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "未检测到 uv，请先安装 uv 并确保它已加入 PATH。" >&2
  exit 1
fi

cd "$BACKEND_DIR"

if [ ! -f ".env" ]; then
  echo "缺少 backend/.env，请先复制 backend/.env.example 为 backend/.env，并补全必填配置。" >&2
  exit 1
fi

# 4. 更新依赖
echo "更新依赖..."
uv sync

# 5. 运行数据库迁移（如果有）
echo "运行数据库迁移..."
uv run alembic upgrade head

# 6. 重启服务
echo "重启服务..."
sudo systemctl restart maker-hub.service

# 8. 等待服务启动
sleep 3

if ! sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "服务启动失败，以下是服务状态：" >&2
  sudo systemctl status "$SERVICE_NAME" --no-pager || true
  exit 1
fi

echo "开始健康检查..."
if ! curl -fsS http://127.0.0.1:8000/health >/dev/null; then
  echo "健康检查失败，以下是服务状态：" >&2
  sudo systemctl status "$SERVICE_NAME" --no-pager || true
  exit 1
fi

# # 7. 检查状态
# echo "检查服务状态..."
# sudo systemctl status maker-hub.service --no-pager


# 9. 健康检查（如果有健康检查端点）
echo "健康检查..."
curl -f http://localhost:8000/health || echo "健康检查失败！"

echo "=== 更新完成 ==="
