# MakerHub

AI 创作者作品宣传站 MVP，采用前后端分离架构。

## 项目结构

```text
.
├── backend/                # FastAPI + SQLAlchemy + Alembic
├── frontend/portal/        # 独立门户网站项目，Next.js 15
├── frontend/admin/         # 独立管理后台项目，Vite + TypeScript + React
└── package.json            # 仅保留少量后端辅助脚本
```

`frontend/portal` 和 `frontend/admin` 现在都是独立前端项目，各自维护自己的依赖、锁文件和启动命令，不再按 monorepo 或共享前端 workspace 的方式管理。

## 快速开始

1. 分别安装前端依赖

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

根目录现在只保留少量后端辅助脚本。前端的开发、构建、类型检查都应分别进入 `frontend/portal` 或 `frontend/admin` 执行。

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

邮箱注册验证码需要配置验证码签名密钥，以及用于发送邮件的 SMTP 配置：

```bash
EMAIL_VERIFICATION_SECRET=
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

第三方 OAuth 登录需要在后端配置 OAuth 应用信息和代理地址。后端会把 `code`、`client_id`、`client_secret` 发送给 portal 代理，由 portal 代理访问 Google/GitHub 换取用户信息：

```bash
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_PROXY_URL=http://localhost:3000/api/proxy/oauth
AUTH_PROXY_KEY=
```

portal 前端也需要配置同一个 `AUTH_PROXY_KEY`，并配置公开的 OAuth Client ID 用于发起第三方授权跳转。

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

- `cd backend && uv run python -m uvicorn app.main:app --reload`
- `pnpm run sync:backend`
- `pnpm run check:backend`
- `pnpm run test:backend`

前端项目请在各自目录里执行：

- `cd frontend/portal && pnpm dev`
- `cd frontend/portal && pnpm build`
- `cd frontend/portal && pnpm typecheck`
- `cd frontend/admin && pnpm dev`
- `cd frontend/admin && pnpm build`
- `cd frontend/admin && pnpm typecheck`

## 数据库

后端使用 Alembic 管理数据库结构：

```bash
cd backend
uv run alembic upgrade head
```

## 服务器部署后端

推荐把后端直接部署在服务器宿主机上运行，不放进 Docker。数据库可以是其他服务器上的 PostgreSQL，后端只会读取 `backend/.env` 里的 `DATABASE_URL` 连接数据库。项目可以放到任意目录，例如 `/www/wwwroot/maker-hub` 或 `~/maker-hub`。下面以 `/www/wwwroot/maker-hub` 为例：

```bash
git clone <你的仓库地址> /www/wwwroot/maker-hub
cd /www/wwwroot/maker-hub/backend
cp .env.example .env
```

编辑 `backend/.env`，至少填好 `DATABASE_URL`、`EMAIL_VERIFICATION_SECRET` 和 COS 配置。`DATABASE_URL` 就写你真实数据库地址：

```text
DATABASE_URL=postgresql+psycopg://用户名:密码@数据库地址:5432/数据库名
```

如果你确实想在当前服务器上额外启动一个 PostgreSQL，可以单独执行数据库 compose；使用外部数据库时不需要执行它：

```bash
cd /www/wwwroot/maker-hub
docker compose -f docker-compose.db.yml up -d
```

后端依赖 `uv`，服务器第一次部署前先安装：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
uv --version
```

仓库里提供了自动部署脚本 [backend/scripts/deploy_backend.sh](/Users/quinn/work/quinn-gaoo/MakerHub/backend/scripts/deploy_backend.sh)，会根据脚本所在位置自动定位当前项目目录，然后按固定流程执行：拉取代码、同步依赖、执行数据库迁移、重启 `maker-hub.service` 并做健康检查。

如果是新服务器初始化环境，可以先执行 [backend/scripts/init_backend_env.sh](/Users/quinn/work/quinn-gaoo/MakerHub/backend/scripts/init_backend_env.sh)，它会把仓库内的 `maker-hub.service` 和 `maker-hub.logrotate.example` 安装到系统对应位置，并完成 `daemon-reload`、开机自启和 logrotate 配置检查。

GitHub Actions 自动部署时不能输入 sudo 密码，所以部署用户需要配置免密 sudo。以 `github-deploy` 为例：

```bash
sudo visudo
```

加入：

```text
github-deploy ALL=(ALL) NOPASSWD: /bin/cp, /bin/systemctl, /usr/bin/systemctl, /usr/bin/journalctl
```

```bash
cd /www/wwwroot/maker-hub
sh backend/scripts/deploy_backend.sh
```

常用运维命令：

```bash
sudo systemctl status maker-hub.service --no-pager -l
sudo systemctl restart maker-hub.service
sudo journalctl -u maker-hub.service -f
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

部署前先确认服务器上的 `backend/.env` 已经从 [backend/.env.example](/Users/quinn/work/quinn-gaoo/MakerHub/backend/.env.example) 复制出来并填好必填项，尤其是 `DATABASE_URL`、`EMAIL_VERIFICATION_SECRET` 和 COS 配置。

也可以在服务器上单独执行同一个脚本：

```bash
cd /www/wwwroot/maker-hub
sh backend/scripts/deploy_backend.sh
```

可选环境变量：

```text
DEPLOY_BRANCH=main
SERVICE_NAME=maker-hub.service
```
