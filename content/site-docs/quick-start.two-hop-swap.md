# Two-hop swap (advanced)

Goal: swap A → USDC → B in one orchestration flow — **read the intermediate token balance on-chain**, then **patch hop 2** so the second leg uses the real amount (not a stale RPC quote).

## Pattern

1. **Unconditional templates** for each venue hop (builder owns pool accounts / ix bytes).
2. **`ifx_let`** — read hop-1 output (e.g. SPL token amount / account data slice).
3. **Math / cast** on the Frame tape if needed (`asU64`, etc.).
4. **Patched CPI** — Structured for official SPL/System fields; **RawPatched** for DEX layouts (`data_offset` + `$N`).
5. Optional **`ifx_if_else`** — skip / revert when balance too low.

Prefer Structured CPI when the registry covers the ix; use Raw for DEX / custom layouts ([raw CPI patches](./raw-cpi-patches.md)).

## Reference example

| Language | Example |
|----------|---------|
| TypeScript | [`two-hop-token-swap.ts`](https://github.com/ifx-run/ifx/blob/main/sdk/examples/two-hop-token-swap.ts) |

Venue demos (integrator-owned, outside the core SDK):

- [ifx-pumpfun-ext](https://github.com/ifx-run/ifx-pumpfun-ext) (TS)
- [ifx-raydium-ext](https://github.com/ifx-run/ifx-raydium-ext) (Rust)
- [ifx-launchpad-orchestrator](https://github.com/ifx-run/ifx-launchpad-orchestrator) (Go)

## Verify in Explorer

After you build a tx, paste the wire into [Explorer](/explorer). For RawPatched steps, the instruction detail shows a **byte patch map** (offset → `$N`) under the text decode.

## Related

- [Quick Start](./quick-start.md)
- [AI skill](./quick-start.ai-skill.md)
- [Structured CPI](./structured-cpi-patches.md) · [Raw CPI](./raw-cpi-patches.md)
