# KeepSpot MVP

手机端优先的物品位置与过期管理工具：上传真实空间图片，在图片上标记位置，拍照录入物品并设置过期提醒。

## 已实现的 MVP 闭环

1. Supabase 邮箱 OTP 登录。
2. 上传厨房、冰箱、柜子等空间图片。
3. 使用白色半透明毛玻璃层弱化背景。
4. 点击图片创建位置点。
5. 拍照上传物品图片。
6. 调用 Angus 适配器识别名称、生产日期、保质期和过期日期。
7. 识别失败时手动填写，不阻断保存。
8. 在空间图片上点击位置完成存放。
9. 一个位置展示最多 3 个物品缩略图和 `+N`。
10. Vercel Cron 每天检查，并使用 Resend 发送邮件提醒。
11. 将物品标记为已使用或已丢弃。

## 技术栈

- Next.js 16 App Router + TypeScript
- Tailwind CSS 4
- Supabase Auth、PostgreSQL、Storage、RLS
- Angus API 可替换适配器
- Vercel Cron
- Resend

## 1. 本地启动

```bash
cp .env.example .env.local
npm install
npm run dev
```

打开 `http://localhost:3000`。

未配置 Supabase 时，页面会显示配置提示，不会在构建阶段直接崩溃。


## Docker Compose 一键部署

项目已包含生产 Dockerfile、Compose 编排和轻量提醒调度容器。

```bash
cp .env.docker.example .env.docker
# 编辑 .env.docker 后
./scripts/docker-up.sh
```

完整说明见：[`docs/DOCKER_COMPOSE_DEPLOY.md`](docs/DOCKER_COMPOSE_DEPLOY.md)。

## 2. 初始化 Supabase

1. 新建 Supabase 项目。
2. 在 SQL Editor 中执行：

```text
supabase/migrations/001_initial.sql
```

迁移会创建：

- `spaces`
- `locations`
- `items`
- `reminder_logs`
- `user_settings`
- 私有 Storage Buckets：`space-images`、`item-images`
- 全部 RLS 策略和用户初始化触发器

3. 在 `.env.local` 中填写项目 URL、Publishable Key 和 Service Role Key。

## 3. 配置邮箱验证码

Supabase Auth 中启用 Email Provider。为了使用“输入验证码”的界面，需要把邮件模板配置为包含 OTP Token，例如：

```html
<p>你的登录验证码是：{{ .Token }}</p>
```

若继续使用默认 Magic Link 模板，需要将登录页面改为链接回调方式。

## 4. Angus API 模式

公开可见的 Angus 文档描述了 HTTPS、Basic Authentication、JSON 资源和 multipart Job 调用方式，但没有明确给出本产品所需的“包装 OCR + 日期结构化”服务名和输出结构。因此项目把 Angus 隔离在：

```text
src/lib/recognition/client.ts
src/lib/recognition/normalize.ts
```

支持三种模式：

### `mock`

默认模式。返回空草稿，完整测试手动录入流程。

```env
ANGUS_API_MODE=mock
```

### `generic-json`

向自定义地址 POST 签名图片 URL：

```env
ANGUS_API_MODE=generic-json
ANGUS_API_URL=https://your-angus-wrapper.example/analyze
ANGUS_CLIENT_ID=
ANGUS_CLIENT_SECRET=
```

请求体：

```json
{
  "imageUrl": "signed image url",
  "task": "Extract product name, production date, shelf life and expiry date from the package image.",
  "output": "json"
}
```

### `angus-rest`

使用 Angus 文档中的 multipart、Basic Auth、Service Job 形式：

```env
ANGUS_API_MODE=angus-rest
ANGUS_API_URL=https://gate.angus.ai
ANGUS_CLIENT_ID=...
ANGUS_CLIENT_SECRET=...
ANGUS_SERVICE_NAME=your_service_name
ANGUS_SERVICE_VERSION=1
```

拿到实际 API 文档后，通常只需调整 `client.ts` 的请求字段和 `normalize.ts` 的映射键。

## 5. 配置邮件和 Cron

开发阶段默认：

```env
REMINDER_DRY_RUN=true
```

Cron 会写提醒日志，但只打印邮件内容，不实际发送。

正式发送：

```env
REMINDER_DRY_RUN=false
RESEND_API_KEY=...
REMINDER_FROM_EMAIL=KeepSpot <reminders@your-domain.com>
CRON_SECRET=至少16位随机字符串
```

`vercel.json` 每天 `00:00 UTC` 调用：

```text
GET /api/cron/reminders
```

Vercel 会把 `CRON_SECRET` 作为 Bearer Authorization Header 发送。任务根据每个用户的 IANA 时区计算当地日期。

本地测试：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## 6. 部署 Vercel

1. 把项目推送至 GitHub。
2. 在 Vercel 导入仓库。
3. 配置 `.env.example` 中的环境变量。
4. 部署生产环境。
5. 在 Vercel Cron 页面确认 `/api/cron/reminders` 已创建。

## 7. 核心目录

```text
src/
├── app/                       页面与 Route Handlers
├── components/                手机端交互组件
├── lib/
│   ├── recognition/           Angus 适配和结果标准化
│   ├── supabase/              浏览器、服务端、管理员和 Proxy 客户端
│   ├── date.ts                日期计算与过期状态
│   ├── email.ts               Resend 邮件
│   └── storage.ts             私有图片读取与签名地址
└── types/                     领域类型
```

## 8. 测试

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

当前单元测试覆盖：

- 月末和闰年的保质期计算。
- 日历天差。
- 过期状态。
- Angus/OCR 字段标准化。

## 9. 已知 MVP 限制

- 每个空间是一张独立图片，不建立多级空间树。
- 位置点创建后不能拖动，只能删除后重新创建。
- 无条形码和商品数据库。
- 图片识别依赖实际 Angus 服务能力；Mock 模式下手动填写。
- Cron 单次最多查询 2000 个候选物品，规模扩大后应分页。
- 仅邮件提醒，没有 Web Push 或微信提醒。
