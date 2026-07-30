# MVP 实现状态

## 已完成

- [x] Next.js 手机端页面骨架
- [x] Supabase Email OTP 登录
- [x] 空间图片上传
- [x] 白色毛玻璃显示层
- [x] 图片点击位置点
- [x] 位置点比例坐标存储
- [x] 物品拍照与浏览器压缩
- [x] Angus Provider Adapter
- [x] OCR/结构化结果标准化
- [x] 识别失败手动录入
- [x] 生产日期 + 保质期计算过期日
- [x] 日期冲突提示
- [x] 图片选择存放位置
- [x] 位置物品缩略图和 +N 聚合
- [x] Bottom Sheet 物品列表
- [x] 标记已使用/已丢弃
- [x] Vercel Cron
- [x] Resend 邮件提醒
- [x] 提醒幂等与失败重试
- [x] Supabase RLS 和私有 Storage
- [x] 日期与识别解析测试

## 需要你的账号配置后验证

- [ ] Supabase 项目和数据库迁移
- [ ] Supabase OTP 邮件模板
- [ ] Angus 实际 OCR 服务名、端点和响应字段
- [ ] Resend 已验证发件域名
- [ ] Vercel 生产环境变量
- [ ] 真机相机与 iOS/Android 浏览器测试
- [ ] Vercel 生产 Cron 实际触发

## 当前交付性质

这是完整的 MVP 源码首版和部署骨架。由于生成环境无法从 npm Registry 下载项目依赖，已完成语法扫描、内部类型扫描、导入路径检查和核心逻辑测试，但未在本环境执行真实 Next.js production build。配置账号后，应依次运行：

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## Docker Compose 部署补充

已增加：

- `Dockerfile`：Next.js standalone 多阶段生产镜像。
- `docker-compose.yml`：应用与轻量提醒调度器。
- `.env.docker.example`：Docker 环境变量模板。
- `scripts/docker-up.sh`：一键构建并启动。
- `scripts/docker-down.sh`：停止服务。
- `scripts/cron-runner.mjs`：无 Redis、无消息队列的轻量定时调用器。
- `src/app/api/health/route.ts`：容器健康检查。
- `docs/DOCKER_COMPOSE_DEPLOY.md`：完整部署和运维文档。

当前执行环境未安装 Docker，因此未实际构建镜像；Compose YAML、Shell、Node 脚本和项目文件引用已完成静态检查。
