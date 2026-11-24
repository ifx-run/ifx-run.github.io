import type { DecodedLetBinding } from './decode-let'
import { inferLetBindingTy } from './infer-binding-ty'
import { valueTypeByteSize } from './value-type-size'

export type FrameVar = {
  index: number
  ty: string
  kind: string
  defIx: number
}

export type FrameView = {
  address: string
  vars: FrameVar[]
}

type IxSlice = {
  index: number
  isIfx: boolean
  accounts: { address: string }[]
  l1?: {
    bindingBase?: number
    args: {
      kind: string
      bindings?: DecodedLetBinding[]
    }
  }
}

/**
 * Collect Frame scratch variables visible at end of each Frame's last session
 * in this transaction (reset/create clears; lets append).
 * One entry per Frame account pubkey used by Ifx ixs.
 */
export function collectFrameViews(
  instructions: readonly IxSlice[],
): FrameView[] {
  type Session = {
    vars: FrameVar[]
    env: Map<number, string>
  }
  const sessions = new Map<string, Session>()
  const order: string[] = []

  function sessionFor(addr: string): Session {
    let s = sessions.get(addr)
    if (!s) {
      s = { vars: [], env: new Map() }
      sessions.set(addr, s)
      order.push(addr)
    }
    return s
  }

  for (const ix of instructions) {
    if (!ix.isIfx || !ix.l1) continue
    const frame = ix.accounts[0]?.address
    if (!frame) continue
    const kind = ix.l1.args.kind

    if (kind === 'create_frame' || kind === 'reset_frame') {
      const s = sessionFor(frame)
      s.vars = []
      s.env = new Map()
      continue
    }
    if (kind !== 'let') continue

    const bindings = ix.l1.args.bindings
    if (!bindings) continue
    const s = sessionFor(frame)
    const base = ix.l1.bindingBase ?? s.vars.length
    for (let i = 0; i < bindings.length; i++) {
      const b = bindings[i]!
      const index = base + i
      const ty = inferLetBindingTy(b, s.env)
      s.env.set(index, ty)
      const slot: FrameVar = {
        index,
        ty,
        kind: b.kind,
        defIx: ix.index,
      }
      if (index < s.vars.length) s.vars[index] = slot
      else s.vars.push(slot)
    }
  }

  return order
    .map((address) => ({
      address,
      vars: sessions.get(address)?.vars ?? [],
    }))
    .filter((f) => f.vars.length > 0)
}

export function aliasKey(frame: string, index: number): string {
  return `${frame}:${index}`
}

type TyCursorIx = {
  index: number
  l1?: {
    bindingBase?: number
    args: {
      kind: string
      bindings?: DecodedLetBinding[]
    }
  }
}

/**
 * Binding payload sizes as of `upToIx` (inclusive), after applying
 * create/reset clears — used to size RawPatched hex highlights.
 */
export function bindingByteSizeAt(
  instructions: readonly TyCursorIx[],
  upToIx: number,
  bindingIndex: number,
): number {
  const env = new Map<number, string>()
  for (const ix of instructions) {
    if (ix.index > upToIx) break
    const kind = ix.l1?.args.kind
    if (kind === 'create_frame' || kind === 'reset_frame') {
      env.clear()
      continue
    }
    if (kind !== 'let') continue
    const bindings = ix.l1?.args.bindings
    if (!bindings) continue
    const base = ix.l1?.bindingBase ?? 0
    for (let i = 0; i < bindings.length; i++) {
      const b = bindings[i]!
      const index = base + i
      const ty = inferLetBindingTy(b, env)
      env.set(index, ty)
    }
  }
  return valueTypeByteSize(env.get(bindingIndex) ?? 'u64')
}
