import { WireCursor } from './cursor'
import { decodeValue, encodePubkeyBase58 } from './decode-expr'
import {
  CPI_WIRE,
  IF_ELSE_ARM,
  STRUCTURED_CPI_PATCH_NAMES,
  type StructuredCpiPatchName,
} from './variants'
import { decodeExpr, type DecodedExpr } from './decode-expr'

export type DecodedRawPatch = { dataOffset: number; source: number }

export type DecodedStructuredPatch = {
  name: StructuredCpiPatchName
  /** Compact field dump for UI. */
  fields: Record<string, string | number | boolean>
}

export type DecodedCpi =
  | {
      kind: 'static'
      accountsStart: number
      accountsLen: number
      dataLen: number
    }
  | {
      kind: 'rawPatched'
      accountsStart: number
      accountsLen: number
      dataLen: number
      /** Template instruction data (bytes that patches overwrite at runtime). */
      template: Uint8Array
      patches: DecodedRawPatch[]
    }
  | {
      kind: 'structured'
      accountsStart: number
      accountsLen: number
      patch: DecodedStructuredPatch
    }

export type DecodedIfElseArm =
  | { kind: 'skip' }
  | { kind: 'revert' }
  | { kind: 'cpi'; steps: DecodedCpi[] }

function ref(c: WireCursor): string {
  return `$${decodeValue(c).index}`
}

function litU64(c: WireCursor): string {
  return c.u64().toString()
}

function decodeAmountDecimals(c: WireCursor): Record<string, string | number> {
  const tag = c.u8()
  switch (tag) {
    case 0:
      return { mode: 'amountOnly', amount: ref(c), decimals: c.u8() }
    case 1:
      return { mode: 'both', amount: ref(c), decimals: ref(c) }
    case 2:
      return { mode: 'decimalsOnly', amount: litU64(c), decimals: ref(c) }
    default:
      throw new Error(`unknown AmountDecimalsPatch tag ${tag}`)
  }
}

function decodeLamportsSpace(c: WireCursor): Record<string, string> {
  const tag = c.u8()
  switch (tag) {
    case 0:
      return { mode: 'lamportsOnly', lamports: ref(c), space: litU64(c) }
    case 1:
      return { mode: 'spaceOnly', lamports: litU64(c), space: ref(c) }
    case 2:
      return { mode: 'both', lamports: ref(c), space: ref(c) }
    default:
      throw new Error(`unknown LamportsSpacePatch tag ${tag}`)
  }
}

function decodeAmountDecimalsFee(
  c: WireCursor,
): Record<string, string | number> {
  const tag = c.u8()
  switch (tag) {
    case 0:
      return {
        mode: 'amountOnly',
        amount: ref(c),
        decimals: c.u8(),
        fee: litU64(c),
      }
    case 1:
      return {
        mode: 'decimalsOnly',
        amount: litU64(c),
        decimals: ref(c),
        fee: litU64(c),
      }
    case 2:
      return {
        mode: 'feeOnly',
        amount: litU64(c),
        decimals: c.u8(),
        fee: ref(c),
      }
    case 3:
      return {
        mode: 'amountDecimals',
        amount: ref(c),
        decimals: ref(c),
        fee: litU64(c),
      }
    case 4:
      return {
        mode: 'amountFee',
        amount: ref(c),
        decimals: c.u8(),
        fee: ref(c),
      }
    case 5:
      return {
        mode: 'decimalsFee',
        amount: litU64(c),
        decimals: ref(c),
        fee: ref(c),
      }
    case 6:
      return {
        mode: 'allFromFrame',
        amount: ref(c),
        decimals: ref(c),
        fee: ref(c),
      }
    default:
      throw new Error(`unknown AmountDecimalsFeePatch tag ${tag}`)
  }
}

function decodeSetTransferFee(c: WireCursor): Record<string, string | number> {
  const tag = c.u8()
  switch (tag) {
    case 0:
      return { mode: 'bpsOnly', basisPoints: ref(c), maximumFee: litU64(c) }
    case 1:
      return { mode: 'maxOnly', basisPoints: c.u16(), maximumFee: ref(c) }
    case 2:
      return { mode: 'both', basisPoints: ref(c), maximumFee: ref(c) }
    default:
      throw new Error(`unknown SetTransferFeePatch tag ${tag}`)
  }
}

function decodePubkeyValue(c: WireCursor): string {
  const tag = c.u8()
  if (tag === 0) return ref(c)
  if (tag === 1) return encodePubkeyBase58(c.pubkey32())
  throw new Error(`unknown PubkeyValue tag ${tag}`)
}

function decodeFreezeAuth(c: WireCursor): string {
  const tag = c.u8()
  if (tag === 0) return 'none'
  if (tag === 1) return `some(${ref(c)})`
  if (tag === 2) return `some(${encodePubkeyBase58(c.pubkey32())})`
  throw new Error(`unknown FreezeAuthPatch tag ${tag}`)
}

function decodeInitializeMint(c: WireCursor): Record<string, string> {
  return {
    decimals: ref(c),
    mintAuthority: decodePubkeyValue(c),
    freeze: decodeFreezeAuth(c),
  }
}

function decodeUnwrapLamports(c: WireCursor): Record<string, string> {
  const tag = c.u8()
  if (tag === 0) return { mode: 'all' }
  if (tag === 1) return { mode: 'amount', amount: ref(c) }
  throw new Error(`unknown UnwrapLamportsPatch tag ${tag}`)
}

function decodeStructuredBody(
  name: StructuredCpiPatchName,
  c: WireCursor,
): Record<string, string | number | boolean> {
  switch (name) {
    case 'systemTransfer':
      return { lamports: ref(c) }
    case 'systemCreateAccount':
      return decodeLamportsSpace(c)
    case 'systemAllocate':
      return { space: ref(c) }
    case 'tokenTransfer':
    case 'tokenApprove':
    case 'tokenMintTo':
    case 'tokenBurn':
    case 'tokenAmountToUiAmount':
    case 'token2022Transfer':
    case 'token2022Approve':
    case 'token2022MintTo':
    case 'token2022Burn':
    case 'token2022AmountToUiAmount':
      return { amount: ref(c) }
    case 'tokenTransferChecked':
    case 'tokenApproveChecked':
    case 'tokenMintToChecked':
    case 'tokenBurnChecked':
    case 'token2022TransferChecked':
    case 'token2022ApproveChecked':
    case 'token2022MintToChecked':
    case 'token2022BurnChecked':
      return decodeAmountDecimals(c)
    case 'tokenInitializeMultisig':
    case 'token2022InitializeMultisig':
      return { m: ref(c) }
    case 'token2022TransferCheckedWithFee':
      return decodeAmountDecimalsFee(c)
    case 'token2022SetTransferFee':
      return decodeSetTransferFee(c)
    case 'tokenInitializeMint':
    case 'tokenInitializeMint2':
    case 'token2022InitializeMint':
    case 'token2022InitializeMint2':
      return decodeInitializeMint(c)
    case 'stakeWithdraw':
    case 'stakeSplit':
      return { lamports: ref(c) }
    case 'stakeDeactivate':
    case 'stakeDelegateStake':
      return {}
    case 'tokenUnwrapLamports':
      return decodeUnwrapLamports(c)
  }
}

export function decodeStructuredCpiPatch(
  c: WireCursor,
): DecodedStructuredPatch {
  const tag = c.u8()
  const name = STRUCTURED_CPI_PATCH_NAMES[tag]
  if (!name) throw new Error(`unknown StructuredCpiPatch tag ${tag}`)
  return { name, fields: decodeStructuredBody(name, c) }
}

function decodeRawPatch(c: WireCursor): DecodedRawPatch {
  return { dataOffset: c.u16(), source: decodeValue(c).index }
}

function decodePatchList(c: WireCursor): DecodedRawPatch[] {
  const n = c.u16()
  const out: DecodedRawPatch[] = []
  for (let i = 0; i < n; i++) out.push(decodeRawPatch(c))
  return out
}

export function decodeCpi(c: WireCursor): DecodedCpi {
  const kindTag = c.u8()
  const accountsStart = c.u8()
  const accountsLen = c.u8()

  if (kindTag === CPI_WIRE.static) {
    const dataLen = c.u16()
    c.take(dataLen)
    return { kind: 'static', accountsStart, accountsLen, dataLen }
  }
  if (kindTag === CPI_WIRE.rawPatched) {
    const dataLen = c.u16()
    const template = c.take(dataLen)
    return {
      kind: 'rawPatched',
      accountsStart,
      accountsLen,
      dataLen,
      template,
      patches: decodePatchList(c),
    }
  }
  if (kindTag === CPI_WIRE.structured) {
    return {
      kind: 'structured',
      accountsStart,
      accountsLen,
      patch: decodeStructuredCpiPatch(c),
    }
  }
  throw new Error(`unknown Cpi kind ${kindTag}`)
}

export function decodeIfElseArm(c: WireCursor): DecodedIfElseArm {
  const tag = c.u8()
  if (tag === IF_ELSE_ARM.skip) return { kind: 'skip' }
  if (tag === IF_ELSE_ARM.revert) return { kind: 'revert' }
  if (tag >= 1 && tag <= 0xfe) {
    const steps: DecodedCpi[] = []
    for (let i = 0; i < tag; i++) steps.push(decodeCpi(c))
    return { kind: 'cpi', steps }
  }
  throw new Error(`unknown IfElseArm tag ${tag}`)
}

export function decodeIfElseArgs(c: WireCursor): {
  cond: DecodedExpr
  thenArm: DecodedIfElseArm
  elseArm: DecodedIfElseArm
} {
  return {
    cond: decodeExpr(c),
    thenArm: decodeIfElseArm(c),
    elseArm: decodeIfElseArm(c),
  }
}
