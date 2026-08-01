# KeepSpot Docker Compose 一键部署文档

本文用于在 Linux 服务器、NAS、云主机或本地电脑上，通过 Docker Compose 部署 KeepSpot MVP。

Docker 模式会启动两个轻量容器：

```text
手机浏览器
   ↓
freshpin-app（Next.js，端口 3000）
   ↓
Supabase / Angus / Resend（外部服务）

freshpin-reminder-scheduler
   ↓ 每小时调用一次
/api/cron/reminders
```

> Docker Compose 负责运行 Web 应用和轻量提醒调度器。Supabase 数据库、认证和图片存储仍使用 Supabase 云服务，不在本机启动一整套 Supabase，从而保持部署轻量。

---

## 1. 前置条件

服务器需要安装：

- Docker Engine 24 或更高版本。
- Docker Compose V2。
- 可访问 Supabase、Angus 和 Resend 的网络。
- 至少 1 GB 可用内存，建议 2 GB。

检查版本：

```bash
docker --version
docker compose version
```

---

## 2. 获取项目

解压源码后进入项目目录：

```bash
cd keepspot-mvp
```

项目中已经包含：

```text
Dockerfile
Dockerfile（Next.js standalone 生产镜像）
docker-compose.yml
.env.docker.example
scripts/docker-up.sh
scripts/docker-down.sh
scripts/cron-runner.mjs
```

---

## 3. 初始化 Supabase

在 Supabase 创建一个项目，然后进入 SQL Editor，执行：

```text
supabase/migrations/001_initial.sql
supabase/migrations/002_invite_auth.sql
```

该脚本会创建：

- `spaces`
- `locations`
- `items`
- `reminder_logs`
- `user_settings`
- `space-images` 私有图片桶
- `item-images` 私有图片桶
- Row Level Security 策略
- 新用户初始化触发器

在 Supabase 项目设置中获取：

1. Project URL。
2. Publishable Key。
3. Service Role Key。

Service Role Key 权限较高，只能写入服务器环境变量，不能提交到 Git，也不能放入前端代码。

### 配置邮箱验证回调

在 Supabase Auth 中启用 Email Provider 并开启 **Confirm email**。在 URL Configuration 设置 Site URL，并将部署域名的 `/auth/confirm` 加到 Redirect URLs，例如：

```text
http://localhost:3000/auth/confirm
https://your-domain.example/auth/confirm
```

---

## 4. 创建部署环境变量

复制模板：

```bash
cp .env.docker.example .env.docker
```

编辑文件：

```bash
nano .env.docker
```

最少需要填写：

```env
APP_PORT=3000
NEXT_PUBLIC_APP_NAME=KeepSpot

NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的_Publishable_Key
SUPABASE_SERVICE_ROLE_KEY=你的_Service_Role_Key

ADMIN_EMAIL=管理员真实邮箱
ADMIN_BOOTSTRAP_SECRET=至少32位随机字符串

CRON_SECRET=一段至少32位的随机字符串

ANGUS_API_MODE=mock
REMINDER_DRY_RUN=true
```

生成随机 `CRON_SECRET`：

```bash
openssl rand -hex 32
```

### 初始化管理员并管理邀请码

容器启动后，执行一次受保护的初始化请求：

```bash
set -a; . ./.env.docker; set +a
curl -X POST http://localhost:${APP_PORT:-3000}/api/admin/bootstrap \
  -H "Authorization: Bearer $ADMIN_BOOTSTRAP_SECRET"
```

管理员用 `ADMIN_EMAIL` 和初始密码 `112233` 登录，随后必须修改密码。成功后删除 `.env.docker` 中的 `ADMIN_BOOTSTRAP_SECRET`，重新运行 `./scripts/docker-up.sh`。登录后在 `/admin/invites` 生成一次性邀请码。

### Angus 模式

第一阶段可使用 Mock 模式，完整测试手动录入流程：

```env
ANGUS_API_MODE=mock
```

接入实际识别接口后，可改为：

```env
ANGUS_API_MODE=generic-json
ANGUS_API_URL=https://你的识别接口/analyze
ANGUS_CLIENT_ID=...
ANGUS_CLIENT_SECRET=...
```

或者：

```env
ANGUS_API_MODE=angus-rest
ANGUS_API_URL=https://gate.angus.ai
ANGUS_CLIENT_ID=...
ANGUS_CLIENT_SECRET=...
ANGUS_SERVICE_NAME=...
ANGUS_SERVICE_VERSION=1
```

### 邮件提醒

先使用演练模式：

```env
REMINDER_DRY_RUN=true
```

该模式会执行提醒逻辑和写入提醒日志，但不真正发送邮件。

正式发送时配置：

```env
REMINDER_DRY_RUN=false
RESEND_API_KEY=re_xxxxxxxxx
REMINDER_FROM_EMAIL=KeepSpot <reminders@你的域名.com>
```

发件域名需要先在 Resend 中完成验证。

---

## 5. 一键启动

填写好 `.env.docker` 后执行：

```bash
./scripts/docker-up.sh
```

脚本会自动：

1. 检查环境变量文件是否存在。
2. 检查是否仍有模板占位符。
3. 构建 Next.js 生产镜像。
4. 启动 Web 应用容器。
5. 等待健康检查通过。
6. 启动轻量提醒调度容器。
7. 输出容器运行状态。

也可以直接使用 Docker Compose：

```bash
docker compose --env-file .env.docker up -d --build
```

启动完成后访问：

```text
http://服务器IP:3000
```

修改端口：

```env
APP_PORT=8080
```

然后访问：

```text
http://服务器IP:8080
```

---

## 6. 验证部署

查看容器：

```bash
docker compose --env-file .env.docker ps
```

正常情况下应看到：

```text
keepspot-app                  healthy
keepspot-reminder-scheduler   running
```

检查健康接口：

```bash
curl http://127.0.0.1:3000/api/health
```

预期返回：

```json
{
  "status": "ok",
  "service": "keepspot-mvp"
}
```

查看应用日志：

```bash
docker compose --env-file .env.docker logs -f app
```

查看提醒任务日志：

```bash
docker compose --env-file .env.docker logs -f reminder-scheduler
```

---

## 7. 轻量提醒任务说明

Docker 部署不使用 Vercel Cron，而是使用单独的 Node 容器：

```text
keepspot-reminder-scheduler
```

它不会运行数据库、Redis、消息队列或完整任务框架，只会定时向应用内部接口发送 HTTP 请求：

```text
GET http://app:3000/api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

默认每 60 分钟执行一次：

```env
CRON_INTERVAL_MINUTES=60
```

提醒接口会：

- 按用户时区计算当地日期。
- 检查物品是否达到提醒节点。
- 使用数据库唯一约束防止重复发送。
- 跳过已使用、已丢弃和日期未知的物品。

因此每小时检查一次不会造成重复提醒。

容器启动后默认立即检查一次：

```env
RUN_CRON_ON_START=true
```

不希望启动时立即执行，可设置：

```env
RUN_CRON_ON_START=false
```

### 手动执行提醒任务

```bash
set -a
. ./.env.docker
set +a
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://127.0.0.1:${APP_PORT:-3000}/api/cron/reminders
```

---

## 8. 停止与重新启动

停止并删除容器：

```bash
./scripts/docker-down.sh
```

或者：

```bash
docker compose --env-file .env.docker down
```

重新启动：

```bash
docker compose --env-file .env.docker restart
```

仅重启应用：

```bash
docker compose --env-file .env.docker restart app
```

---

## 9. 更新版本

拉取或覆盖新代码后执行：

```bash
./scripts/docker-up.sh
```

脚本会重新构建镜像并替换容器。

不使用缓存重新构建：

```bash
docker compose --env-file .env.docker build --no-cache app
docker compose --env-file .env.docker up -d
```

清理未使用镜像：

```bash
docker image prune -f
```

---

## 10. 修改公开环境变量

以下变量会进入浏览器构建产物：

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_NAME
```

修改这些变量后，不能只重启容器，必须重新构建：

```bash
./scripts/docker-up.sh
```

以下服务端变量修改后通常只需重新创建或重启容器：

```env
SUPABASE_SERVICE_ROLE_KEY
ANGUS_API_MODE
ANGUS_API_URL
ANGUS_CLIENT_ID
ANGUS_CLIENT_SECRET
ANGUS_SERVICE_NAME
ANGUS_SERVICE_VERSION
CRON_SECRET
RESEND_API_KEY
REMINDER_FROM_EMAIL
REMINDER_DRY_RUN
```

为了避免配置不一致，统一执行 `./scripts/docker-up.sh` 最安全。

---

## 11. HTTPS 与域名

生产环境不建议直接暴露 `3000` 端口，应在前面增加已有的 Nginx、Caddy、Traefik 或云服务负载均衡器。

反向代理目标：

```text
http://127.0.0.1:3000
```

Nginx 示例：

```nginx
server {
    listen 80;
    server_name keepspot.example.com;

    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置 HTTPS 后，在 Supabase Auth 的 URL Configuration 中设置：

```text
Site URL: https://keepspot.example.com
```

并把该域名加入允许的 Redirect URLs。

---

## 12. 数据备份

业务数据和图片存储在 Supabase，不存储在 Docker 容器中。因此：

- 删除或重建应用容器不会删除业务数据。
- 备份应在 Supabase 中完成。
- `.env.docker` 应安全备份，但不能提交到公共代码仓库。

建议定期：

- 导出 PostgreSQL 数据。
- 检查 Storage 容量。
- 轮换 Service Role Key、Angus Key、Resend Key 和 `CRON_SECRET`。

---

## 13. 常见问题

### 13.1 构建时报 Supabase 配置缺失

确认 `.env.docker` 中已经填写：

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

并通过以下命令启动：

```bash
docker compose --env-file .env.docker up -d --build
```

### 13.2 登录邮件只有链接，没有验证码

修改 Supabase 邮件模板，使用：

```html
{{ .Token }}
```

### 13.3 图片上传失败

检查：

- 是否执行 `001_initial.sql`。
- Storage 中是否存在 `space-images` 和 `item-images`。
- RLS 策略是否创建成功。
- 单张图片是否超过 5 MB。

### 13.4 调度容器反复报 401

确保应用和调度器读取的是同一个：

```env
CRON_SECRET
```

修改后重新执行：

```bash
./scripts/docker-up.sh
```

### 13.5 邮件没有发送

检查：

```env
REMINDER_DRY_RUN=false
RESEND_API_KEY=...
REMINDER_FROM_EMAIL=已验证域名的邮箱
```

再查看日志：

```bash
docker compose --env-file .env.docker logs -f reminder-scheduler app
```

### 13.6 Angus 没有返回识别结果

`ANGUS_API_MODE=mock` 本来就只测试手动录入。

接入真实接口后，需要根据真实 Angus 请求和返回结构调整：

```text
src/lib/recognition/client.ts
src/lib/recognition/normalize.ts
```

---

## 14. 最简部署命令汇总

```bash
cd keepspot-mvp
cp .env.docker.example .env.docker
nano .env.docker
./scripts/docker-up.sh
```

访问：

```text
http://服务器IP:3000
```

查看日志：

```bash
docker compose --env-file .env.docker logs -f
```

停止：

```bash
./scripts/docker-down.sh
```
