# 快速开始

安装 Ifx SDK，写出最小 Frame demo，再到 [浏览器](/explorer) 粘贴 wire 做离线校验。

## 选择语言

| SDK | 安装 | 示例 |
|-----|------|------|
| **TypeScript** | `npm install @ifx-run/sdk @solana/web3.js` | [sdk/examples](https://github.com/ifx-run/ifx/tree/main/sdk/examples) |
| **Go** | `go get github.com/ifx-run/ifx/go-sdk@v0.1.3` | [go-sdk/examples](https://github.com/ifx-run/ifx/tree/main/go-sdk/examples) |
| **Rust** | `cargo add ifx-sdk@0.1.3` | [rust-sdk/examples](https://github.com/ifx-run/ifx/tree/main/rust-sdk/examples) |

主网 program id（SDK 默认）：`ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj`。

## 最小示例（TypeScript）

```ts
import { Transaction } from "@solana/web3.js";
import { FrameScratch, DEFAULT_TAPE_LEN, expr } from "@ifx-run/sdk";

const scratch = new FrameScratch({ tapeLen: DEFAULT_TAPE_LEN });
const tx = new Transaction();

// 流程第一笔：create Frame（见 sdk/examples/minimal-frame.ts）
// 后续交易：scratch.reset() 再 let / assert / CPI
scratch.reset();
const balance = scratch.letLamports(/* remaining 账户下标 */ 0);
scratch.assert(expr.gte(balance, 1n));

tx.add(...scratch.ixs());
// 签名发送后，把 base64/base58 wire 贴到 https://ifx.run/explorer
```

完整可运行示例：[`minimal-frame.ts`](https://github.com/ifx-run/ifx/blob/main/sdk/examples/minimal-frame.ts)。

## 最小示例（Go）

```go
import ifx "github.com/ifx-run/ifx/go-sdk"

scratch := ifx.NewFrameScratch(ifx.DefaultTapeLen)
scratch.Reset()
// let / assert / 组装指令 — 见 go-sdk/examples
```

## 最小示例（Rust）

```rust
use ifx_sdk::FrameScratch;

let mut scratch = FrameScratch::new(/* tape_len */);
scratch.reset();
// let / assert / CPI — 见 rust-sdk/examples
```

## 下一步

1. [两跳 Swap（进阶）](./quick-start.two-hop-swap.zh-CN.md) — 读中间余额、patch 第二跳
2. [AI Skill](./quick-start.ai-skill.zh-CN.md) — Cursor / Agent 编排指南
3. [设计文档](./design.zh-CN.md) — 程序仓同步的深度参考
