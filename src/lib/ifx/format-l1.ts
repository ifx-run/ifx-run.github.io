import type { DecodedExpr } from './decode-expr'
import type { DecodedLetBinding } from './decode-let'
import type { DecodedCpi, DecodedIfElseArm } from './decode-cpi'
import type { IfxL1Decoded } from './decode-l1'

const BIN_SYM: Record<string, string> = {
  add: '+',
  sub: '-',
  mul: '*',
  div: '/',
  divFloor: 'divFloor',
  divCeil: 'divCeil',
  min: 'min',
  max: 'max',
  eq: '==',
  ne: '!=',
  gt: '>',
  ge: '>=',
  lt: '<',
  le: '<=',
  saturatingSub: 'satSub',
  and: '&&',
  or: '||',
  bpsMulFloor: 'bpsMulFloor',
  bpsMulCeil: 'bpsMulCeil',
}

export function formatExpr(e: DecodedExpr): string {
  switch (e.op) {
    case 'value':
      return `$${e.index}`
    case 'constBool':
      return e.value ? 'true' : 'false'
    case 'constU8':
      return `${e.value}u8`
    case 'constU16':
      return `${e.value}u16`
    case 'constU32':
      return `${e.value}u32`
    case 'constU64':
      return `${e.value}u64`
    case 'constU128':
      return `${e.value}u128`
    case 'constI8':
      return `${e.value}i8`
    case 'constI16':
      return `${e.value}i16`
    case 'constI32':
      return `${e.value}i32`
    case 'constI64':
      return `${e.value}i64`
    case 'constI128':
      return `${e.value}i128`
    case 'constF32':
      return `${e.value}f32`
    case 'constF64':
      return `${e.value}f64`
    case 'constPubkey': {
      const p = e.value
      return p.length > 12 ? `${p.slice(0, 4)}…${p.slice(-4)}` : p
    }
    case 'not':
      return `!${formatExpr(e.args[0])}`
    case 'neg':
      return `-${formatExpr(e.args[0])}`
    case 'isZero':
      return `isZero(${formatExpr(e.args[0])})`
    case 'nonZero':
      return `nonZero(${formatExpr(e.args[0])})`
    case 'asU8':
    case 'asU16':
    case 'asU32':
    case 'asU64':
    case 'asU128':
    case 'asI8':
    case 'asI16':
    case 'asI32':
    case 'asI64':
    case 'asI128':
      return `${e.op}(${formatExpr(e.args[0])})`
    case 'clamp':
      return `clamp(${formatExpr(e.args[0])}, ${formatExpr(e.args[1])}, ${formatExpr(e.args[2])})`
    case 'select':
      return `select(${formatExpr(e.args[0])}, ${formatExpr(e.args[1])}, ${formatExpr(e.args[2])})`
    case 'mulDivFloor':
    case 'mulDivCeil':
      return `${e.op}(${e.args.map(formatExpr).join(', ')})`
    default: {
      const args = e.args.map(formatExpr)
      const sym = BIN_SYM[e.op]
      if (sym && (sym === 'min' || sym === 'max' || sym.length > 2)) {
        return `${sym}(${args[0]}, ${args[1]})`
      }
      if (sym) return `(${args[0]} ${sym} ${args[1]})`
      return `${e.op}(${args.join(', ')})`
    }
  }
}

export function formatLetBinding(b: DecodedLetBinding, index: number): string {
  const head = `$${index} ← `
  switch (b.kind) {
    case 'eval':
      return head + formatExpr(b.expr)
    case 'accountDataSlice':
      return (
        head +
        `accountDataSlice(#${b.accountIndex}, off=${b.offset}, ${b.ty})`
      )
    case 'constPubkey': {
      const p = b.pubkey
      const short = p.length > 12 ? `${p.slice(0, 4)}…${p.slice(-4)}` : p
      return head + `constPubkey(${short})`
    }
    case 'sysvarRentMinimumBalance':
      return head + `sysvarRentMinimumBalance(dataLen=${b.dataLen})`
    default:
      if (b.accountIndex !== undefined) {
        return head + `${b.kind}(#${b.accountIndex})`
      }
      return head + b.kind
  }
}

function formatCpi(step: DecodedCpi, i: number): string {
  const acct = `accts[${step.accountsStart}..+${step.accountsLen}]`
  if (step.kind === 'static') {
    return `  [${i}] static ${acct} data=${step.dataLen}B`
  }
  if (step.kind === 'rawPatched') {
    const patches = step.patches
      .map((p) => `off${p.dataOffset}←$${p.source}`)
      .join(', ')
    return `  [${i}] rawPatched ${acct} data=${step.dataLen}B patches=[${patches}]`
  }
  const fields = Object.entries(step.patch.fields)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
  return `  [${i}] structured ${step.patch.name} ${acct}${fields ? ` {${fields}}` : ''}`
}

function formatArm(arm: DecodedIfElseArm, label: string): string[] {
  if (arm.kind === 'skip') return [`${label}: skip`]
  if (arm.kind === 'revert') return [`${label}: revert`]
  return [
    `${label}: ${arm.steps.length} CPI step(s)`,
    ...arm.steps.map((s, i) => formatCpi(s, i)),
  ]
}

/** Human-readable lines describing what the instruction does. */
export function formatL1Lines(decoded: IfxL1Decoded): string[] {
  switch (decoded.kind) {
    case 'create_frame':
      return [
        `create frame tapeLen=${decoded.tapeLen}`,
        `authority ${decoded.authority}`,
        `frameId ${decoded.frameId}`,
      ]
    case 'close_frame':
      return ['close frame (return rent to authority)']
    case 'reset_frame':
      return ['reset frame tape / binding index']
    case 'let':
      return decoded.bindings.map((b, i) => formatLetBinding(b, i))
    case 'assert':
      return [`assert ${formatExpr(decoded.cond)}`]
    case 'assert_multi':
      return decoded.conds.map((c, i) => `[${i}] assert ${formatExpr(c)}`)
    case 'patched_cpi':
      return [formatCpi(decoded.cpi, 0).replace(/^ {2}/, '')]
    case 'if_else':
      return [
        `if ${formatExpr(decoded.cond)}`,
        ...formatArm(decoded.thenArm, 'then'),
        ...formatArm(decoded.elseArm, 'else'),
      ]
  }
}

export function formatL1Summary(decoded: IfxL1Decoded): string {
  const lines = formatL1Lines(decoded)
  if (lines.length === 0) return decoded.kind
  if (lines.length === 1) return lines[0]!
  if (decoded.kind === 'let') {
    return `let ${decoded.bindings.length} binding(s): ${lines[0]}${lines.length > 1 ? '…' : ''}`
  }
  if (decoded.kind === 'if_else') {
    return `if ${formatExpr(decoded.cond)} → then ${decoded.thenArm.kind} / else ${decoded.elseArm.kind}`
  }
  if (decoded.kind === 'assert_multi') {
    return `assert_multi ×${decoded.conds.length}`
  }
  return lines[0]!
}
