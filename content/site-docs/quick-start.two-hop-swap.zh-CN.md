# 两跳 Swap（进阶）

目标：在一笔编排流程里做 A → USDC → B——**在链上读取中间 token 余额**，再 **patch 第二跳**，让第二腿用真实数量（而不是过期的 RPC quote）。

## 模式

1. **无条件模板** — 每一跳的 venue 指令（池子账户 / ix 字节由 builder 负责）。
2. **`ifx_let`** — 读第一跳产出（如 SPL amount / account data slice）。
3. 需要时在 Frame tape 上做 **数学 / 类型收窄**（`asU64` 等）。
4. **Patched CPI** — 官方 SPL/System 用 Structured；DEX 布局用 **RawPatched**（`data_offset` + `$N`）。
5. 可选 **`ifx_if_else`** — 余额不足时 skip / revert。

注册表能覆盖的指令优先 Structured；DEX / 自定义布局用 Raw（[Raw CPI patch](./raw-cpi-patches.zh-CN.md)）。

## 参考示例

| 语言 | 示例 |
|------|------|
| TypeScript | [`two-hop-token-swap.ts`](https://github.com/ifx-run/ifx/blob/main/sdk/examples/two-hop-token-swap.ts) |

Venue demo（集成方自有，不在核心 SDK 内）：

- [ifx-pumpfun-ext](https://github.com/ifx-run/ifx-pumpfun-ext)（TS）
- [ifx-raydium-ext](https://github.com/ifx-run/ifx-raydium-ext)（Rust）
- [ifx-launchpad-orchestrator](https://github.com/ifx-run/ifx-launchpad-orchestrator)（Go）

## 在浏览器里核对

组好交易后，把 wire 贴进 [浏览器](/explorer)。RawPatched 步骤在文字解释下方会显示 **字节 patch 图**（偏移 → `$N`）。

## 相关

- [快速开始](./quick-start.zh-CN.md)
- [AI Skill](./quick-start.ai-skill.zh-CN.md)
- [结构化 CPI](./structured-cpi-patches.zh-CN.md) · [Raw CPI](./raw-cpi-patches.zh-CN.md)
