/**
 * Short L1 help blurbs for Expr ops and LetBinding kinds.
 * Keep aligned with ifx-core / typed-let-bindings when syncing the program repo.
 *
 * Shape follows “quick reference” docs (MDN / Rust std lite): signature,
 * one-line what, optional when-to-use, one example — not essays.
 */

export type GlossaryKind = 'expr' | 'let'

export type GlossaryEntry = {
  id: string
  kind: GlossaryKind
  /** Token as shown in L1 (click target). */
  display: string
  /** Params + return, monospace. */
  signature: string
  /** What it does — one or two short sentences. */
  summary: { en: string; zh: string }
  /** When you’d reach for it. */
  usage?: { en: string; zh: string }
  /** One L1-shaped or SDK-shaped line. */
  example?: string
}

function E(
  partial: Omit<GlossaryEntry, 'kind'> & { kind?: GlossaryKind },
): GlossaryEntry {
  return { kind: 'expr', ...partial }
}

function L(
  partial: Omit<GlossaryEntry, 'kind'> & { kind?: GlossaryKind },
): GlossaryEntry {
  return { kind: 'let', ...partial }
}

/**
 * #account = account index shown in the explorer (frame is separate;
 * #0 is the first business account on this Ifx instruction).
 */
function accountFieldLet(
  id: string,
  result: string,
  fieldEn: string,
  fieldZh: string,
  opts?: { accountKind?: string; usageEn?: string; usageZh?: string },
): GlossaryEntry {
  const kind = opts?.accountKind
  return L({
    id,
    display: id,
    signature: `${id}(#account) → ${result}`,
    summary: {
      en: kind
        ? `${fieldEn} of account #account (must be a ${kind} account).`
        : `${fieldEn} of account #account.`,
      zh: kind
        ? `#account 账户的${fieldZh}（须是 ${kind} 账户）。`
        : `#account 账户的${fieldZh}。`,
    },
    usage: {
      en:
        opts?.usageEn ??
        'Read into a $N for a later check or to fill a CPI field.',
      zh: opts?.usageZh ?? '读进 $N，供后面检查或填进 CPI。',
    },
    example: `$0 ← ${id}(#0)`,
  })
}

function sysvarLet(
  id: string,
  result: string,
  fieldEn: string,
  fieldZh: string,
): GlossaryEntry {
  return L({
    id,
    display: id,
    signature: `${id}() → ${result}`,
    summary: {
      en: `Cluster clock: ${fieldEn}.`,
      zh: `集群时钟：${fieldZh}。`,
    },
    usage: {
      en: 'Time or epoch checks without wiring the clock account yourself.',
      zh: '做时间/epoch 判断，不必自己在账户列表里塞 Clock。',
    },
    example: `$0 ← ${id}`,
  })
}

const CAST_USAGE = {
  en: 'When the next CPI data field needs a different byte width than $N already has.',
  zh: '后面要写入的 CPI 字段宽度和当前 $N 不一致时先转换。',
}

export const GLOSSARY_BY_ID: Record<string, GlossaryEntry> = {
  // ── Expr ──────────────────────────────────────────────
  not: E({
    id: 'not',
    display: '!',
    signature: 'not(x: Bool) → Bool',
    summary: {
      en: 'Logical NOT.',
      zh: '逻辑非。',
    },
    example: '!($0)',
  }),
  neg: E({
    id: 'neg',
    display: 'neg',
    signature: 'neg(x: signed|float) → same',
    summary: {
      en: 'Arithmetic negation.',
      zh: '算术取负。',
    },
    example: 'neg($0)',
  }),
  isZero: E({
    id: 'isZero',
    display: 'isZero',
    signature: 'isZero(x: Int) → Bool',
    summary: {
      en: 'True iff integer x == 0.',
      zh: '整数 x == 0 时为真。',
    },
    usage: {
      en: 'Close-empty-ATA / skip arms that key off a zero balance.',
      zh: '余额为 0 才 close ATA / Skip 等分支。',
    },
    example: 'isZero($3)',
  }),
  nonZero: E({
    id: 'nonZero',
    display: 'nonZero',
    signature: 'nonZero(x: Int) → Bool',
    summary: {
      en: 'True iff integer x != 0.',
      zh: '整数 x != 0 时为真。',
    },
    usage: {
      en: 'Cheap assert that a computed amount or balance is present.',
      zh: '快速断言计算结果或余额非零。',
    },
    example: 'assert nonZero($1)',
  }),
  asU8: E({
    id: 'asU8',
    display: 'asU8',
    signature: 'asU8(x: Int) → U8',
    summary: { en: 'Cast to u8 (truncates on narrow).', zh: '转为 u8（收窄截断）。' },
    usage: CAST_USAGE,
    example: 'asU8($0)',
  }),
  asU16: E({
    id: 'asU16',
    display: 'asU16',
    signature: 'asU16(x: Int) → U16',
    summary: { en: 'Cast to u16.', zh: '转为 u16。' },
    usage: CAST_USAGE,
    example: 'asU16($0)',
  }),
  asU32: E({
    id: 'asU32',
    display: 'asU32',
    signature: 'asU32(x: Int) → U32',
    summary: { en: 'Cast to u32.', zh: '转为 u32。' },
    usage: CAST_USAGE,
    example: 'asU32($0)',
  }),
  asU64: E({
    id: 'asU64',
    display: 'asU64',
    signature: 'asU64(x: Int) → U64',
    summary: { en: 'Cast to u64.', zh: '转为 u64。' },
    usage: CAST_USAGE,
    example: 'asU64($2)',
  }),
  asU128: E({
    id: 'asU128',
    display: 'asU128',
    signature: 'asU128(x: Int) → U128',
    summary: { en: 'Cast to u128 (widening safe).', zh: '转为 u128（拓宽安全）。' },
    usage: {
      en: 'Widen before mulDiv* to avoid intermediate overflow.',
      zh: '做 mulDiv* 前拓宽，避免中间溢出。',
    },
    example: 'asU128($0)',
  }),
  asI8: E({
    id: 'asI8',
    display: 'asI8',
    signature: 'asI8(x: Int) → I8',
    summary: { en: 'Cast to i8.', zh: '转为 i8。' },
    usage: CAST_USAGE,
    example: 'asI8($0)',
  }),
  asI16: E({
    id: 'asI16',
    display: 'asI16',
    signature: 'asI16(x: Int) → I16',
    summary: { en: 'Cast to i16.', zh: '转为 i16。' },
    usage: CAST_USAGE,
    example: 'asI16($0)',
  }),
  asI32: E({
    id: 'asI32',
    display: 'asI32',
    signature: 'asI32(x: Int) → I32',
    summary: { en: 'Cast to i32.', zh: '转为 i32。' },
    usage: CAST_USAGE,
    example: 'asI32($0)',
  }),
  asI64: E({
    id: 'asI64',
    display: 'asI64',
    signature: 'asI64(x: Int) → I64',
    summary: { en: 'Cast to i64.', zh: '转为 i64。' },
    usage: CAST_USAGE,
    example: 'asI64($0)',
  }),
  asI128: E({
    id: 'asI128',
    display: 'asI128',
    signature: 'asI128(x: Int) → I128',
    summary: { en: 'Cast to i128.', zh: '转为 i128。' },
    usage: CAST_USAGE,
    example: 'asI128($0)',
  }),
  add: E({
    id: 'add',
    display: '+',
    signature: 'add(a: T, b: T) → T',
    summary: { en: 'a + b (same arithmetic type).', zh: 'a + b（同类型）。' },
    example: '($0 + $1)',
  }),
  sub: E({
    id: 'sub',
    display: '-',
    signature: 'sub(a: T, b: T) → T',
    summary: { en: 'a − b (same arithmetic type).', zh: 'a − b（同类型）。' },
    example: '($2 - $0)',
  }),
  mul: E({
    id: 'mul',
    display: '*',
    signature: 'mul(a: T, b: T) → T',
    summary: { en: 'a × b (same arithmetic type).', zh: 'a × b（同类型）。' },
    example: '($0 * $1)',
  }),
  div: E({
    id: 'div',
    display: '/',
    signature: 'div(a: T, b: T) → T',
    summary: { en: 'Truncating division toward zero.', zh: '向零截断除法。' },
    example: '($0 / $1)',
  }),
  divFloor: E({
    id: 'divFloor',
    display: 'divFloor',
    signature: 'divFloor(a: T, b: T) → T',
    summary: { en: '⌊a / b⌋.', zh: '⌊a / b⌋。' },
    example: 'divFloor($0, $1)',
  }),
  divCeil: E({
    id: 'divCeil',
    display: 'divCeil',
    signature: 'divCeil(a: T, b: T) → T',
    summary: { en: '⌈a / b⌉.', zh: '⌈a / b⌉。' },
    example: 'divCeil($0, $1)',
  }),
  min: E({
    id: 'min',
    display: 'min',
    signature: 'min(a: T, b: T) → T',
    summary: { en: 'Minimum of two values.', zh: '两值取较小。' },
    example: 'min($0, $1)',
  }),
  max: E({
    id: 'max',
    display: 'max',
    signature: 'max(a: T, b: T) → T',
    summary: { en: 'Maximum of two values.', zh: '两值取较大。' },
    example: 'max($0, $1)',
  }),
  eq: E({
    id: 'eq',
    display: '==',
    signature: 'eq(a: T, b: T) → Bool',
    summary: { en: 'a == b.', zh: 'a == b。' },
    example: '($0 == $1)',
  }),
  ne: E({
    id: 'ne',
    display: '!=',
    signature: 'ne(a: T, b: T) → Bool',
    summary: { en: 'a != b.', zh: 'a != b。' },
    example: '($0 != $1)',
  }),
  gt: E({
    id: 'gt',
    display: '>',
    signature: 'gt(a: T, b: T) → Bool',
    summary: { en: 'a > b.', zh: 'a > b。' },
    example: '($0 > $1)',
  }),
  ge: E({
    id: 'ge',
    display: '>=',
    signature: 'ge(a: T, b: T) → Bool',
    summary: { en: 'a ≥ b.', zh: 'a ≥ b。' },
    example: '($0 >= $1)',
  }),
  lt: E({
    id: 'lt',
    display: '<',
    signature: 'lt(a: T, b: T) → Bool',
    summary: { en: 'a < b.', zh: 'a < b。' },
    example: '($0 < $1)',
  }),
  le: E({
    id: 'le',
    display: '<=',
    signature: 'le(a: T, b: T) → Bool',
    summary: { en: 'a ≤ b.', zh: 'a ≤ b。' },
    example: '($0 <= $1)',
  }),
  saturatingSub: E({
    id: 'saturatingSub',
    display: 'satSub',
    signature: 'saturatingSub(a: T, b: T) → T',
    summary: {
      en: 'a − b, clamped at the type minimum (0 if unsigned).',
      zh: 'a − b，不低于类型最小值（无符号为 0）。',
    },
    usage: {
      en: 'Deltas that must not underflow (fee / repay math).',
      zh: '不允许下溢的差额（手续费 / 还款等）。',
    },
    example: 'satSub($2, $0)',
  }),
  and: E({
    id: 'and',
    display: '&&',
    signature: 'and(a: Bool, b: Bool) → Bool',
    summary: { en: 'Logical AND.', zh: '逻辑与。' },
    example: '($0 && $1)',
  }),
  or: E({
    id: 'or',
    display: '||',
    signature: 'or(a: Bool, b: Bool) → Bool',
    summary: { en: 'Logical OR.', zh: '逻辑或。' },
    example: '($0 || $1)',
  }),
  bpsMulFloor: E({
    id: 'bpsMulFloor',
    display: 'bpsMulFloor',
    signature: 'bpsMulFloor(amount: U64, bps: U*) → U64',
    summary: {
      en: '⌊amount × bps / 10_000⌋.',
      zh: '⌊amount × bps / 10_000⌋。',
    },
    usage: {
      en: 'Fee / haircut in basis points, floor rounding.',
      zh: '按 bps 计费/折扣，向下取整。',
    },
    example: 'bpsMulFloor($0, $1)',
  }),
  bpsMulCeil: E({
    id: 'bpsMulCeil',
    display: 'bpsMulCeil',
    signature: 'bpsMulCeil(amount: U64, bps: U*) → U64',
    summary: {
      en: '⌈amount × bps / 10_000⌉.',
      zh: '⌈amount × bps / 10_000⌉。',
    },
    usage: {
      en: 'Same as floor, but ceil when the protocol charges up.',
      zh: '与 floor 相同场景；协议要向上取整时用。',
    },
    example: 'bpsMulCeil($0, $1)',
  }),
  mulDivFloor: E({
    id: 'mulDivFloor',
    display: 'mulDivFloor',
    signature: 'mulDivFloor(a, b, c) → type(a)',
    summary: {
      en: '⌊a × b / c⌋. a,b are U64/U128; c same or narrower unsigned.',
      zh: '⌊a × b / c⌋。a、b 为 U64/U128；c 同宽或更窄无符号。',
    },
    usage: {
      en: 'Pro-rata amounts without a separate widen step when types already fit.',
      zh: '按比例分配；类型已够宽时不必再手动拓宽。',
    },
    example: 'mulDivFloor($0, $1, $2)',
  }),
  mulDivCeil: E({
    id: 'mulDivCeil',
    display: 'mulDivCeil',
    signature: 'mulDivCeil(a, b, c) → type(a)',
    summary: {
      en: '⌈a × b / c⌉.',
      zh: '⌈a × b / c⌉。',
    },
    example: 'mulDivCeil($0, $1, $2)',
  }),
  clamp: E({
    id: 'clamp',
    display: 'clamp',
    signature: 'clamp(value: T, lo: T, hi: T) → T',
    summary: {
      en: 'Clamp value into [lo, hi].',
      zh: '将 value 限制在 [lo, hi]。',
    },
    example: 'clamp($0, $1, $2)',
  }),
  select: E({
    id: 'select',
    display: 'select',
    signature: 'select(cond: Bool, then: T, else: T) → T',
    summary: {
      en: 'cond ? then : else (branches same type).',
      zh: 'cond ? then : else（分支同类型）。',
    },
    usage: {
      en: 'Pick an amount in-expression without a second let.',
      zh: '在表达式里选值，不必再写一条 let。',
    },
    example: 'select($0, $1, $2)',
  }),

  // ── Let bindings (generic) ────────────────────────────
  accountLamports: L({
    id: 'accountLamports',
    display: 'accountLamports',
    signature: 'accountLamports(#account) → U64',
    summary: {
      en: 'Lamports balance of account #account.',
      zh: '#account 账户的 lamports 余额。',
    },
    usage: {
      en: 'Before/after snapshots for rent, repay, or sponsored fees.',
      zh: '租约、还款、代付手续费等场景的前后快照。',
    },
    example: '$0 ← accountLamports(#0)',
  }),
  accountDataLen: L({
    id: 'accountDataLen',
    display: 'accountDataLen',
    signature: 'accountDataLen(#account) → U32',
    summary: {
      en: 'Byte length of account #account’s data.',
      zh: '#account 账户数据的字节长度。',
    },
    example: '$0 ← accountDataLen(#0)',
  }),
  accountDataSlice: L({
    id: 'accountDataSlice',
    display: 'accountDataSlice',
    signature:
      'accountDataSlice(#account, offset, ty, #expectedOwner) → ty',
    summary: {
      en: 'Read account #account’s data at offset as type ty. #expectedOwner must be the program that owns that account (safety check).',
      zh: '从 #account 账户数据的 offset 处按类型 ty 读取。#expectedOwner 须是该账户所属程序（安全校验）。',
    },
    usage: {
      en: 'When no ready-made let fits the layout (custom programs / DEXes).',
      zh: '没有现成 let 能读这种布局时用（自定义程序 / DEX）。',
    },
    example: '$0 ← accountDataSlice(#1, off=64, u64)',
  }),
  accountKey: L({
    id: 'accountKey',
    display: 'accountKey',
    signature: 'accountKey(#account) → Pubkey',
    summary: {
      en: 'Address (pubkey) of account #account.',
      zh: '#account 账户的地址（公钥）。',
    },
    usage: {
      en: 'Prefer this when the account is already on the instruction — no need to hard-code the pubkey.',
      zh: '账户已在本指令里时优先用这个，不必把公钥写死在数据里。',
    },
    example: '$0 ← accountKey(#0)',
  }),
  constPubkey: L({
    id: 'constPubkey',
    display: 'constPubkey',
    signature: 'constPubkey(pubkey) → Pubkey',
    summary: {
      en: 'A fixed pubkey baked into the instruction data.',
      zh: '写死在指令数据里的公钥常量。',
    },
    usage: {
      en: 'Known program / mint addresses that are not passed as accounts.',
      zh: '已知的 program / mint 地址，且没有作为账户传进来时。',
    },
    example: '$0 ← constPubkey(Tokenkeg…)',
  }),
  accountIsSigner: accountFieldLet(
    'accountIsSigner',
    'Bool',
    'Whether it signed this transaction',
    '是否在本交易中签名',
  ),
  accountIsWritable: accountFieldLet(
    'accountIsWritable',
    'Bool',
    'Whether it is writable in this instruction',
    '在本指令中是否可写',
  ),
  accountProgramOwner: accountFieldLet(
    'accountProgramOwner',
    'Pubkey',
    'Owning program id',
    '所属程序 id',
  ),
  accountExecutable: accountFieldLet(
    'accountExecutable',
    'Bool',
    'Whether the account is executable (a program)',
    '是否可执行（是否为程序账户）',
  ),
  accountRentEpoch: accountFieldLet(
    'accountRentEpoch',
    'U64',
    'Rent epoch',
    'rent epoch',
  ),
  frameGeneration: L({
    id: 'frameGeneration',
    display: 'frameGeneration',
    signature: 'frameGeneration() → U64',
    summary: {
      en: 'Frame generation counter — increments each time the Frame is reset.',
      zh: 'Frame 代数计数；每次 reset 会加一。',
    },
    example: '$0 ← frameGeneration',
  }),
  frameIndexCount: L({
    id: 'frameIndexCount',
    display: 'frameIndexCount',
    signature: 'frameIndexCount() → U16',
    summary: {
      en: 'How many $N variables are currently stored on the Frame.',
      zh: 'Frame 上当前已有多少个 $N 变量。',
    },
    example: '$0 ← frameIndexCount',
  }),
  sysvarClockSlot: sysvarLet(
    'sysvarClockSlot',
    'U64',
    'slot',
    '当前 slot',
  ),
  sysvarClockEpochStartTimestamp: sysvarLet(
    'sysvarClockEpochStartTimestamp',
    'U64',
    'epoch_start_timestamp',
    '本 epoch 起始时间戳',
  ),
  sysvarClockEpoch: sysvarLet(
    'sysvarClockEpoch',
    'U64',
    'epoch',
    '当前 epoch',
  ),
  sysvarClockLeaderScheduleEpoch: sysvarLet(
    'sysvarClockLeaderScheduleEpoch',
    'U64',
    'leader_schedule_epoch',
    'leader schedule epoch',
  ),
  sysvarClockUnixTimestamp: sysvarLet(
    'sysvarClockUnixTimestamp',
    'U64',
    'unix_timestamp',
    'Unix 时间戳',
  ),
  sysvarRentMinimumBalance: L({
    id: 'sysvarRentMinimumBalance',
    display: 'sysvarRentMinimumBalance',
    signature: 'sysvarRentMinimumBalance(dataLen: U32) → U64',
    summary: {
      en: 'Minimum lamports to keep an account of dataLen bytes rent-exempt.',
      zh: 'dataLen 字节的账户要免租，至少需要多少 lamports。',
    },
    usage: {
      en: 'Compare with a measured balance when creating or funding accounts.',
      zh: '创建或注资账户时，和实测余额对比。',
    },
    example: '$0 ← sysvarRentMinimumBalance(dataLen=165)',
  }),

  // SPL Token
  splTokenAccountAmount: accountFieldLet(
    'splTokenAccountAmount',
    'U64',
    'Token balance',
    '代币余额',
    { accountKind: 'SPL Token' },
  ),
  splTokenAccountDelegatedAmount: accountFieldLet(
    'splTokenAccountDelegatedAmount',
    'U64',
    'Delegated token amount',
    '已委托的代币数量',
    { accountKind: 'SPL Token' },
  ),
  splTokenAccountState: accountFieldLet(
    'splTokenAccountState',
    'U8',
    'Token account state',
    'Token 账户状态',
    { accountKind: 'SPL Token' },
  ),
  splMintSupply: accountFieldLet(
    'splMintSupply',
    'U64',
    'Mint supply',
    'Mint 总供应量',
    { accountKind: 'SPL Token mint' },
  ),
  splMintDecimals: accountFieldLet(
    'splMintDecimals',
    'U8',
    'Mint decimals',
    'Mint 小数位',
    { accountKind: 'SPL Token mint' },
  ),
  splMintIsInitialized: accountFieldLet(
    'splMintIsInitialized',
    'Bool',
    'Whether the mint is initialized',
    'Mint 是否已初始化',
    { accountKind: 'SPL Token mint' },
  ),
  splMintMintAuthority: accountFieldLet(
    'splMintMintAuthority',
    'Pubkey',
    'Mint authority (errors if unset)',
    'Mint 权限（未设置会失败）',
    { accountKind: 'SPL Token mint' },
  ),
  splMintFreezeAuthority: accountFieldLet(
    'splMintFreezeAuthority',
    'Pubkey',
    'Freeze authority (errors if unset)',
    '冻结权限（未设置会失败）',
    { accountKind: 'SPL Token mint' },
  ),
  splTokenAccountMint: accountFieldLet(
    'splTokenAccountMint',
    'Pubkey',
    'Mint of this token account',
    '该 Token 账户对应的 mint',
    { accountKind: 'SPL Token' },
  ),
  splTokenAccountOwner: accountFieldLet(
    'splTokenAccountOwner',
    'Pubkey',
    'Owner of this token account',
    '该 Token 账户的 owner',
    { accountKind: 'SPL Token' },
  ),
  splTokenAccountDelegate: accountFieldLet(
    'splTokenAccountDelegate',
    'Pubkey',
    'Delegate (errors if unset)',
    'Delegate（未设置会失败）',
    { accountKind: 'SPL Token' },
  ),
  splTokenAccountCloseAuthority: accountFieldLet(
    'splTokenAccountCloseAuthority',
    'Pubkey',
    'Close authority (errors if unset)',
    '关闭权限（未设置会失败）',
    { accountKind: 'SPL Token' },
  ),
  splTokenAccountIsNative: accountFieldLet(
    'splTokenAccountIsNative',
    'Bool',
    'Whether this is native SOL (WSOL)',
    '是否为原生 SOL（WSOL）',
    { accountKind: 'SPL Token' },
  ),
  splTokenAccountOwnerIsDerived: accountFieldLet(
    'splTokenAccountOwnerIsDerived',
    'Bool',
    'Whether the owner is a derived PDA',
    'owner 是否为派生 PDA',
    { accountKind: 'SPL Token' },
  ),

  // Token-2022
  splToken2022AccountAmount: accountFieldLet(
    'splToken2022AccountAmount',
    'U64',
    'Token-2022 balance',
    'Token-2022 余额',
    { accountKind: 'Token-2022' },
  ),
  splToken2022AccountDelegatedAmount: accountFieldLet(
    'splToken2022AccountDelegatedAmount',
    'U64',
    'Token-2022 delegated amount',
    'Token-2022 已委托数量',
    { accountKind: 'Token-2022' },
  ),
  splToken2022AccountState: accountFieldLet(
    'splToken2022AccountState',
    'U8',
    'Token-2022 account state',
    'Token-2022 账户状态',
    { accountKind: 'Token-2022' },
  ),
  splToken2022MintSupply: accountFieldLet(
    'splToken2022MintSupply',
    'U64',
    'Token-2022 mint supply',
    'Token-2022 mint 供应量',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022MintDecimals: accountFieldLet(
    'splToken2022MintDecimals',
    'U8',
    'Token-2022 decimals',
    'Token-2022 小数位',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022AccountTransferFeeWithheld: accountFieldLet(
    'splToken2022AccountTransferFeeWithheld',
    'U64',
    'Transfer fee withheld on this account',
    '该账户上暂扣的转账费',
    { accountKind: 'Token-2022' },
  ),
  splToken2022MintTransferFeeBasisPoints: accountFieldLet(
    'splToken2022MintTransferFeeBasisPoints',
    'U8',
    'Transfer-fee bps on the mint',
    'Mint 上的转账费 bps',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022MintTransferFeeMaximum: accountFieldLet(
    'splToken2022MintTransferFeeMaximum',
    'U64',
    'Max transfer fee on the mint',
    'Mint 转账费上限',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022MintWithheldAmount: accountFieldLet(
    'splToken2022MintWithheldAmount',
    'U64',
    'Total withheld amount on the mint',
    'Mint 上暂扣总额',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022MintDefaultAccountState: accountFieldLet(
    'splToken2022MintDefaultAccountState',
    'U8',
    'Default account state extension',
    '默认账户状态扩展',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022MintIsInitialized: accountFieldLet(
    'splToken2022MintIsInitialized',
    'Bool',
    'Whether the Token-2022 mint is initialized',
    'Token-2022 mint 是否已初始化',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022MintMintAuthority: accountFieldLet(
    'splToken2022MintMintAuthority',
    'Pubkey',
    'Token-2022 mint authority',
    'Token-2022 mint 权限',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022MintFreezeAuthority: accountFieldLet(
    'splToken2022MintFreezeAuthority',
    'Pubkey',
    'Token-2022 freeze authority',
    'Token-2022 冻结权限',
    { accountKind: 'Token-2022 mint' },
  ),
  splToken2022AccountMint: accountFieldLet(
    'splToken2022AccountMint',
    'Pubkey',
    'Mint of this Token-2022 account',
    '该 Token-2022 账户的 mint',
    { accountKind: 'Token-2022' },
  ),
  splToken2022AccountOwner: accountFieldLet(
    'splToken2022AccountOwner',
    'Pubkey',
    'Owner of this Token-2022 account',
    '该 Token-2022 账户的 owner',
    { accountKind: 'Token-2022' },
  ),
  splToken2022AccountDelegate: accountFieldLet(
    'splToken2022AccountDelegate',
    'Pubkey',
    'Token-2022 delegate',
    'Token-2022 delegate',
    { accountKind: 'Token-2022' },
  ),
  splToken2022AccountCloseAuthority: accountFieldLet(
    'splToken2022AccountCloseAuthority',
    'Pubkey',
    'Token-2022 close authority',
    'Token-2022 关闭权限',
    { accountKind: 'Token-2022' },
  ),
  splToken2022AccountIsNative: accountFieldLet(
    'splToken2022AccountIsNative',
    'Bool',
    'Whether this Token-2022 account is native SOL',
    '该 Token-2022 账户是否为原生 SOL',
    { accountKind: 'Token-2022' },
  ),
  splToken2022AccountOwnerIsDerived: accountFieldLet(
    'splToken2022AccountOwnerIsDerived',
    'Bool',
    'Whether the Token-2022 owner is a derived PDA',
    'Token-2022 owner 是否为派生 PDA',
    { accountKind: 'Token-2022' },
  ),

  // Stake
  stakeDelegationStake: accountFieldLet(
    'stakeDelegationStake',
    'U64',
    'Delegated stake (lamports)',
    '已委托的 stake（lamports）',
    { accountKind: 'Stake' },
  ),
  stakeDelegationActivationEpoch: accountFieldLet(
    'stakeDelegationActivationEpoch',
    'U64',
    'Activation epoch',
    '激活 epoch',
    { accountKind: 'Stake' },
  ),
  stakeDelegationDeactivationEpoch: accountFieldLet(
    'stakeDelegationDeactivationEpoch',
    'U64',
    'Deactivation epoch',
    '停用 epoch',
    { accountKind: 'Stake' },
  ),
  stakeLockupUnixTimestamp: accountFieldLet(
    'stakeLockupUnixTimestamp',
    'U64',
    'Lockup unix timestamp',
    'Lockup 的 Unix 时间',
    { accountKind: 'Stake' },
  ),
  stakeLockupEpoch: accountFieldLet(
    'stakeLockupEpoch',
    'U64',
    'Lockup epoch',
    'Lockup epoch',
    { accountKind: 'Stake' },
  ),
  stakeAuthorizedStaker: accountFieldLet(
    'stakeAuthorizedStaker',
    'Pubkey',
    'Authorized staker',
    '授权 staker',
    { accountKind: 'Stake' },
  ),
  stakeAuthorizedWithdrawer: accountFieldLet(
    'stakeAuthorizedWithdrawer',
    'Pubkey',
    'Authorized withdrawer',
    '授权 withdrawer',
    { accountKind: 'Stake' },
  ),
  stakeDelegationVoter: accountFieldLet(
    'stakeDelegationVoter',
    'Pubkey',
    'Vote account this stake delegates to',
    '委托到的 vote 账户',
    { accountKind: 'Stake' },
  ),
  stakeAccountState: accountFieldLet(
    'stakeAccountState',
    'U8',
    'Stake account state',
    'Stake 账户状态',
    { accountKind: 'Stake' },
  ),
  stakeLockupCustodian: accountFieldLet(
    'stakeLockupCustodian',
    'Pubkey',
    'Lockup custodian',
    'Lockup 托管人',
    { accountKind: 'Stake' },
  ),
  stakeRentExemptReserve: accountFieldLet(
    'stakeRentExemptReserve',
    'U64',
    'Rent-exempt reserve',
    '免租储备',
    { accountKind: 'Stake' },
  ),
  stakeCreditsObserved: accountFieldLet(
    'stakeCreditsObserved',
    'U64',
    'Credits observed',
    '已观察 credits',
    { accountKind: 'Stake' },
  ),
  stakeStakeFlags: accountFieldLet(
    'stakeStakeFlags',
    'U8',
    'Stake flags',
    'Stake 标志位',
    { accountKind: 'Stake' },
  ),

  // Upgradeable loader
  upgradeableProgramDataTag: accountFieldLet(
    'upgradeableProgramDataTag',
    'U8',
    'ProgramData account tag',
    'ProgramData 账户标记',
    { accountKind: 'upgradeable loader ProgramData' },
  ),
  upgradeableProgramDataUpgradeAuthority: accountFieldLet(
    'upgradeableProgramDataUpgradeAuthority',
    'Pubkey',
    'Upgrade authority',
    '升级权限',
    { accountKind: 'upgradeable loader ProgramData' },
  ),
  upgradeableProgramProgramDataAddress: accountFieldLet(
    'upgradeableProgramProgramDataAddress',
    'Pubkey',
    'Linked ProgramData address',
    '关联的 ProgramData 地址',
    { accountKind: 'upgradeable loader program' },
  ),
}

/** Display token in L1 → glossary id. */
const DISPLAY_TO_ID: Record<string, string> = {
  ...Object.fromEntries(
    Object.values(GLOSSARY_BY_ID).map((e) => [e.display, e.id]),
  ),
  saturatingSub: 'saturatingSub',
  '!': 'not',
}

const NAMED_TOKENS = Object.keys(DISPLAY_TO_ID)
  .filter((t) => /^[A-Za-z_]/.test(t))
  .sort((a, b) => b.length - a.length)

const DISPLAY_TOKEN_RE = new RegExp(
  [
    String.raw`\b(?:${NAMED_TOKENS.map(escapeRe).join('|')})\b`,
    String.raw`>=|<=|==|!=|&&|\|\|`,
    String.raw`!(?=\()`,
    // Binary `-` is always spaced (`a - b`); bare `-$N` is unary neg — skip it.
    String.raw`(?<=\s)-(?=\s)`,
    String.raw`(?<![$\w])(?:[>+*/](?!=)|<(?!=))`,
  ].join('|'),
  'g',
)

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function lookupGlossary(displayToken: string): GlossaryEntry | null {
  const id = DISPLAY_TO_ID[displayToken]
  if (!id) return null
  return GLOSSARY_BY_ID[id] ?? null
}

/** @deprecated use GlossaryEntry */
export type ExprGlossaryEntry = GlossaryEntry

export function splitExprGlossaryTokens(
  text: string,
): Array<
  | { kind: 'text'; text: string }
  | { kind: 'op'; token: string; entry: GlossaryEntry }
> {
  const out: Array<
    | { kind: 'text'; text: string }
    | { kind: 'op'; token: string; entry: GlossaryEntry }
  > = []
  let last = 0
  DISPLAY_TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = DISPLAY_TOKEN_RE.exec(text)) !== null) {
    const token = m[0]!
    const entry = lookupGlossary(token)
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
