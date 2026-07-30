# FreshPin

FreshPin 是一个手机优先的 Web 应用，目标是帮助用户可靠回答三个问题：物品是什么、放在哪里、何时过期。

> 当前仓库包含可运行的基础原型和经过单元测试的领域能力；尚不是可供真实用户验收的完整 MVP。

## 当前可运行内容

- Next.js App Router、TypeScript、Tailwind CSS 与 Vitest 基础工程。
- 首页（`/`）和“我的空间”页面（`/spaces`），其中包含可访问的“返回首页”链接，以及可选择本地图片、添加命名位置标记的浏览器预览；刷新页面会清空预览数据。
- 坐标归一化、空间输入快照、过期日期计算、30 天会话策略和图片格式/真实解码校验等独立领域模块。
- 根节点对浏览器扩展预先修改 `<html>` 属性的 hydration 兼容处理。

## 当前明确未实现的内容

按当前决策，**暂不安装或接入 Supabase**。因此以下能力仍处于计划阶段，不能将原型误认为已具备这些功能：

- 邮箱 OTP、受保护路由和真实会话。
- 数据库持久化、RLS、私有图片 Storage 与上传 Route Handler。
- 空间/位置/物品的跨刷新保存与跨用户隔离。
- Angus 识别、Resend 邮件提醒、Cron 幂等和端到端验收。

## 本地运行与验证

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址，检查 `/` 与 `/spaces`。质量检查可分别运行：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`next build` 与正在运行的 `next dev` 共用构建目录，运行生产构建前应先停止开发服务器。

当前原型与完整 MVP 的验收边界见[验证矩阵](./docs/verification/prototype-acceptance-matrix.md)。

## 文档

- [MVP 架构决策](./docs/architecture/freshpin-mvp-architecture.md)
- [MVP 实施计划](./docs/plans/2026-07-29-freshpin-mvp-implementation-plan.md)
- [原始 MVP 产品与技术设计](./智能物品过期位置管理工具_MVP设计文档.md)

## 下一步

在允许接入 Supabase 后，按架构实现认证、迁移/RLS、私有 Storage 和 Route Handlers，再以完整的“登录 → 创建空间 → 标记位置 → 保存物品 → 提醒”链路进行集成与 E2E 验收。
