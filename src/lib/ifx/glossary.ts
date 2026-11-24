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

/** Read a typed field from remaining[#i] (owner-checked programs). */
function accountFieldLet(
  id: string,
  result: string,
  fieldEn: string,
  fieldZh: string,
  opts?: { owner?: string; usageEn?: string; usageZh?: string },
): GlossaryEntry {
  const owner = opts?.owner
  return L({
    id,
    display: id,
    signature: `${id}(#account) → ${result}`,
    summary: {
      en: owner
        ? `Read ${fieldEn} from remaining[#account] (owner ${owner}).`
        : `Read ${fieldEn} from remaining[#account].`,
      zh: owner
        ? `从 remaining[#account] 读取${fieldZh}（owner 须为 ${owner}）。`
        : `从 remaining[#account] 读取${fieldZh}。`,
    },
    usage: {
      en: opts?.usageEn ?? 'Use when the next assert / CPI patch needs this on-chain field.',
      zh: opts?.usageZh ?? '后续 assert / CPI patch 需要该链上字段时使用。',
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
      en: `Read Clock sysvar field: ${fieldEn}. No remaining account.`,
      zh: `读取 Clock sysvar：${fieldZh}。不占用 remaining。`,
    },
    usage: {
      en: 'Time / epoch gates without passing the sysvar account yourself.',
      zh: '做时间/epoch 门控，不必自己传 sysvar 账户。',
    },
    example: `$0 ← ${id}`,
  })
}

const CAST_USAGE = {
  en: 'Cast before a raw CPI patch whose slot width differs from the source binding.',
  zh: 'Raw CPI patch 槽宽与源 binding 不一致时，先转换再 patch。',
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
      en: 'Lamport balance of remaining[#account].',
      zh: 'remaining[#account] 的 lamports 余额。',
    },
    usage: {
      en: 'Baseline / after snapshots for rent, repay, sponsored gas.',
      zh: '租约、还款、代付 gas 等前后快照。',
    },
    example: '$0 ← accountLamports(#0)',
  }),
  accountDataLen: L({
    id: 'accountDataLen',
    display: 'accountDataLen',
    signature: 'accountDataLen(#account) → U32',
    summary: {
      en: 'Data length of remaining[#account].',
      zh: 'remaining[#account] 的 data 长度。',
    },
    example: '$0 ← accountDataLen(#0)',
  }),
  accountDataSlice: L({
    id: 'accountDataSlice',
    display: 'accountDataSlice',
    signature:
      'accountDataSlice(#account, offset, ty, #expectedOwner) → ty',
    summary: {
      en: 'Owner-checked raw read: data[offset..] as ty. expectedOwner is a remaining index whose pubkey must equal the account owner.',
      zh: '带 owner 校验的原始读取：data[offset..] 按 ty 解读；expectedOwner 为 remaining 下标，其 pubkey 须等于账户 owner。',
    },
    usage: {
      en: 'Escape hatch when no typed let covers the layout (custom / DEX).',
      zh: '没有对应 typed let 时的逃生舱（自定义 / DEX 布局）。',
    },
    example: '$0 ← accountDataSlice(#1, off=64, u64)',
  }),
  accountKey: L({
    id: 'accountKey',
    display: 'accountKey',
    signature: 'accountKey(#account) → Pubkey',
    summary: {
      en: 'Pubkey of remaining[#account] (ALT-friendly).',
      zh: 'remaining[#account] 的公钥（对 ALT 友好）。',
    },
    usage: {
      en: 'Prefer over constPubkey when the key is already in the tx.',
      zh: '账户已在交易里时，优先于 constPubkey。',
    },
    example: '$0 ← accountKey(#0)',
  }),
  constPubkey: L({
    id: 'constPubkey',
    display: 'constPubkey',
    signature: 'constPubkey(pubkey) → Pubkey',
    summary: {
      en: 'Embed a pubkey literal in ix data.',
      zh: '在指令 data 里嵌入公钥字面量。',
    },
    usage: {
      en: 'Fixed program / mint ids not present as accounts.',
      zh: '固定 program / mint，且未作为账户传入时。',
    },
    example: '$0 ← constPubkey(Tokenkeg…)',
  }),
  accountIsSigner: accountFieldLet(
    'accountIsSigner',
    'Bool',
    'is_signer',
    '是否签名者',
  ),
  accountIsWritable: accountFieldLet(
    'accountIsWritable',
    'Bool',
    'is_writable',
    '是否可写',
  ),
  accountProgramOwner: accountFieldLet(
    'accountProgramOwner',
    'Pubkey',
    'owner program id',
    'owner 程序 id',
  ),
  accountExecutable: accountFieldLet(
    'accountExecutable',
    'Bool',
    'executable flag',
    '是否可执行',
  ),
  accountRentEpoch: accountFieldLet(
    'accountRentEpoch',
    'U64',
    'rent_epoch',
    'rent_epoch',
  ),
  frameGeneration: L({
    id: 'frameGeneration',
    display: 'frameGeneration',
    signature: 'frameGeneration() → U64',
    summary: {
      en: 'Current Frame generation counter (bumps on reset).',
      zh: '当前 Frame 的 generation（reset 时递增）。',
    },
    example: '$0 ← frameGeneration',
  }),
  frameIndexCount: L({
    id: 'frameIndexCount',
    display: 'frameIndexCount',
    signature: 'frameIndexCount() → U16',
    summary: {
      en: 'Number of bindings currently on the Frame tape.',
      zh: 'Frame tape 上当前 binding 数量。',
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
      en: 'Rent-exempt minimum lamports for an account of dataLen bytes.',
      zh: 'dataLen 字节账户的免租最低 lamports。',
    },
    usage: {
      en: 'Compare against measured lamports when creating accounts.',
      zh: '建账户时与实测 lamports 比较。',
    },
    example: '$0 ← sysvarRentMinimumBalance(dataLen=165)',
  }),

  // SPL Token
  splTokenAccountAmount: accountFieldLet(
    'splTokenAccountAmount',
    'U64',
    'token amount',
    '代币数量',
    { owner: 'spl_token' },
  ),
  splTokenAccountDelegatedAmount: accountFieldLet(
    'splTokenAccountDelegatedAmount',
    'U64',
    'delegated_amount',
    '委托数量',
    { owner: 'spl_token' },
  ),
  splTokenAccountState: accountFieldLet(
    'splTokenAccountState',
    'U8',
    'account state enum',
    '账户 state',
    { owner: 'spl_token' },
  ),
  splMintSupply: accountFieldLet(
    'splMintSupply',
    'U64',
    'mint supply',
    'mint 供应量',
    { owner: 'spl_token' },
  ),
  splMintDecimals: accountFieldLet(
    'splMintDecimals',
    'U8',
    'mint decimals',
    'mint decimals',
    { owner: 'spl_token' },
  ),
  splMintIsInitialized: accountFieldLet(
    'splMintIsInitialized',
    'Bool',
    'mint is_initialized',
    'mint 是否已初始化',
    { owner: 'spl_token' },
  ),
  splMintMintAuthority: accountFieldLet(
    'splMintMintAuthority',
    'Pubkey',
    'mint authority (errors if none)',
    'mint authority（空则报错）',
    { owner: 'spl_token' },
  ),
  splMintFreezeAuthority: accountFieldLet(
    'splMintFreezeAuthority',
    'Pubkey',
    'freeze authority (errors if none)',
    'freeze authority（空则报错）',
    { owner: 'spl_token' },
  ),
  splTokenAccountMint: accountFieldLet(
    'splTokenAccountMint',
    'Pubkey',
    'token account mint',
    'token 账户的 mint',
    { owner: 'spl_token' },
  ),
  splTokenAccountOwner: accountFieldLet(
    'splTokenAccountOwner',
    'Pubkey',
    'token account owner',
    'token 账户 owner',
    { owner: 'spl_token' },
  ),
  splTokenAccountDelegate: accountFieldLet(
    'splTokenAccountDelegate',
    'Pubkey',
    'delegate (errors if none)',
    'delegate（空则报错）',
    { owner: 'spl_token' },
  ),
  splTokenAccountCloseAuthority: accountFieldLet(
    'splTokenAccountCloseAuthority',
    'Pubkey',
    'close authority (errors if none)',
    'close authority（空则报错）',
    { owner: 'spl_token' },
  ),
  splTokenAccountIsNative: accountFieldLet(
    'splTokenAccountIsNative',
    'Bool',
    'is_native (WSOL)',
    '是否原生（WSOL）',
    { owner: 'spl_token' },
  ),
  splTokenAccountOwnerIsDerived: accountFieldLet(
    'splTokenAccountOwnerIsDerived',
    'Bool',
    'owner is PDA-derived',
    'owner 是否为派生 PDA',
    { owner: 'spl_token' },
  ),

  // Token-2022 (same shapes)
  splToken2022AccountAmount: accountFieldLet(
    'splToken2022AccountAmount',
    'U64',
    'Token-2022 amount',
    'Token-2022 数量',
    { owner: 'token-2022' },
  ),
  splToken2022AccountDelegatedAmount: accountFieldLet(
    'splToken2022AccountDelegatedAmount',
    'U64',
    'Token-2022 delegated_amount',
    'Token-2022 委托数量',
    { owner: 'token-2022' },
  ),
  splToken2022AccountState: accountFieldLet(
    'splToken2022AccountState',
    'U8',
    'Token-2022 state',
    'Token-2022 state',
    { owner: 'token-2022' },
  ),
  splToken2022MintSupply: accountFieldLet(
    'splToken2022MintSupply',
    'U64',
    'Token-2022 mint supply',
    'Token-2022 mint 供应量',
    { owner: 'token-2022' },
  ),
  splToken2022MintDecimals: accountFieldLet(
    'splToken2022MintDecimals',
    'U8',
    'Token-2022 decimals',
    'Token-2022 decimals',
    { owner: 'token-2022' },
  ),
  splToken2022AccountTransferFeeWithheld: accountFieldLet(
    'splToken2022AccountTransferFeeWithheld',
    'U64',
    'withheld transfer fee on account',
    '账户上暂扣的 transfer fee',
    { owner: 'token-2022' },
  ),
  splToken2022MintTransferFeeBasisPoints: accountFieldLet(
    'splToken2022MintTransferFeeBasisPoints',
    'U8',
    'mint transfer-fee bps',
    'mint transfer-fee bps',
    { owner: 'token-2022' },
  ),
  splToken2022MintTransferFeeMaximum: accountFieldLet(
    'splToken2022MintTransferFeeMaximum',
    'U64',
    'mint transfer-fee maximum',
    'mint transfer-fee 上限',
    { owner: 'token-2022' },
  ),
  splToken2022MintWithheldAmount: accountFieldLet(
    'splToken2022MintWithheldAmount',
    'U64',
    'mint withheld amount',
    'mint 暂扣总额',
    { owner: 'token-2022' },
  ),
  splToken2022MintDefaultAccountState: accountFieldLet(
    'splToken2022MintDefaultAccountState',
    'U8',
    'default account state extension',
    '默认账户 state 扩展',
    { owner: 'token-2022' },
  ),
  splToken2022MintIsInitialized: accountFieldLet(
    'splToken2022MintIsInitialized',
    'Bool',
    'Token-2022 mint initialized',
    'Token-2022 mint 是否已初始化',
    { owner: 'token-2022' },
  ),
  splToken2022MintMintAuthority: accountFieldLet(
    'splToken2022MintMintAuthority',
    'Pubkey',
    'Token-2022 mint authority',
    'Token-2022 mint authority',
    { owner: 'token-2022' },
  ),
  splToken2022MintFreezeAuthority: accountFieldLet(
    'splToken2022MintFreezeAuthority',
    'Pubkey',
    'Token-2022 freeze authority',
    'Token-2022 freeze authority',
    { owner: 'token-2022' },
  ),
  splToken2022AccountMint: accountFieldLet(
    'splToken2022AccountMint',
    'Pubkey',
    'Token-2022 account mint',
    'Token-2022 账户 mint',
    { owner: 'token-2022' },
  ),
  splToken2022AccountOwner: accountFieldLet(
    'splToken2022AccountOwner',
    'Pubkey',
    'Token-2022 account owner',
    'Token-2022 账户 owner',
    { owner: 'token-2022' },
  ),
  splToken2022AccountDelegate: accountFieldLet(
    'splToken2022AccountDelegate',
    'Pubkey',
    'Token-2022 delegate',
    'Token-2022 delegate',
    { owner: 'token-2022' },
  ),
  splToken2022AccountCloseAuthority: accountFieldLet(
    'splToken2022AccountCloseAuthority',
    'Pubkey',
    'Token-2022 close authority',
    'Token-2022 close authority',
    { owner: 'token-2022' },
  ),
  splToken2022AccountIsNative: accountFieldLet(
    'splToken2022AccountIsNative',
    'Bool',
    'Token-2022 is_native',
    'Token-2022 is_native',
    { owner: 'token-2022' },
  ),
  splToken2022AccountOwnerIsDerived: accountFieldLet(
    'splToken2022AccountOwnerIsDerived',
    'Bool',
    'Token-2022 owner is derived',
    'Token-2022 owner 是否派生',
    { owner: 'token-2022' },
  ),

  // Stake
  stakeDelegationStake: accountFieldLet(
    'stakeDelegationStake',
    'U64',
    'delegated stake lamports',
    '委托 stake lamports',
    { owner: 'stake' },
  ),
  stakeDelegationActivationEpoch: accountFieldLet(
    'stakeDelegationActivationEpoch',
    'U64',
    'activation epoch',
    '激活 epoch',
    { owner: 'stake' },
  ),
  stakeDelegationDeactivationEpoch: accountFieldLet(
    'stakeDelegationDeactivationEpoch',
    'U64',
    'deactivation epoch',
    '停用 epoch',
    { owner: 'stake' },
  ),
  stakeLockupUnixTimestamp: accountFieldLet(
    'stakeLockupUnixTimestamp',
    'U64',
    'lockup unix timestamp',
    'lockup Unix 时间',
    { owner: 'stake' },
  ),
  stakeLockupEpoch: accountFieldLet(
    'stakeLockupEpoch',
    'U64',
    'lockup epoch',
    'lockup epoch',
    { owner: 'stake' },
  ),
  stakeAuthorizedStaker: accountFieldLet(
    'stakeAuthorizedStaker',
    'Pubkey',
    'authorized staker',
    'authorized staker',
    { owner: 'stake' },
  ),
  stakeAuthorizedWithdrawer: accountFieldLet(
    'stakeAuthorizedWithdrawer',
    'Pubkey',
    'authorized withdrawer',
    'authorized withdrawer',
    { owner: 'stake' },
  ),
  stakeDelegationVoter: accountFieldLet(
    'stakeDelegationVoter',
    'Pubkey',
    'delegation voter',
    'delegation voter',
    { owner: 'stake' },
  ),
  stakeAccountState: accountFieldLet(
    'stakeAccountState',
    'U8',
    'stake account state tag',
    'stake 账户 state',
    { owner: 'stake' },
  ),
  stakeLockupCustodian: accountFieldLet(
    'stakeLockupCustodian',
    'Pubkey',
    'lockup custodian',
    'lockup custodian',
    { owner: 'stake' },
  ),
  stakeRentExemptReserve: accountFieldLet(
    'stakeRentExemptReserve',
    'U64',
    'rent-exempt reserve',
    '免租储备',
    { owner: 'stake' },
  ),
  stakeCreditsObserved: accountFieldLet(
    'stakeCreditsObserved',
    'U64',
    'credits_observed',
    'credits_observed',
    { owner: 'stake' },
  ),
  stakeStakeFlags: accountFieldLet(
    'stakeStakeFlags',
    'U8',
    'stake flags',
    'stake flags',
    { owner: 'stake' },
  ),

  // Upgradeable loader
  upgradeableProgramDataTag: accountFieldLet(
    'upgradeableProgramDataTag',
    'U8',
    'ProgramData account tag',
    'ProgramData 账户 tag',
    { owner: 'BPF upgradeable loader' },
  ),
  upgradeableProgramDataUpgradeAuthority: accountFieldLet(
    'upgradeableProgramDataUpgradeAuthority',
    'Pubkey',
    'upgrade authority',
    '升级权限',
    { owner: 'BPF upgradeable loader' },
  ),
  upgradeableProgramProgramDataAddress: accountFieldLet(
    'upgradeableProgramProgramDataAddress',
    'Pubkey',
    'programdata address',
    'programdata 地址',
    { owner: 'BPF upgradeable loader' },
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
