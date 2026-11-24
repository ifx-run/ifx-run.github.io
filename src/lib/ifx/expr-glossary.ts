/**
 * Human blurbs for Expr ops shown in the explorer L1 decode.
 * Keep in sync with `ifx-core` `Expr` / docs/implementation §5 when the
 * program repo adds operators (periodic sync — site-hosted copy).
 */

export type ExprGlossaryEntry = {
  /** Canonical SDK / wire variant name (camelCase). */
  op: string
  /** How it usually appears in L1 text. */
  display: string
  /** Short signature for the modal. */
  signature: string
  /** Result type hint. */
  result: string
  en: string
  zh: string
}

const CAST =
  'Integer cast (see on-chain apply_cast). Narrowing truncates; signed casts follow program rules.'
const CAST_ZH =
  '整数类型转换（见链上 apply_cast）。收窄会截断；有符号转换遵循程序规则。'

/** Entries keyed by canonical op name. */
export const EXPR_GLOSSARY: Record<string, ExprGlossaryEntry> = {
  not: {
    op: 'not',
    display: '!',
    signature: 'not(Bool) → Bool',
    result: 'Bool',
    en: 'Logical not. Operand must be Bool.',
    zh: '逻辑非。操作数须为 Bool。',
  },
  neg: {
    op: 'neg',
    display: '-',
    signature: 'neg(T) → T',
    result: 'operand type',
    en: 'Arithmetic negation for signed integers or floats.',
    zh: '算术取负（有符号整数或浮点）。',
  },
  isZero: {
    op: 'isZero',
    display: 'isZero',
    signature: 'isZero(Int) → Bool',
    result: 'Bool',
    en: 'True when an integer operand equals zero.',
    zh: '整数操作数等于 0 时为真。',
  },
  nonZero: {
    op: 'nonZero',
    display: 'nonZero',
    signature: 'nonZero(Int) → Bool',
    result: 'Bool',
    en: 'True when an integer operand is not zero.',
    zh: '整数操作数非 0 时为真。',
  },
  asU8: {
    op: 'asU8',
    display: 'asU8',
    signature: 'asU8(Int) → U8',
    result: 'U8',
    en: CAST,
    zh: CAST_ZH,
  },
  asU16: {
    op: 'asU16',
    display: 'asU16',
    signature: 'asU16(Int) → U16',
    result: 'U16',
    en: CAST,
    zh: CAST_ZH,
  },
  asU32: {
    op: 'asU32',
    display: 'asU32',
    signature: 'asU32(Int) → U32',
    result: 'U32',
    en: CAST,
    zh: CAST_ZH,
  },
  asU64: {
    op: 'asU64',
    display: 'asU64',
    signature: 'asU64(Int) → U64',
    result: 'U64',
    en: CAST,
    zh: CAST_ZH,
  },
  asU128: {
    op: 'asU128',
    display: 'asU128',
    signature: 'asU128(Int) → U128',
    result: 'U128',
    en: CAST,
    zh: CAST_ZH,
  },
  asI8: {
    op: 'asI8',
    display: 'asI8',
    signature: 'asI8(Int) → I8',
    result: 'I8',
    en: CAST,
    zh: CAST_ZH,
  },
  asI16: {
    op: 'asI16',
    display: 'asI16',
    signature: 'asI16(Int) → I16',
    result: 'I16',
    en: CAST,
    zh: CAST_ZH,
  },
  asI32: {
    op: 'asI32',
    display: 'asI32',
    signature: 'asI32(Int) → I32',
    result: 'I32',
    en: CAST,
    zh: CAST_ZH,
  },
  asI64: {
    op: 'asI64',
    display: 'asI64',
    signature: 'asI64(Int) → I64',
    result: 'I64',
    en: CAST,
    zh: CAST_ZH,
  },
  asI128: {
    op: 'asI128',
    display: 'asI128',
    signature: 'asI128(Int) → I128',
    result: 'I128',
    en: CAST,
    zh: CAST_ZH,
  },
  add: {
    op: 'add',
    display: '+',
    signature: 'add(T, T) → T',
    result: 'lhs type',
    en: 'Addition. Both operands share the same arithmetic type.',
    zh: '加法。左右操作数须为同一算术类型。',
  },
  sub: {
    op: 'sub',
    display: '-',
    signature: 'sub(T, T) → T',
    result: 'lhs type',
    en: 'Subtraction. Both operands share the same arithmetic type.',
    zh: '减法。左右操作数须为同一算术类型。',
  },
  mul: {
    op: 'mul',
    display: '*',
    signature: 'mul(T, T) → T',
    result: 'lhs type',
    en: 'Multiplication. Both operands share the same arithmetic type.',
    zh: '乘法。左右操作数须为同一算术类型。',
  },
  div: {
    op: 'div',
    display: '/',
    signature: 'div(T, T) → T',
    result: 'lhs type',
    en: 'Truncating division toward zero.',
    zh: '向零截断的除法。',
  },
  divFloor: {
    op: 'divFloor',
    display: 'divFloor',
    signature: 'divFloor(T, T) → T',
    result: 'lhs type',
    en: 'Floor division ⌊lhs / rhs⌋.',
    zh: '向下取整除法 ⌊lhs / rhs⌋。',
  },
  divCeil: {
    op: 'divCeil',
    display: 'divCeil',
    signature: 'divCeil(T, T) → T',
    result: 'lhs type',
    en: 'Ceiling division ⌈lhs / rhs⌉.',
    zh: '向上取整除法 ⌈lhs / rhs⌉。',
  },
  min: {
    op: 'min',
    display: 'min',
    signature: 'min(T, T) → T',
    result: 'lhs type',
    en: 'Minimum of two values of the same type.',
    zh: '同类型两值取较小。',
  },
  max: {
    op: 'max',
    display: 'max',
    signature: 'max(T, T) → T',
    result: 'lhs type',
    en: 'Maximum of two values of the same type.',
    zh: '同类型两值取较大。',
  },
  eq: {
    op: 'eq',
    display: '==',
    signature: 'eq(T, T) → Bool',
    result: 'Bool',
    en: 'Equality. Operands must share a type.',
    zh: '相等比较。操作数类型须相同。',
  },
  ne: {
    op: 'ne',
    display: '!=',
    signature: 'ne(T, T) → Bool',
    result: 'Bool',
    en: 'Inequality.',
    zh: '不等比较。',
  },
  gt: {
    op: 'gt',
    display: '>',
    signature: 'gt(T, T) → Bool',
    result: 'Bool',
    en: 'Greater than.',
    zh: '大于。',
  },
  ge: {
    op: 'ge',
    display: '>=',
    signature: 'ge(T, T) → Bool',
    result: 'Bool',
    en: 'Greater than or equal.',
    zh: '大于等于。',
  },
  lt: {
    op: 'lt',
    display: '<',
    signature: 'lt(T, T) → Bool',
    result: 'Bool',
    en: 'Less than.',
    zh: '小于。',
  },
  le: {
    op: 'le',
    display: '<=',
    signature: 'le(T, T) → Bool',
    result: 'Bool',
    en: 'Less than or equal.',
    zh: '小于等于。',
  },
  saturatingSub: {
    op: 'saturatingSub',
    display: 'satSub',
    signature: 'saturatingSub(T, T) → T',
    result: 'lhs type',
    en: 'Subtraction saturating at the type minimum (0 for unsigned).',
    zh: '饱和减法：结果不低于类型最小值（无符号为 0）。',
  },
  and: {
    op: 'and',
    display: '&&',
    signature: 'and(Bool, Bool) → Bool',
    result: 'Bool',
    en: 'Logical and. Both operands must be Bool.',
    zh: '逻辑与。两侧须为 Bool。',
  },
  or: {
    op: 'or',
    display: '||',
    signature: 'or(Bool, Bool) → Bool',
    result: 'Bool',
    en: 'Logical or. Both operands must be Bool.',
    zh: '逻辑或。两侧须为 Bool。',
  },
  bpsMulFloor: {
    op: 'bpsMulFloor',
    display: 'bpsMulFloor',
    signature: 'bpsMulFloor(amount: U64, bps) → U64',
    result: 'U64',
    en: '⌊amount × bps / 10_000⌋. bps is an unsigned integer type.',
    zh: '⌊amount × bps / 10_000⌋。bps 为无符号整数。',
  },
  bpsMulCeil: {
    op: 'bpsMulCeil',
    display: 'bpsMulCeil',
    signature: 'bpsMulCeil(amount: U64, bps) → U64',
    result: 'U64',
    en: '⌈amount × bps / 10_000⌉.',
    zh: '⌈amount × bps / 10_000⌉。',
  },
  mulDivFloor: {
    op: 'mulDivFloor',
    display: 'mulDivFloor',
    signature: 'mulDivFloor(a, b, c) → type(a)',
    result: 'a type',
    en: '⌊a × b / c⌋. a and b are U64 or U128; c same or narrower unsigned.',
    zh: '⌊a × b / c⌋。a、b 为 U64/U128；c 同宽或更窄的无符号。',
  },
  mulDivCeil: {
    op: 'mulDivCeil',
    display: 'mulDivCeil',
    signature: 'mulDivCeil(a, b, c) → type(a)',
    result: 'a type',
    en: '⌈a × b / c⌉.',
    zh: '⌈a × b / c⌉。',
  },
  clamp: {
    op: 'clamp',
    display: 'clamp',
    signature: 'clamp(value, lo, hi) → type(value)',
    result: 'value type',
    en: 'Clamp value into [lo, hi]. All three share a type.',
    zh: '将 value 限制在 [lo, hi]。三者类型相同。',
  },
  select: {
    op: 'select',
    display: 'select',
    signature: 'select(cond: Bool, then, else) → branch type',
    result: 'branch type',
    en: 'cond ? then : else. Branches must share a type.',
    zh: 'cond ? then : else。两个分支类型须相同。',
  },
}

/** L1 display token → canonical op (named funcs + infix / aliases). */
const DISPLAY_TO_OP: Record<string, string> = {
  isZero: 'isZero',
  nonZero: 'nonZero',
  asU8: 'asU8',
  asU16: 'asU16',
  asU32: 'asU32',
  asU64: 'asU64',
  asU128: 'asU128',
  asI8: 'asI8',
  asI16: 'asI16',
  asI32: 'asI32',
  asI64: 'asI64',
  asI128: 'asI128',
  divFloor: 'divFloor',
  divCeil: 'divCeil',
  min: 'min',
  max: 'max',
  satSub: 'saturatingSub',
  saturatingSub: 'saturatingSub',
  bpsMulFloor: 'bpsMulFloor',
  bpsMulCeil: 'bpsMulCeil',
  mulDivFloor: 'mulDivFloor',
  mulDivCeil: 'mulDivCeil',
  clamp: 'clamp',
  select: 'select',
  '>=': 'ge',
  '<=': 'le',
  '==': 'eq',
  '!=': 'ne',
  '&&': 'and',
  '||': 'or',
  '>': 'gt',
  '<': 'lt',
  '+': 'add',
  '*': 'mul',
  '/': 'div',
}

/** Longer tokens first so `>=` wins over `>`. Lone `-` omitted (neg/sub/sign). */
const DISPLAY_TOKEN_RE = new RegExp(
  [
    String.raw`\b(?:bpsMulFloor|bpsMulCeil|mulDivFloor|mulDivCeil|saturatingSub|divFloor|divCeil|nonZero|isZero|asU128|asI128|asU16|asU32|asU64|asI16|asI32|asI64|asU8|asI8|satSub|clamp|select|min|max)\b`,
    String.raw`>=|<=|==|!=|&&|\|\|`,
    String.raw`(?<![$\w])(?:[>+*/](?!=)|<(?!=))`,
  ].join('|'),
  'g',
)

export function lookupExprGlossary(
  displayToken: string,
): ExprGlossaryEntry | null {
  const op = DISPLAY_TO_OP[displayToken]
  if (!op) return null
  return EXPR_GLOSSARY[op] ?? null
}

/** Split plain L1 text, yielding literal chunks and glossary hits. */
export function splitExprGlossaryTokens(
  text: string,
): Array<
  | { kind: 'text'; text: string }
  | { kind: 'op'; token: string; entry: ExprGlossaryEntry }
> {
  const out: Array<
    | { kind: 'text'; text: string }
    | { kind: 'op'; token: string; entry: ExprGlossaryEntry }
  > = []
  let last = 0
  DISPLAY_TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = DISPLAY_TOKEN_RE.exec(text)) !== null) {
    const token = m[0]!
    const entry = lookupExprGlossary(token)
    if (!entry) continue
    if (m.index > last) {
      out.push({ kind: 'text', text: text.slice(last, m.index) })
    }
    out.push({ kind: 'op', token, entry })
    last = m.index + token.length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}
