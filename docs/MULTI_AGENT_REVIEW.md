# 多角色开发审查记录

本项目按多角色工作流拆分并合并，所有角色输出最终进入同一代码仓库。

## Agent A：产品范围

- 保留空间图片、位置点、物品录入、日期补录、位置绑定、提醒六条必要能力。
- 删除空间树、拖拽框选、家庭共享、条形码、智能菜谱和复杂动画。
- 使用三步物品录入向导降低手机操作成本。

## Agent B：数据与安全

- 五张业务表全部启用 RLS。
- 图片使用私有 Storage Bucket，不存永久公开 URL。
- 上传路径以用户 UUID 开头，Storage Policy 校验所有权。
- Angus、Resend、Service Role 和 Cron 密钥均为服务端变量。

## Agent C：前端体验

- 手机端单列布局。
- 空间图使用 CSS 白色毛玻璃，不生成重复处理图片。
- 坐标保存为比例值，适配不同屏幕。
- 同位置超过 3 件显示 `+N`，点击打开 Bottom Sheet。
- 识别失败始终可手动继续。

## Agent D：服务端与外部集成

- Next.js Route Handlers 作为轻量 Serverless 后端。
- Angus 使用 Provider Adapter，支持 Mock、Generic JSON 和 REST Job。
- 日期以用户确认值为最高优先级。
- Cron 使用提醒日志唯一约束实现幂等。

## Agent E：质量与发布

- 核心日期逻辑和识别标准化附带单元测试。
- 环境未配置时显示 Setup 页面，避免导入阶段失败。
- README 包含 Supabase、OTP、Angus、Resend、Cron 和 Vercel 部署步骤。
- 正式上线前仍需在真实 Supabase 与 Angus 账号上执行集成测试。
