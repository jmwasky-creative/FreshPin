# 根节点 Hydration 兼容设计

## 背景

`/spaces` 的开发环境中，客户端 `<html>` 在 React 水合前多出了
`tongyi-design-pc`、`data-theme` 和内联 `color-scheme`。仓库的根布局只输出
`lang="zh-CN"`，因此差异来自浏览器扩展，而不是服务端渲染逻辑。

## 方案比较

1. 停用扩展或使用无痕窗口：可完全避免外部 DOM 修改，但不能保护使用该扩展的开发者。
2. 在根 `<html>` 加 `suppressHydrationWarning`：只忽略该元素一层的已知属性差异，保留其余 React 水合检查。采用此方案。
3. 将扩展写入的 class、data 属性和样式写入应用：会把第三方状态错误地固化到 SSR 输出中，不采用。

## 边界与验证

只改 `src/app/layout.tsx` 的根元素，不改主题数据、客户端组件或服务器数据流。新增测试直接验证根 React 元素声明了该兼容标记；随后运行定向测试、类型检查和生产构建。无扩展浏览器刷新 `/spaces` 仍是根因的独立确认方式。
