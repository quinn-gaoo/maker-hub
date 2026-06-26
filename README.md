# MakerHub

AI 创作者作品宣传站 MVP，采用前后端分离架构。

## 项目结构

```text
.
├── backend/                # FastAPI + SQLAlchemy + Alembic
├── frontend/
│   ├── portal/             # 独立门户网站项目，Next.js 15
│   ├── admin/              # 独立管理后台项目，Vite + TypeScript + React
│   └── components/         # 相对独立的共享 UI 组件包
└── package.json            # 仓库根目录脚本
```

`frontend/portal`、`frontend/admin`、`frontend/components` 都可以分别安装依赖和单独运行；`portal` 与 `admin` 通过本地 `file:../components` 依赖复用共享组件。

## 快速开始

1. 安装前端依赖

```bash
cd frontend/portal && pnpm install
cd frontend/admin && pnpm install
```

2. 初始化后端虚拟环境与依赖

```bash
cd backend
uv sync
```

或直接在仓库根目录运行：

```bash
pnpm run sync:backend
```

`pnpm run sync:backend` 默认会使用清华 PyPI 镜像和系统证书，适合国内网络环境。如需改回其他源，可以在执行前覆盖 `UV_DEFAULT_INDEX`。

3. 配置环境变量

- 门户前端参考 [frontend/portal/.env.example](/Users/quinn/work/quinn-gaoo/MakerHub/frontend/portal/.env.example)
- 后端参考 [backend/.env.example](/Users/quinn/work/quinn-gaoo/MakerHub/backend/.env.example)

后端图片上传当前使用腾讯云 COS，至少需要配置：

```bash
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=
COS_REGION=
COS_PUBLIC_BASE_URL=
```

如需启用邮箱注册验证码，还需要补充 SMTP 与验证码配置：

```bash
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_USE_TLS=true
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=MakerHub
EMAIL_VERIFICATION_CODE_PREFIX=MKH
EMAIL_VERIFICATION_CODE_LENGTH=6
EMAIL_VERIFICATION_CODE_TTL_MINUTES=10
EMAIL_VERIFICATION_CODE_COOLDOWN_SECONDS=60
```

4. 创建一个管理后台账号

部署到新环境时，推荐先创建一个管理员账号，再登录管理后台：

```bash
cd backend
uv run python scripts/create_admin_user.py --email admin@example.com --name "Site Admin" --force-role
```

如果你已经在 `backend/.env` 里配置了 `ADMIN_EMAILS`，也可以不加 `--force-role`。只要邮箱命中 `ADMIN_EMAILS`，登录后就会自动拥有管理后台权限。

5. 启动开发服务

```bash
cd frontend/portal && pnpm dev
cd frontend/admin && pnpm dev
cd backend && uv run python -m uvicorn app.main:app --reload
```

根目录 `package.json` 的常用脚本如下：

- `cd frontend/portal && pnpm dev`
- `cd frontend/admin && pnpm dev`
- `cd backend && uv run python -m uvicorn app.main:app --reload`
- `cd frontend/portal && pnpm install`
- `cd frontend/admin && pnpm install`
- `cd frontend/portal && pnpm build`
- `cd frontend/admin && pnpm build`
- `cd frontend/portal && pnpm typecheck`
- `cd frontend/admin && pnpm typecheck`
- `pnpm sync:backend`
- `pnpm check:backend`
- `pnpm test:backend`

## 数据库

后端使用 Alembic 管理数据库结构：

```bash
cd backend
uv run alembic upgrade head
```

## 服务器部署后端

推荐使用 Docker Compose 部署后端和 PostgreSQL，并把数据库和后端拆成两个 compose 文件。数据库低频执行，后端每次部署只更新后端服务。项目可以放到任意目录，例如 `/www/wwwroot/maker-hub` 或 `~/maker-hub`。下面以 `/www/wwwroot/maker-hub` 为例：

```bash
git clone <你的仓库地址> /www/wwwroot/maker-hub
cd /www/wwwroot/maker-hub/backend
cp .env.docker.example .env
```

编辑 `backend/.env`，至少填好 `INTERNAL_API_SIGNING_SECRET`、`AUTH_SESSION_SECRET` 和 COS 配置。使用 compose 自带 PostgreSQL 时，后端 compose 会默认使用下面这个容器内数据库地址：

```text
DATABASE_URL=postgresql+psycopg://postgres:postgres@postgres:5432/makerhub
```

如果要连接外部数据库，可以在执行部署脚本时通过服务器环境变量覆盖 `DATABASE_URL`。

如果服务器之前启过 systemd 版后端，第一次切换 Docker Compose 前建议先停掉旧服务，避免 8000 端口冲突：

```bash
sudo systemctl disable --now makerhub-backend || true
```

第一次部署或数据库需要维护时，单独启动数据库：

```bash
cd /www/wwwroot/maker-hub
docker compose -f docker-compose.db.yml up -d
```

仓库里提供了自动部署脚本 [backend/scripts/deploy_backend.sh](/Users/quinn/work/quinn-gaoo/MakerHub/backend/scripts/deploy_backend.sh)，会根据脚本所在位置自动定位当前项目目录，然后只执行后端 compose。后端服务使用公开的 `python:3.14-slim` 镜像，并把本地 `backend` 目录挂载到容器 `/app`；容器启动时会先安装 `uv`，再自动同步依赖并执行 Alembic 迁移：

```bash
cd /www/wwwroot/maker-hub
sh backend/scripts/deploy_backend.sh
```

常用运维命令：

```bash
docker compose -f docker-compose.db.yml ps
docker compose -f docker-compose.backend.yml ps
docker compose -f docker-compose.backend.yml logs -f backend
docker compose -f docker-compose.backend.yml restart backend
```

## GitHub 自动部署

可以直接使用 [`.github/workflows/deploy-backend.yml`](/Users/quinn/work/quinn-gaoo/MakerHub/.github/workflows/deploy-backend.yml) 让 GitHub 在 `main` 分支更新后自动部署后端。

需要在仓库 Secrets 里配置：

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
DEPLOY_WORKDIR
```

工作流只负责登录服务器，然后进入 `DEPLOY_WORKDIR` 并执行当前目录下的 `backend/scripts/deploy_backend.sh`。脚本会从自身位置自动定位当前仓库，不需要在脚本里写死 `/www/wwwroot/maker-hub` 这类路径。例如：

```text
DEPLOY_WORKDIR=/www/wwwroot/maker-hub
```

`DEPLOY_SSH_KEY` 里要放私钥原文，不要放 `.pub` 公钥，也不要包一层引号。常见格式是以 `-----BEGIN OPENSSH PRIVATE KEY-----` 或 `-----BEGIN RSA PRIVATE KEY-----` 开头的完整内容。

部署前先确认服务器上的 `backend/.env` 已经从 [backend/.env.docker.example](/Users/quinn/work/quinn-gaoo/MakerHub/backend/.env.docker.example) 复制出来并填好必填项，尤其是 `DATABASE_URL`、`INTERNAL_API_SIGNING_SECRET`、`AUTH_SESSION_SECRET` 和 COS 配置。

也可以在服务器上单独执行同一个脚本：

```bash
cd /www/wwwroot/maker-hub
sh backend/scripts/deploy_backend.sh
```

可选环境变量：

```text
DEPLOY_BRANCH=main
COMPOSE_FILE=docker-compose.backend.yml
BACKEND_SERVICE=backend
```
