# 仓库初始化与 README 设计

日期：2026-07-29

## 目标

为 FreshPin MVP 的设计仓库建立 Git 远程关联，并提供面向项目访客的入口 README。

## 决策

- 使用 `origin` 作为默认远程，地址为 `git@github.com:jmwasky-creative/FreshPin.git`。
- README 采用项目入口形式：说明产品目标、MVP 流程、技术规划、设计阶段状态与原始设计文档入口。
- README 不提供安装或运行命令，也不将规划中的功能描述为已交付。

## 验证方式

- `git remote -v` 应显示 `origin` 指向指定 GitHub SSH 地址。
- README 可链接到现有 MVP 设计文档。
