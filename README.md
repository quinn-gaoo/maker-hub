# MakerHub

AI 创作者作品宣传站 MVP，采用前后端分离架构：

- `apps/web`: Next.js 15 + Auth.js 前端与 BFF
- `apps/api`: FastAPI + SQLAlchemy + Alembic 后端，项目图片上传到腾讯云 COS
- `packages/shared`: 前端共享常量

## 快速开始

1. 安装前端依赖

```bash
pnpm install
```

2. 安装后端依赖

```bash
uv sync --project apps/api
```

3. 配置环境变量

- 前端参考 [apps/web/.env.example](/Users/quinn/work/quinn-gaoo/MakerHub/apps/web/.env.example)
- 后端参考 [apps/api/.env.example](/Users/quinn/work/quinn-gaoo/MakerHub/apps/api/.env.example)

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
pnpm dev:web
pnpm dev:api
```

## 数据库

后端使用 Alembic 管理数据库结构：

```bash
uv run --project apps/api alembic upgrade head
```
