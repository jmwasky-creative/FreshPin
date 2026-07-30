# FreshPin 当前原型验收矩阵

日期：2026-07-30

本矩阵区分“当前可由仓库证据验证的基础原型”与“需要 Supabase 后端闭环才能验收的 MVP”。单元测试不替代认证、RLS 或持久化的集成证据。

| 验收项 | 当前状态 | 证据/验证方式 |
| --- | --- | --- |
| 首页与 `/spaces` 可访问 | 已验证 | 启动 `npm run dev` 后访问两个路由；对应页面测试覆盖文案与导航。 |
| 非首页可返回首页 | 已验证 | `AppHeader` 使用目标为 `/`、可访问名称为“返回首页”的 `Link`；页面和组件测试覆盖。 |
| 浏览器扩展修改根 `<html>` 时的 hydration 兼容 | 代码契约已验证；仍需浏览器手测 | 根元素声明 `suppressHydrationWarning`，`layout.test.tsx` 覆盖；在启用与停用通义设计类扩展的浏览器配置中刷新 `/spaces`。 |
| 位置坐标归一化与 marker 比例渲染 | 单元级验证 | `coordinates.test.ts`、`space-canvas.test.tsx` 覆盖边界、键盘操作和不同显示尺寸；尚未连接到持久化空间页面。 |
| 过期日期与状态规则 | 单元级验证 | `expiry.test.ts` 覆盖日期优先级、月末计算和无效输入。 |
| 图片格式预筛与真实解码 | 单元级验证 | `image-upload.test.ts` 与 `server-image-validation.test.ts` 覆盖伪造/损坏图像拒绝与有效图像；尚未接入上传 Route Handler。 |
| 30 天会话策略 | 纯函数验证 | `session-policy.test.ts`；不代表真实 OTP 或受保护路由已经存在。 |
| 认证、受保护路由和用户隔离 | 未实现 | 需要 Supabase Auth、服务器会话派生、Route Handler 与 RLS 集成测试。 |
| 空间/位置/物品持久化与私有图片 | 未实现 | 需要数据库迁移、Storage 策略、签名 URL 和 API 集成测试。 |
| 识别确认与失败时手填 | 未实现 | 需要服务器端 Angus 客户端、确认页和路由测试。 |
| 临期提醒与同日幂等 | 未实现 | 需要提醒日志唯一约束、Cron 路由、Resend 与集成测试。 |
| 完整跨 viewport 用户流程 | 未实现 | 需要登录、真实数据存储和 Playwright E2E。 |

## 当前质量门槛

在停止 `next dev` 后运行：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

当前提交前已独立验证定向 ESLint、TypeScript 和完整 Vitest 套件。生产构建不能与正在运行的开发服务器共享 `.next` 构建锁；应在该服务器停止后重新运行，作为发布前门禁的一部分。

## 完整 MVP 的最低验收证据

在 Supabase 获准接入后，至少需要证明：

1. 未登录访问被拒绝，且第 30 天会话上限后必须重新认证。
2. 两个用户无法读取、写入或获得对方的空间、位置、物品和私有图片。
3. 合法图片可创建空间，伪造、损坏或不合规图片在入库前被拒绝。
4. 创建的位置在页面重载和不同 viewport 中仍指向相同图像位置。
5. 识别失败时用户仍可手动确认并保存物品。
6. 同一物品、提醒类型和本地日期最多发送一封邮件，并可从失败状态恢复。
