# MakerHub

AI 创作者作品宣传站 MVP，采用前后端分离架构：

- `apps/frontend/portal`: 门户网站，Next.js 15
- `apps/frontend/admin`: 管理后台，Vite + TypeScript + React
- `apps/backend`: FastAPI + SQLAlchemy + Alembic 后端，项目图片上传到腾讯云 COS
- `packages/shared`: 前端共享常量
- `packages/ui`: 共享 shadcn UI 基础组件

## 快速开始

1. 安装前端依赖

```bash
pnpm install
```

2. 初始化后端虚拟环境与依赖

```bash
cd apps/backend
uv sync
```

或直接在仓库根目录运行：

```bash
pnpm run sync:backend
```

3. 配置环境变量

- 门户前端参考 [apps/frontend/portal/.env.example](/Users/quinn/work/quinn-gaoo/MakerHub/apps/frontend/portal/.env.example)
- 后端参考 [apps/backend/.env.example](/Users/quinn/work/quinn-gaoo/MakerHub/apps/backend/.env.example)

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

4. 启动开发服务

```bash
pnpm dev:portal
pnpm dev:admin
pnpm dev:backend
```

## 数据库

后端使用 Alembic 管理数据库结构：

```bash
cd apps/backend
./.venv/bin/alembic upgrade head
```
