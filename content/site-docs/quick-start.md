# Quick Start

Install an Ifx SDK, run a **two-tx** Frame flow (create once → business with `ixReset`), then paste the wire into the [Explorer](/explorer) to verify offline.

Pin **`0.1.3`**. Omitted `programId` targets **mainnet** (`ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj`). Localnet / devnet: pass `IFX_LOCALNET_PROGRAM_ID` / `IFX_DEVNET_PROGRAM_ID`.

## Pick a language

| SDK | Install | Examples |
|-----|---------|----------|
| **TypeScript** | `npm i @ifx-run/sdk@0.1.3 @solana/web3.js` | [sdk/examples](https://github.com/ifx-run/ifx/tree/main/sdk/examples) |
| **Go** | `go get github.com/ifx-run/ifx/go-sdk@v0.1.3` | [go-sdk/examples](https://github.com/ifx-run/ifx/tree/main/go-sdk/examples) |
| **Rust** | `cargo add ifx-sdk@0.1.3` | [rust-sdk](https://github.com/ifx-run/ifx/tree/main/rust-sdk) |

## Shape (all languages)

1. **Tx 1 (once):** `planPublicFrame` / `PlanPublicFrame` / `plan_public_frame` → send `ixCreate`. Persist the Frame pubkey + `tapeLen`.
2. **Tx 2+ (business):** rebuild planner with `forPublicFrame` (or reuse scratch in-process) → **`ixReset` first** → `let` / `assert` / CPI. Never mix `create_frame` into the business tx.

Full runnable TS: [`minimal-frame.ts`](https://github.com/ifx-run/ifx/blob/main/sdk/examples/minimal-frame.ts). Go smoke: [`minimal_test.go`](https://github.com/ifx-run/ifx/blob/main/go-sdk/examples/minimal_test.go). Rust localnet: [`rust-sdk/tests/localnet.rs`](https://github.com/ifx-run/ifx/blob/main/rust-sdk/tests/localnet.rs).

## Minimal demo (TypeScript)

Business tx on an **existing** public Frame (create is separate — see the example above):

```ts
import { PublicKey, Transaction } from "@solana/web3.js";
import { DEFAULT_TAPE_LEN, expr, FrameScratch } from "@ifx-run/sdk";

// Existing public Frame PDA (from planPublicFrame / your config).
const scratch = FrameScratch.forPublicFrame({
  framePubkey: new PublicKey("Fr8dvcgrSYKjpvJd471hQD2QuEjF7656WiEuUSb54obu"),
  tapeLen: DEFAULT_TAPE_LEN, // mainnet public pool often uses 1024
  // localnet: programId: IFX_LOCALNET_PROGRAM_ID
});

const tx = new Transaction();
tx.add(scratch.ixReset());
const one = scratch.letConstU64(1);
tx.add(scratch.ixLet(one));
tx.add(scratch.ixAssert(expr.nonZero(one)));
// sign + send, then paste base64/base58 wire into https://ifx.run/explorer
```

One-time create (same process as the example file):

```ts
import { randomBytes } from "crypto";
import { FrameScratch, DEFAULT_TAPE_LEN } from "@ifx-run/sdk";

const { scratch, ixCreate, frame } = FrameScratch.planPublicFrame({
  payer, // PublicKey
  frameId: randomBytes(32),
  tapeLen: DEFAULT_TAPE_LEN,
});
// send Transaction with ixCreate; persist `frame` + tapeLen for business txs
```

## Minimal demo (Go)

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
// build + send tx with resetIx, letIx, assertIx
_ = []solana.Instruction{resetIx, letIx, assertIx}
```

Create once with `scratch.PlanPublicFrame(...)` (see `go-sdk/examples/minimal_test.go`).

## Minimal demo (Rust)

```rust
use ifx_sdk::expr;
use ifx_sdk::scratch::FrameScratch;
use solana_sdk::pubkey::Pubkey;

let mut scratch = FrameScratch::for_public_frame(
    frame,           // Pubkey of existing public Frame
    Some(512),       // tape_len
    None,            // None → mainnet program id
);

let reset_ix = scratch.ix_reset();
let one = scratch.let_const_u64(1)?;
let let_ix = scratch.ix_let_single(&one)?;
let assert_ix = scratch.ix_assert(&expr::non_zero(expr::r(&one)))?;
// send [reset_ix, let_ix, assert_ix]
```

Create once with `FrameScratch::plan_public_frame(...)`.

## Next steps

1. [Two-hop swap (advanced)](./quick-start.two-hop-swap.md) — read intermediate balance, patch hop 2
2. [AI skill](./quick-start.ai-skill.md) — Cursor / agent orchestration guide
3. [Design docs](./design.md) — deep reference (synced from the program repo)
