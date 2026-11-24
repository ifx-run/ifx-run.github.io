# AI skill (Cursor / agents)

Ifx orchestration has many footguns (two-tx Frames, Structured vs Raw CPI, packet v0/v1, bundles). Before an agent edits swap / settlement txs, point it at the **ifx-orchestration** skill.

## Install

| Where | How |
|-------|-----|
| **This program repo** | [`.cursor/skills/ifx-orchestration/`](https://github.com/ifx-run/ifx/tree/main/.cursor/skills/ifx-orchestration) loads automatically in Cursor |
| **Your app repo** | Copy that folder into `.cursor/skills/`, or paste the skill path / URL into the agent prompt |

Supporting files in the skill folder:

- `scenarios.md` — L0–L3 templates
- `anti-patterns.md` — review checklist

## When to use the skill

- Agent is composing or reviewing Ifx `let` / `if_else` / patched CPI
- Choosing Structured vs RawPatched vs static CPI
- Deciding legacy/v0 vs v1 packets or Jito bundles

## When to write by hand

- Tiny Frame smoke tests ([Quick Start](./quick-start.md))
- Copying a known-good example without policy changes

## Related

- [Quick Start](./quick-start.md)
- [Two-hop swap](./quick-start.two-hop-swap.md)
- Program README “Cursor / AI agents” section
