import { WireCursor } from './cursor'
import {
  decodeExpr,
  decodeValueType,
  encodePubkeyBase58,
  type DecodedExpr,
} from './decode-expr'
import {
  LET_ACCOUNT_INDEX_ONLY,
  LET_BINDING_VARIANT,
  LET_NO_PAYLOAD,
  type LetBindingVariant,
  type ValueTypeName,
} from './variants'

type SimpleLetKind = Exclude<
  LetBindingVariant,
  'accountDataSlice' | 'eval' | 'constPubkey' | 'sysvarRentMinimumBalance'
>

export type DecodedLetBinding =
  | {
      kind: 'accountDataSlice'
      ty: ValueTypeName
      accountIndex: number
      offset: number
      expectedProgramOwner: number
    }
  | { kind: 'eval'; expr: DecodedExpr }
  | { kind: 'constPubkey'; pubkey: string }
  | { kind: 'sysvarRentMinimumBalance'; dataLen: number }
  | { kind: SimpleLetKind; accountIndex?: number }

export function decodeLetBinding(c: WireCursor): DecodedLetBinding {
  const tag = c.u8()
  const kind = LET_BINDING_VARIANT[tag] as LetBindingVariant | undefined
  if (!kind) throw new Error(`unknown LetBinding tag ${tag}`)

  if (kind === 'accountDataSlice') {
    return {
      kind,
      ty: decodeValueType(c),
      accountIndex: c.u8(),
      offset: c.u32(),
      expectedProgramOwner: c.u8(),
    }
  }
  if (kind === 'eval') {
    return { kind, expr: decodeExpr(c) }
  }
  if (kind === 'constPubkey') {
    return { kind, pubkey: encodePubkeyBase58(c.pubkey32()) }
  }
  if (kind === 'sysvarRentMinimumBalance') {
    return { kind, dataLen: c.u32() }
  }
  if (LET_NO_PAYLOAD.has(kind)) {
    return { kind: kind as SimpleLetKind }
  }
  if (LET_ACCOUNT_INDEX_ONLY.has(kind)) {
    return { kind: kind as SimpleLetKind, accountIndex: c.u8() }
  }
  throw new Error(`unhandled LetBinding variant ${kind}`)
}

export function decodeLetArgs(c: WireCursor): DecodedLetBinding[] {
  const n = c.u8()
  const out: DecodedLetBinding[] = []
  for (let i = 0; i < n; i++) out.push(decodeLetBinding(c))
  return out
}
