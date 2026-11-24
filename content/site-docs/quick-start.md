# Quick Start

Install an Ifx SDK, write a minimal Frame demo, then paste the wire into the [Explorer](/explorer) to verify offline.

## Pick a language

| SDK | Install | Examples |
|-----|---------|----------|
| **TypeScript** | `npm install @ifx-run/sdk @solana/web3.js` | [sdk/examples](https://github.com/ifx-run/ifx/tree/main/sdk/examples) |
| **Go** | `go get github.com/ifx-run/ifx/go-sdk@v0.1.3` | [go-sdk/examples](https://github.com/ifx-run/ifx/tree/main/go-sdk/examples) |
| **Rust** | `cargo add ifx-sdk@0.1.3` | [rust-sdk/examples](https://github.com/ifx-run/ifx/tree/main/rust-sdk/examples) |

Program id (mainnet default in SDKs): `ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj`.

## Minimal demo (TypeScript)

```ts
import { Transaction } from "@solana/web3.js";
import { FrameScratch, DEFAULT_TAPE_LEN, expr } from "@ifx-run/sdk";

const scratch = new FrameScratch({ tapeLen: DEFAULT_TAPE_LEN });
const tx = new Transaction();

// First tx in a flow: create the Frame (see sdk/examples/minimal-frame.ts).
// Later txs: scratch.reset() then let / assert / CPI.
scratch.reset();
const balance = scratch.letLamports(/* account index in remaining */ 0);
scratch.assert(expr.gte(balance, 1n));

tx.add(...scratch.ixs());
// sign + send, then paste base64/base58 wire into https://ifx.run/explorer
```

Full runnable sample: [`minimal-frame.ts`](https://github.com/ifx-run/ifx/blob/main/sdk/examples/minimal-frame.ts).

## Minimal demo (Go)

```go
import ifx "github.com/ifx-run/ifx/go-sdk"

scratch := ifx.NewFrameScratch(ifx.DefaultTapeLen)
scratch.Reset()
// let / assert / build instructions — see go-sdk/examples
```

## Minimal demo (Rust)

```rust
use ifx_sdk::FrameScratch;

let mut scratch = FrameScratch::new(/* tape_len */);
scratch.reset();
// let / assert / CPI — see rust-sdk/examples
```

## Next steps

1. [Two-hop swap (advanced)](./quick-start.two-hop-swap.md) — read intermediate balance, patch hop 2
2. [AI skill](./quick-start.ai-skill.md) — Cursor / agent orchestration guide
3. [Design docs](./design.md) — deep reference (synced from the program repo)
