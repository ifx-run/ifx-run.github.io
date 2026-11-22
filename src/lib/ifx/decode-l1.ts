import { WireCursor } from './cursor'
import { decodeExpr, encodePubkeyBase58, type DecodedExpr } from './decode-expr'
import { decodeLetArgs, type DecodedLetBinding } from './decode-let'
import {
  decodeCpi,
  decodeIfElseArgs,
  type DecodedCpi,
  type DecodedIfElseArm,
} from './decode-cpi'
import {
  decodeIfxInstruction,
  type IfxIxName,
} from './decode-l0'
import { formatL1Lines, formatL1Summary } from './format-l1'

export type IfxL1Decoded =
  | {
      kind: 'create_frame'
      frameId: string
      authority: string
      tapeLen: number
    }
  | { kind: 'close_frame' }
  | { kind: 'reset_frame' }
  | { kind: 'let'; bindings: DecodedLetBinding[] }
  | { kind: 'assert'; cond: DecodedExpr }
  | { kind: 'assert_multi'; conds: DecodedExpr[] }
  | { kind: 'patched_cpi'; cpi: DecodedCpi }
  | {
      kind: 'if_else'
      cond: DecodedExpr
      thenArm: DecodedIfElseArm
      elseArm: DecodedIfElseArm
    }

export type IfxL1View = {
  name: IfxIxName
  discriminator: number
  args: IfxL1Decoded
  summary: string
  lines: string[]
}

function shortPk(bytes: Uint8Array): string {
  const full = encodePubkeyBase58(bytes)
  return full.length > 12 ? `${full.slice(0, 4)}…${full.slice(-4)}` : full
}

function decodeCreateFrame(c: WireCursor): IfxL1Decoded {
  const frameIdBytes = c.pubkey32()
  const authorityBytes = c.pubkey32()
  const tapeLen = c.u32()
  return {
    kind: 'create_frame',
    frameId: shortPk(frameIdBytes),
    authority: encodePubkeyBase58(authorityBytes),
    tapeLen,
  }
}

function decodeArgsFor(
  name: IfxIxName,
  payload: Uint8Array,
): IfxL1Decoded {
  const c = new WireCursor(payload)
  switch (name) {
    case 'ifx_create_frame':
      return decodeCreateFrame(c)
    case 'ifx_close_frame':
      return { kind: 'close_frame' }
    case 'ifx_reset_frame':
      return { kind: 'reset_frame' }
    case 'ifx_let':
      return { kind: 'let', bindings: decodeLetArgs(c) }
    case 'ifx_assert':
      return { kind: 'assert', cond: decodeExpr(c) }
    case 'ifx_assert_multi': {
      const n = c.u8()
      const conds: DecodedExpr[] = []
      for (let i = 0; i < n; i++) conds.push(decodeExpr(c))
      return { kind: 'assert_multi', conds }
    }
    case 'ifx_patched_cpi':
      return { kind: 'patched_cpi', cpi: decodeCpi(c) }
    case 'ifx_if_else': {
      const { cond, thenArm, elseArm } = decodeIfElseArgs(c)
      return { kind: 'if_else', cond, thenArm, elseArm }
    }
  }
}

/**
 * L1: deserialize Ifx instruction args after the 1-byte discriminator
 * and produce a human-readable summary of what the ix does.
 */
export function decodeIfxL1(data: Uint8Array): IfxL1View {
  const { name, discriminator, payload } = decodeIfxInstruction(data)
  const args = decodeArgsFor(name, payload)
  return {
    name,
    discriminator,
    args,
    summary: formatL1Summary(args),
    lines: formatL1Lines(args),
  }
}

/** Best-effort L1; returns null if payload cannot be fully decoded. */
export function tryDecodeIfxL1(data: Uint8Array): IfxL1View | null {
  try {
    return decodeIfxL1(data)
  } catch {
    return null
  }
}
