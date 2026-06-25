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

推荐把项目部署到类似 `/srv/makerhub` 的目录，然后执行：

```bash
git clone <你的仓库地址> /srv/makerhub
cd /srv/makerhub/backend
cp .env.example .env
```

安装 `uv` 并同步依赖：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

cd /srv/makerhub/backend
uv sync
uv run alembic upgrade head
```

启动前可以先手动验证：

```bash
cd /srv/makerhub/backend
uv run python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

仓库里提供了 `systemd` 模板文件 [backend/scripts/makerhub-backend.service](/Users/quinn/work/quinn-gaoo/MakerHub/backend/scripts/makerhub-backend.service)，按你的服务器实际用户和目录修改后执行：

```bash
sudo cp /srv/makerhub/backend/scripts/makerhub-backend.service /etc/systemd/system/makerhub-backend.service
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
