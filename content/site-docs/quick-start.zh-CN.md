# 快速开始

安装 Ifx SDK，按 **两笔交易** 走通 Frame（先 create 一次 → 业务笔以 `ixReset` 开头），再到 [浏览器](/explorer) 粘贴 wire 做离线校验。

请锁定 **`0.1.3`**。省略 `programId` 时默认打 **主网**（`ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj`）。Localnet / Devnet 请显式传入 `IFX_LOCALNET_PROGRAM_ID` / `IFX_DEVNET_PROGRAM_ID`。

## 选择语言

| SDK | 安装 | 示例 |
|-----|------|------|
| **TypeScript** | `npm i @ifx-run/sdk@0.1.3 @solana/web3.js` | [sdk/examples](https://github.com/ifx-run/ifx/tree/main/sdk/examples) |
| **Go** | `go get github.com/ifx-run/ifx/go-sdk@v0.1.3` | [go-sdk/examples](https://github.com/ifx-run/ifx/tree/main/go-sdk/examples) |
| **Rust** | `cargo add ifx-sdk@0.1.3` | [rust-sdk](https://github.com/ifx-run/ifx/tree/main/rust-sdk) |

## 固定形态（三语言相同）

1. **Tx 1（一次性）：** `planPublicFrame` / `PlanPublicFrame` / `plan_public_frame` → 发送 `ixCreate`。持久化 Frame 公钥与 `tapeLen`。
2. **Tx 2+（业务）：** 用 `forPublicFrame` 重建 planner（或同进程复用 scratch）→ **先 `ixReset`** → 再 `let` / `assert` / CPI。不要把 `create_frame` 塞进业务交易。

完整可跑 TS：[`minimal-frame.ts`](https://github.com/ifx-run/ifx/blob/main/sdk/examples/minimal-frame.ts)。Go 冒烟：[`minimal_test.go`](https://github.com/ifx-run/ifx/blob/main/go-sdk/examples/minimal_test.go)。Rust localnet：[`rust-sdk/tests/localnet.rs`](https://github.com/ifx-run/ifx/blob/main/rust-sdk/tests/localnet.rs)。

## 最小示例（TypeScript）

在已有 **公共 Frame** 上的业务交易（create 另笔 — 见上方示例文件）：

```ts
import { PublicKey, Transaction } from "@solana/web3.js";
import { DEFAULT_TAPE_LEN, expr, FrameScratch } from "@ifx-run/sdk";

// 已有公共 Frame PDA（来自 planPublicFrame / 你的配置）
const scratch = FrameScratch.forPublicFrame({
  framePubkey: new PublicKey("Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu"),
  tapeLen: DEFAULT_TAPE_LEN, // 主网公共池常用 1024
  // localnet: programId: IFX_LOCALNET_PROGRAM_ID
});

const tx = new Transaction();
tx.add(scratch.ixReset());
const one = scratch.letConstU64(1);
tx.add(scratch.ixLet(one));
tx.add(scratch.ixAssert(expr.nonZero(one)));
// 签名发送后，把 base64/base58 wire 贴到 https://ifx.run/explorer
```

一次性 create（与示例文件同流程）：

```ts
import { randomBytes } from "crypto";
import { FrameScratch, DEFAULT_TAPE_LEN } from "@ifx-run/sdk";

const { scratch, ixCreate, frame } = FrameScratch.planPublicFrame({
  payer, // PublicKey
  frameId: randomBytes(32),
  tapeLen: DEFAULT_TAPE_LEN,
});
// 发送含 ixCreate 的 Transaction；持久化 `frame` + tapeLen 供业务交易使用
```

## 最小示例（Go）

```go
import (
	"github.com/gagliardetto/solana-go"
	"github.com/ifx-run/ifx/go-sdk/constants"
	"github.com/ifx-run/ifx/go-sdk/expr"
	"github.com/ifx-run/ifx/go-sdk/scratch"
)

tapeLen := 512
s := scratch.ForPublicFrame(framePK, constants.DefaultProgramID, &tapeLen)

resetIx := s.IxReset()
one, err := s.LetConstU64(1)
// handle err
letIx, err := s.IxLet(one)
assertIx, err := s.IxAssert(expr.NonZero(expr.Ref(one.Index)))
// 组装并发送含 resetIx, letIx, assertIx 的交易
_ = []solana.Instruction{resetIx, letIx, assertIx}
```

一次性 create 用 `scratch.PlanPublicFrame(...)`（见 `go-sdk/examples/minimal_test.go`）。

## 最小示例（Rust）

```rust
use ifx_sdk::expr;
use ifx_sdk::scratch::FrameScratch;
use solana_sdk::pubkey::Pubkey;

let mut scratch = FrameScratch::for_public_frame(
    frame,           // 已有公共 Frame 的 Pubkey
    Some(512),       // tape_len
    None,            // None → 主网 program id
);

let reset_ix = scratch.ix_reset();
let one = scratch.let_const_u64(1)?;
let let_ix = scratch.ix_let_single(&one)?;
let assert_ix = scratch.ix_assert(&expr::non_zero(expr::r(&one)))?;
// 发送 [reset_ix, let_ix, assert_ix]
```

一次性 create 用 `FrameScratch::plan_public_frame(...)`。

## 下一步

1. [两跳 Swap（进阶）](./quick-start.two-hop-swap.zh-CN.md) — 读中间余额、patch 第二跳
2. [AI Skill](./quick-start.ai-skill.zh-CN.md) — Cursor / Agent 编排指南
3. [设计文档](./design.zh-CN.md) — 程序仓同步的深度参考
