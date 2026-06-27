#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd -P)
BACKEND_DIR=$(CDPATH= cd "$SCRIPT_DIR/.." && pwd -P)

SERVICE_SOURCE=${SERVICE_SOURCE:-$SCRIPT_DIR/maker-hub.service}
SERVICE_TARGET=${SERVICE_TARGET:-/etc/systemd/system/maker-hub.service}
LOGROTATE_SOURCE=${LOGROTATE_SOURCE:-$SCRIPT_DIR/maker-hub.logrotate.example}
LOGROTATE_TARGET=${LOGROTATE_TARGET:-/etc/logrotate.d/maker-hub}
LOG_DIR=${LOG_DIR:-/var/log/maker-hub}

if [ ! -f "$SERVICE_SOURCE" ]; then
  echo "缺少 service 配置文件：$SERVICE_SOURCE" >&2
  exit 1
fi

if [ ! -f "$LOGROTATE_SOURCE" ]; then
  echo "缺少 logrotate 配置文件：$LOGROTATE_SOURCE" >&2
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "缺少 backend/.env，请先复制 backend/.env.example 为 backend/.env，并补全必填配置。" >&2
  exit 1
fi

echo "创建日志目录..."
sudo mkdir -p "$LOG_DIR"

echo "安装 systemd service 配置..."
sudo cp "$SERVICE_SOURCE" "$SERVICE_TARGET"

echo "安装 logrotate 配置..."
sudo cp "$LOGROTATE_SOURCE" "$LOGROTATE_TARGET"

echo "重新加载 systemd..."
sudo systemctl daemon-reload

echo "设置开机自启..."
sudo systemctl enable maker-hub.service

echo "检查 logrotate 配置..."
sudo logrotate -d "$LOGROTATE_TARGET"

echo "初始化完成。"
