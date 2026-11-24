# AI Skill（Cursor / Agent）

Ifx 编排有不少坑（两笔交易的 Frame、Structured vs Raw CPI、packet v0/v1、bundles）。让 Agent 改 swap / 结算交易前，先挂上 **ifx-orchestration** skill。

## 安装

| 场景 | 做法 |
|------|------|
| **程序本仓** | [`.cursor/skills/ifx-orchestration/`](https://github.com/ifx-run/ifx/tree/main/.cursor/skills/ifx-orchestration) 在 Cursor 中自动加载 |
| **你的应用仓** | 把该目录拷进 `.cursor/skills/`，或把 skill 路径 / URL 写进 Agent 提示词 |

Skill 目录内还有：

- `scenarios.md` — L0–L3 模板
- `anti-patterns.md` — 审查清单

## 何时用 Skill

- Agent 在编写或审查 Ifx `let` / `if_else` / patched CPI
- 选择 Structured vs RawPatched vs static CPI
- 决定 legacy/v0 vs v1 packet 或是否用 Jito bundle

## 何时手写

- 最小 Frame 冒烟（[快速开始](./quick-start.zh-CN.md)）
- 照抄已验证示例、不改策略

## 相关

- [快速开始](./quick-start.zh-CN.md)
- [两跳 Swap](./quick-start.two-hop-swap.zh-CN.md)
- 程序仓 README「Cursor / AI agents」一节
