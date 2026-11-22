import { WireCursor } from './cursor'
import {
  EXPR_BINARY,
  EXPR_TERNARY,
  EXPR_UNARY,
  EXPR_VARIANT,
  type ExprVariant,
  VALUE_TYPE,
  type ValueTypeName,
} from './variants'

export type DecodedValue = { index: number }

type UnaryOp = Extract<
  ExprVariant,
  | 'not'
  | 'neg'
  | 'isZero'
  | 'nonZero'
  | 'asU8'
  | 'asU16'
  | 'asU32'
  | 'asU64'
  | 'asU128'
  | 'asI8'
  | 'asI16'
  | 'asI32'
  | 'asI64'
  | 'asI128'
>

type BinaryOp = Extract<
  ExprVariant,
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'divFloor'
  | 'divCeil'
  | 'min'
  | 'max'
  | 'eq'
  | 'ne'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'saturatingSub'
  | 'and'
  | 'or'
  | 'bpsMulFloor'
  | 'bpsMulCeil'
>

type TernaryOp = Extract<
  ExprVariant,
  'mulDivFloor' | 'mulDivCeil' | 'clamp' | 'select'
>

export type DecodedExpr =
  | { op: 'value'; index: number }
  | { op: 'constBool'; value: boolean }
  | { op: 'constU8'; value: number }
  | { op: 'constU16'; value: number }
  | { op: 'constU32'; value: number }
  | { op: 'constU64'; value: string }
  | { op: 'constU128'; value: string }
  | { op: 'constI8'; value: number }
  | { op: 'constI16'; value: number }
  | { op: 'constI32'; value: number }
  | { op: 'constI64'; value: string }
  | { op: 'constI128'; value: string }
  | { op: 'constF32'; value: number }
  | { op: 'constF64'; value: number }
  | { op: 'constPubkey'; value: string }
  | { op: UnaryOp; args: [DecodedExpr] }
  | { op: BinaryOp; args: [DecodedExpr, DecodedExpr] }
  | { op: TernaryOp; args: [DecodedExpr, DecodedExpr, DecodedExpr] }

export function decodeValue(c: WireCursor): DecodedValue {
  return { index: c.u8() }
}

export function decodeValueType(c: WireCursor): ValueTypeName {
  const tag = c.u8()
  const name = VALUE_TYPE[tag]
  if (!name) throw new Error(`unknown ValueType tag ${tag}`)
  return name
}

export function encodePubkeyBase58(bytes: Uint8Array): string {
  const ALPH =
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++
  const size = Math.floor(((bytes.length - zeros) * 138) / 100) + 1
  const b = new Uint8Array(size)
  let length = 0
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]!
    let j = 0
    for (let k = size - 1; k >= 0 && (carry !== 0 || j < length); k--, j++) {
      carry += 256 * b[k]!
      b[k] = carry % 58
      carry = (carry / 58) | 0
    }
    length = j
  }
  let start = size - length
  while (start < size && b[start] === 0) start++
  let out = '1'.repeat(zeros)
  for (let i = start; i < size; i++) out += ALPH[b[i]!]!
  return out
}

export function decodeExpr(c: WireCursor): DecodedExpr {
  const tag = c.u8()
  const name = EXPR_VARIANT[tag] as ExprVariant | undefined
  if (!name) throw new Error(`unknown Expr tag ${tag}`)

  switch (name) {
    case 'value':
      return { op: 'value', index: decodeValue(c).index }
    case 'constBool':
      return { op: 'constBool', value: c.u8() !== 0 }
    case 'constU8':
      return { op: 'constU8', value: c.u8() }
    case 'constU16':
      return { op: 'constU16', value: c.u16() }
    case 'constU32':
      return { op: 'constU32', value: c.u32() }
    case 'constU64':
      return { op: 'constU64', value: c.u64().toString() }
    case 'constU128':
      return { op: 'constU128', value: c.u128().toString() }
    case 'constI8':
      return { op: 'constI8', value: c.i8() }
    case 'constI16':
      return { op: 'constI16', value: c.i16() }
    case 'constI32':
      return { op: 'constI32', value: c.i32() }
    case 'constI64':
      return { op: 'constI64', value: c.i64().toString() }
    case 'constI128':
      return { op: 'constI128', value: c.i128().toString() }
    case 'constF32':
      return { op: 'constF32', value: c.f32() }
    case 'constF64':
      return { op: 'constF64', value: c.f64() }
    case 'constPubkey':
      return { op: 'constPubkey', value: encodePubkeyBase58(c.pubkey32()) }
    default:
      break
  }

  if (EXPR_UNARY.has(name)) {
    return { op: name as UnaryOp, args: [decodeExpr(c)] }
  }
  if (EXPR_BINARY.has(name)) {
    return { op: name as BinaryOp, args: [decodeExpr(c), decodeExpr(c)] }
  }
  if (EXPR_TERNARY.has(name)) {
    return {
      op: name as TernaryOp,
      args: [decodeExpr(c), decodeExpr(c), decodeExpr(c)],
    }
  }

  throw new Error(`unhandled Expr variant ${name}`)
}
