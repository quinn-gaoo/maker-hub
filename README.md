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

推荐把项目部署到 `/www/wwwroot/maker-hub`，然后执行：

```bash
git clone <你的仓库地址> /www/wwwroot/maker-hub
cd /www/wwwroot/maker-hub/backend
cp .env.example .env
```

安装 `uv` 并同步依赖：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

cd /www/wwwroot/maker-hub/backend
uv sync
uv run alembic upgrade head
```

启动前可以先手动验证：

```bash
cd /www/wwwroot/maker-hub/backend
uv run python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

仓库里提供了 `systemd` 模板文件 [backend/scripts/makerhub-backend.service](/Users/quinn/work/quinn-gaoo/MakerHub/backend/scripts/makerhub-backend.service)，按你的服务器实际用户和目录修改后执行：

```bash
sudo cp /www/wwwroot/maker-hub/backend/scripts/makerhub-backend.service /etc/systemd/system/makerhub-backend.service
sudo systemctl daemon-reload
sudo systemctl enable makerhub-backend
sudo systemctl start makerhub-backend
sudo systemctl status makerhub-backend
```

常用运维命令：

```bash
sudo systemctl restart makerhub-backend
sudo journalctl -u makerhub-backend -f
```

## GitHub 自动部署

可以直接使用 [`.github/workflows/deploy-backend.yml`](/Users/quinn/work/quinn-gaoo/MakerHub/.github/workflows/deploy-backend.yml) 让 GitHub 在 `main` 分支更新后自动部署后端。

需要在仓库 Secrets 里配置：

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
DEPLOY_SSH_KEY_BASE64
DEPLOY_SSH_KEY_PASSPHRASE
DEPLOY_PORT
DEPLOY_PATH
```

服务器默认按 `/www/wwwroot/maker-hub/backend` 部署，`DEPLOY_PATH` 不填时会回落到 `/www/wwwroot/maker-hub`。工作流会登录服务器后调用 [backend/scripts/deploy_backend.sh](/Users/quinn/work/quinn-gaoo/MakerHub/backend/scripts/deploy_backend.sh)，脚本会执行 `git pull --ff-only`、`uv sync`、`uv run alembic upgrade head`，并把仓库里的 `makerhub-backend.service` 同步到 `/etc/systemd/system`，然后重启 `makerhub-backend`。

`DEPLOY_SSH_KEY` 里要放私钥原文，不要放 `.pub` 公钥，也不要包一层引号。常见格式是以 `-----BEGIN OPENSSH PRIVATE KEY-----` 或 `-----BEGIN RSA PRIVATE KEY-----` 开头的完整内容。

如果你担心换行被复制坏掉，可以改用 `DEPLOY_SSH_KEY_BASE64`，把私钥先转成一行 base64 再存进 Secret。

部署前先确认服务器上的 [backend/.env](/Users/quinn/work/quinn-gaoo/MakerHub/backend/.env.example) 已经从 `backend/.env.example` 复制出来并填好必填项，尤其是 `DATABASE_URL`、`INTERNAL_API_SIGNING_SECRET`、`AUTH_SESSION_SECRET` 和 COS 配置。

也可以在服务器上单独执行同一个脚本：

```bash
cd /www/wwwroot/maker-hub
sh backend/scripts/deploy_backend.sh
```

可选环境变量：

```text
DEPLOY_BRANCH=main
BACKEND_SERVICE=makerhub-backend
UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple
```
