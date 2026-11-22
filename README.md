# ifx.run

Official **Ifx** site: a pure-frontend **transaction explorer** (+ synced docs) for the on-chain Solana orchestration program.

- Product / program: [github.com/ifx-run/ifx](https://github.com/ifx-run/ifx)
- Site repo (org Pages): [github.com/ifx-run/ifx-run.github.io](https://github.com/ifx-run/ifx-run.github.io)
- Live: **https://ifx-run.github.io/** · custom domain **https://ifx.run**

`/` is a short product intro (value prop + CTAs). **Explorer** lives at `/explorer`; docs at `/docs`.

## Requirements

- **Node.js ≥ 20**
- npm (lockfile committed)

## Local development

```bash
npm install
npm run sync:docs   # also runs on predev / prebuild
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

No secrets are required. The explorer stays offline unless a pasted wire uses Address Lookup Tables (see below).

## Explorer (MVP)

**Wire paste (base58 / base64).** No signature lookup. Decode runs in the browser.

- **No ALT** → fully offline; nothing is sent to an RPC.
- **Has ALT** → packet meta still decodes offline; an RPC URL panel appears so you can fetch ALT account contents and finish resolving instruction accounts. Without RPC, the timeline stays hidden.

Outputs:

- Packet meta: legacy / v0 / **v1**, wire size, ALT (if any), v1 header (CU limit, loaded-accounts-data-size, …)
- Instruction timeline: well-known programs by name (`system.transfer`, `token.transfer_checked`, `ifx.let`, …); unknown programs stay shortened addresses
- Account roles as explicit badges (signer / writable / readonly) — not opaque enum numbers
- **L0** Ifx decode: programId (mainnet / devnet / localnet) + 1-byte discriminator → name (`create` / `let` / `assert` / …)
- **L1** Ifx args: deserialize payload and pretty-print what the instruction does (`let` bindings, `assert` exprs, `if_else` arms, structured/raw CPI, …)
- Official Solana programs (System, Compute Budget, SPL Token / Token-2022, ATA, Stake, ALT, Memo, BPF loader, …): prefer public names + common ix labels; program id and raw data remain visible

Decoder stack: `@solana/kit` (SIMD-0385 v1-capable) + local L0/L1 codecs aligned with `@ifx-run/sdk` wire layout. **L2 SSA cross-refs / L3 logs** are next.

This site is **read-only** (parse / display). It does not upgrade packets to v1 or compose / send transactions.

## Docs sync

Main repo `docs/` is the **only** source of truth. This site does **not** rewrite docs.

Pin + allowlist: [`docs-pin.json`](./docs-pin.json) (`ref` = tag or commit SHA).

```bash
npm run sync:docs
# or override pin:
IFX_DOCS_REF=v0.1.3 npm run sync:docs
```

Synced files land in `content/docs/` with `content/docs-meta.json` (`docs @ <sha>` footnote on pages). Relative links are rewritten to `/docs/...` when allowlisted; otherwise they point at GitHub.

First public allowlist: design, glossary, implementation, frame-authority, bundles, structured-cpi-patches, raw-cpi-patches, errors, debugging, typed-let-bindings (+ `.zh-CN.md`).

## GitHub Pages + custom domain `ifx.run`

### Repo settings

1. **Settings → Pages**
   - Source: **GitHub Actions**
   - Custom domain: `ifx.run`
   - Enable **Enforce HTTPS** after DNS propagates
2. Workflow: [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) builds on `main` and deploys `dist/`
3. `public/CNAME` contains `ifx.run` (Vite copies it into `dist/`)
4. **Vite `base` is `/`** — this repo is the org site (`ifx-run.github.io`), so
   `https://ifx-run.github.io/` and `https://ifx.run/` both use root-absolute assets.

### DNS (manual)

**Option A — apex `ifx.run` → GitHub Pages**

Add these records at your DNS provider:

| Type | Name | Value |
|------|------|--------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

**Option B — `www.ifx.run`**

| Type | Name | Value |
|------|------|--------|
| CNAME | `www` | `ifx-run.github.io` |

Then either redirect apex → www, or also configure apex A/AAAA as above.

Confirm in Pages that the custom domain shows a valid certificate once DNS has propagated.

### SPA routes

`npm run build` copies `dist/index.html` → `dist/404.html` so `/docs/...` deep links work on GitHub Pages.

## Project layout

```
src/                 Explorer + docs UI
content/docs/        Synced markdown snapshot
docs-pin.json        Upstream ref + allowlist
scripts/sync-docs.mjs
public/CNAME
.github/workflows/pages.yml
```

## Roadmap (site)

1. **MVP** — GH Pages + CNAME; offline base58/base64 wire → Ifx L0 highlight; v0+v1; docs sync render
2. **Usable (this)** — L1 args pretty-print (what each Ifx ix does)
3. **Enhanced** — L2 binding cross-refs; L3 logs / taken if_else arm; local wire samples

## License

Site code: MIT (unless noted). Synced docs remain under the [ifx](https://github.com/ifx-run/ifx) license.
