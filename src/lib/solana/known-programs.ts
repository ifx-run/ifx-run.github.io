/**
 * Well-known Solana programs + common instruction discriminators.
 * Prefer human names in the Explorer; always keep program id / raw data visible too.
 */

export type KnownProgram = {
  id: string
  /** Internal slug (system, token, …). */
  short: string
  /** List / detail display name without trailing "Program". */
  label: string
}

export type KnownInstruction = {
  program: KnownProgram
  /** Snake / camel function-style name. */
  name: string
  /** Title Case label. */
  label: string
  /** One-line summary including decoded scalars when available. */
  summary: string
  /** Structured arg preview (lamports, amount, …). */
  args?: Record<string, string | number>
}

const PROGRAMS = {
  system: {
    id: '11111111111111111111111111111111',
    short: 'system',
    label: 'System',
  },
  computeBudget: {
    id: 'ComputeBudget111111111111111111111111111111',
    short: 'compute_budget',
    label: 'Compute Budget',
  },
  token: {
    id: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    short: 'token',
    label: 'Token',
  },
  token2022: {
    id: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    short: 'token2022',
    label: 'Token-2022',
  },
  ata: {
    id: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    short: 'ata',
    label: 'Associated Token',
  },
  stake: {
    id: 'Stake11111111111111111111111111111111111111',
    short: 'stake',
    label: 'Stake',
  },
  vote: {
    id: 'Vote111111111111111111111111111111111111111',
    short: 'vote',
    label: 'Vote',
  },
  alt: {
    id: 'AddressLookupTab1e1111111111111111111111111',
    short: 'alt',
    label: 'Address Lookup Table',
  },
  memo: {
    id: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
    short: 'memo',
    label: 'Memo',
  },
  memoV1: {
    id: 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
    short: 'memo_v1',
    label: 'Memo (v1)',
  },
  bpfUpgradeableLoader: {
    id: 'BPFLoaderUpgradeab1e11111111111111111111111',
    short: 'bpf_loader',
    label: 'BPF Upgradeable Loader',
  },
  loaderV3: {
    id: 'LoaderV411111111111111111111111111111111111',
    short: 'loader_v4',
    label: 'Loader v4',
  },
  config: {
    id: 'Config1111111111111111111111111111111111111',
    short: 'config',
    label: 'Config',
  },
  secp256k1: {
    id: 'KeccakSecp256k11111111111111111111111111111',
    short: 'secp256k1',
    label: 'Secp256k1 SigVerify',
  },
  ed25519: {
    id: 'Ed25519SigVerify111111111111111111111111111',
    short: 'ed25519',
    label: 'Ed25519 SigVerify',
  },
} as const satisfies Record<string, KnownProgram>

const BY_ID = new Map<string, KnownProgram>(
  Object.values(PROGRAMS).map((p) => [p.id, p]),
)

function u32le(data: Uint8Array, o = 0): number | null {
  if (data.length < o + 4) return null
  return (
    data[o]! |
    (data[o + 1]! << 8) |
    (data[o + 2]! << 16) |
    (data[o + 3]! << 24)
  ) >>> 0
}

function u64le(data: Uint8Array, o = 0): bigint | null {
  if (data.length < o + 8) return null
  const view = new DataView(data.buffer, data.byteOffset + o, 8)
  return view.getBigUint64(0, true)
}

function ix(
  program: KnownProgram,
  name: string,
  label: string,
  extra?: { summary?: string; args?: Record<string, string | number> },
): KnownInstruction {
  return {
    program,
    name,
    label,
    summary: extra?.summary ?? label,
    args: extra?.args,
  }
}

const SYSTEM_IX: Record<number, (d: Uint8Array) => KnownInstruction> = {
  0: () => ix(PROGRAMS.system, 'create_account', 'CreateAccount'),
  1: () => ix(PROGRAMS.system, 'assign', 'Assign'),
  2: (d) => {
    const lamports = u64le(d, 4)
    return ix(PROGRAMS.system, 'transfer', 'Transfer', {
      summary:
        lamports !== null
          ? `Transfer · ${lamports.toString()} lamports`
          : 'Transfer',
      args: lamports !== null ? { lamports: lamports.toString() } : undefined,
    })
  },
  3: () => ix(PROGRAMS.system, 'create_account_with_seed', 'CreateAccountWithSeed'),
  4: () => ix(PROGRAMS.system, 'advance_nonce_account', 'AdvanceNonceAccount'),
  5: () => ix(PROGRAMS.system, 'withdraw_nonce_account', 'WithdrawNonceAccount'),
  6: () =>
    ix(PROGRAMS.system, 'initialize_nonce_account', 'InitializeNonceAccount'),
  7: () =>
    ix(PROGRAMS.system, 'authorize_nonce_account', 'AuthorizeNonceAccount'),
  8: () => ix(PROGRAMS.system, 'allocate', 'Allocate'),
  9: () => ix(PROGRAMS.system, 'allocate_with_seed', 'AllocateWithSeed'),
  10: () => ix(PROGRAMS.system, 'assign_with_seed', 'AssignWithSeed'),
  11: (d) => {
    const lamports = u64le(d, 4)
    return ix(PROGRAMS.system, 'transfer_with_seed', 'TransferWithSeed', {
      summary:
        lamports !== null
          ? `TransferWithSeed · ${lamports.toString()} lamports`
          : 'TransferWithSeed',
      args: lamports !== null ? { lamports: lamports.toString() } : undefined,
    })
  },
  12: () => ix(PROGRAMS.system, 'upgrade_nonce_account', 'UpgradeNonceAccount'),
}

const COMPUTE_BUDGET_IX: Record<number, (d: Uint8Array) => KnownInstruction> = {
  1: (d) => {
    const bytes = u32le(d, 1)
    return ix(PROGRAMS.computeBudget, 'request_heap_frame', 'RequestHeapFrame', {
      summary: bytes !== null ? `RequestHeapFrame · ${bytes} B` : 'RequestHeapFrame',
      args: bytes !== null ? { bytes } : undefined,
    })
  },
  2: (d) => {
    const units = u32le(d, 1)
    return ix(
      PROGRAMS.computeBudget,
      'set_compute_unit_limit',
      'SetComputeUnitLimit',
      {
        summary:
          units !== null ? `SetComputeUnitLimit · ${units}` : 'SetComputeUnitLimit',
        args: units !== null ? { units } : undefined,
      },
    )
  },
  3: (d) => {
    const microlamports = u64le(d, 1)
    return ix(
      PROGRAMS.computeBudget,
      'set_compute_unit_price',
      'SetComputeUnitPrice',
      {
        summary:
          microlamports !== null
            ? `SetComputeUnitPrice · ${microlamports.toString()} µ-lamports/CU`
            : 'SetComputeUnitPrice',
        args:
          microlamports !== null
            ? { microLamports: microlamports.toString() }
            : undefined,
      },
    )
  },
  4: (d) => {
    const bytes = u32le(d, 1)
    return ix(
      PROGRAMS.computeBudget,
      'set_loaded_accounts_data_size_limit',
      'SetLoadedAccountsDataSizeLimit',
      {
        summary:
          bytes !== null
            ? `SetLoadedAccountsDataSizeLimit · ${bytes}`
            : 'SetLoadedAccountsDataSizeLimit',
        args: bytes !== null ? { bytes } : undefined,
      },
    )
  },
}

const TOKEN_IX: Record<number, string> = {
  0: 'InitializeMint',
  1: 'InitializeAccount',
  2: 'InitializeMultisig',
  3: 'Transfer',
  4: 'Approve',
  5: 'Revoke',
  6: 'SetAuthority',
  7: 'MintTo',
  8: 'Burn',
  9: 'CloseAccount',
  10: 'FreezeAccount',
  11: 'ThawAccount',
  12: 'TransferChecked',
  13: 'ApproveChecked',
  14: 'MintToChecked',
  15: 'BurnChecked',
  16: 'InitializeAccount2',
  17: 'SyncNative',
  18: 'InitializeAccount3',
  19: 'InitializeMultisig2',
  20: 'InitializeMint2',
  21: 'GetAccountDataSize',
  22: 'InitializeImmutableOwner',
  23: 'AmountToUiAmount',
  24: 'UiAmountToAmount',
  // Token-2022 extras commonly seen
  25: 'InitializeMintCloseAuthority',
  26: 'TransferFeeExtension',
  27: 'ConfidentialTransferExtension',
  28: 'DefaultAccountStateExtension',
  29: 'Reallocate',
  30: 'MemoTransferExtension',
  31: 'CreateNativeMint',
  32: 'InitializeNonTransferableMint',
  33: 'InterestBearingMintExtension',
  34: 'CpiGuardExtension',
  35: 'InitializePermanentDelegate',
  36: 'TransferHookExtension',
  37: 'MetadataPointerExtension',
  38: 'GroupPointerExtension',
  39: 'GroupMemberPointerExtension',
}

function decodeTokenFamily(
  program: KnownProgram,
  data: Uint8Array,
): KnownInstruction | null {
  if (data.length < 1) return null
  const tag = data[0]!
  const label = TOKEN_IX[tag]
  if (!label) {
    return ix(program, `ix_${tag}`, `Instruction ${tag}`, {
      summary: `${program.label} · ix ${tag}`,
    })
  }
  const name = label
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()

  // Transfer / MintTo / Burn / Approve: amount u64 after tag
  if (tag === 3 || tag === 4 || tag === 7 || tag === 8) {
    const amount = u64le(data, 1)
    return ix(program, name, label, {
      summary:
        amount !== null ? `${label} · amount ${amount.toString()}` : label,
      args: amount !== null ? { amount: amount.toString() } : undefined,
    })
  }
  // TransferChecked family: amount u64 @1, decimals u8 @9
  if (tag === 12 || tag === 13 || tag === 14 || tag === 15) {
    const amount = u64le(data, 1)
    const decimals = data.length > 9 ? data[9]! : null
    return ix(program, name, label, {
      summary:
        amount !== null
          ? `${label} · amount ${amount.toString()}${decimals !== null ? ` · decimals ${decimals}` : ''}`
          : label,
      args: {
        ...(amount !== null ? { amount: amount.toString() } : {}),
        ...(decimals !== null ? { decimals } : {}),
      },
    })
  }
  return ix(program, name, label)
}

const ATA_IX: Record<number, [string, string]> = {
  0: ['create', 'Create'],
  1: ['create_idempotent', 'CreateIdempotent'],
  2: ['recover_nested', 'RecoverNested'],
}

const STAKE_IX: Record<number, [string, string]> = {
  0: ['initialize', 'Initialize'],
  1: ['authorize', 'Authorize'],
  2: ['delegate_stake', 'DelegateStake'],
  3: ['split', 'Split'],
  4: ['withdraw', 'Withdraw'],
  5: ['deactivate', 'Deactivate'],
  6: ['set_lockup', 'SetLockup'],
  7: ['merge', 'Merge'],
  8: ['authorize_with_seed', 'AuthorizeWithSeed'],
  9: ['initialize_checked', 'InitializeChecked'],
  10: ['authorize_checked', 'AuthorizeChecked'],
  11: ['authorize_checked_with_seed', 'AuthorizeCheckedWithSeed'],
  12: ['set_lockup_checked', 'SetLockupChecked'],
  13: ['get_minimum_delegation', 'GetMinimumDelegation'],
  14: ['deactivate_delinquent', 'DeactivateDelinquent'],
  15: ['redelegate', 'Redelegate'],
}

const ALT_IX: Record<number, [string, string]> = {
  0: ['create_lookup_table', 'CreateLookupTable'],
  1: ['freeze_lookup_table', 'FreezeLookupTable'],
  2: ['extend_lookup_table', 'ExtendLookupTable'],
  3: ['deactivate_lookup_table', 'DeactivateLookupTable'],
  4: ['close_lookup_table', 'CloseLookupTable'],
}

const BPF_UPGRADEABLE_IX: Record<number, [string, string]> = {
  0: ['initialize_buffer', 'InitializeBuffer'],
  1: ['write', 'Write'],
  2: ['deploy_with_max_data_len', 'DeployWithMaxDataLen'],
  3: ['upgrade', 'Upgrade'],
  4: ['set_authority', 'SetAuthority'],
  5: ['close', 'Close'],
  6: ['extend_program', 'ExtendProgram'],
  7: ['set_authority_checked', 'SetAuthorityChecked'],
}

function decodeU32Program(
  program: KnownProgram,
  data: Uint8Array,
  table: Record<number, [string, string]>,
): KnownInstruction | null {
  const tag = u32le(data, 0)
  if (tag === null) return null
  const entry = table[tag]
  if (!entry) {
    return ix(program, `ix_${tag}`, `Instruction ${tag}`, {
      summary: `${program.label} · ix ${tag}`,
    })
  }
  const [name, label] = entry
  if (program.id === PROGRAMS.stake.id && (tag === 3 || tag === 4)) {
    // Split / Withdraw carry lamports u64 after disc
    const lamports = u64le(data, 4)
    return ix(program, name, label, {
      summary:
        lamports !== null
          ? `${label} · ${lamports.toString()} lamports`
          : label,
      args: lamports !== null ? { lamports: lamports.toString() } : undefined,
    })
  }
  return ix(program, name, label)
}

function decodeMemo(program: KnownProgram, data: Uint8Array): KnownInstruction {
  try {
    const text = new TextDecoder().decode(data)
    const preview =
      text.length > 48 ? `${text.slice(0, 48)}…` : text
    return ix(program, 'memo', 'Memo', {
      summary: preview ? `Memo · ${JSON.stringify(preview)}` : 'Memo',
      args: text ? { text } : undefined,
    })
  } catch {
    return ix(program, 'memo', 'Memo')
  }
}

/** Identify a well-known program + instruction from program id + data. */
export function identifyKnownInstruction(
  programId: string,
  data: Uint8Array,
): KnownInstruction | null {
  const program = BY_ID.get(programId)
  if (!program) return null

  if (program.id === PROGRAMS.system.id) {
    const tag = u32le(data, 0)
    if (tag === null) return ix(program, 'unknown', 'Unknown')
    return SYSTEM_IX[tag]?.(data) ?? ix(program, `ix_${tag}`, `Instruction ${tag}`)
  }
  if (program.id === PROGRAMS.computeBudget.id) {
    if (data.length < 1) return ix(program, 'unknown', 'Unknown')
    const tag = data[0]!
    return (
      COMPUTE_BUDGET_IX[tag]?.(data) ??
      ix(program, `ix_${tag}`, `Instruction ${tag}`)
    )
  }
  if (program.id === PROGRAMS.token.id || program.id === PROGRAMS.token2022.id) {
    return decodeTokenFamily(program, data)
  }
  if (program.id === PROGRAMS.ata.id) {
    if (data.length < 1) {
      // Legacy ATA create often has empty data
      return ix(program, 'create', 'Create')
    }
    const tag = data[0]!
    const entry = ATA_IX[tag]
    if (!entry) return ix(program, `ix_${tag}`, `Instruction ${tag}`)
    return ix(program, entry[0], entry[1])
  }
  if (program.id === PROGRAMS.stake.id) {
    return decodeU32Program(program, data, STAKE_IX)
  }
  if (program.id === PROGRAMS.alt.id) {
    return decodeU32Program(program, data, ALT_IX)
  }
  if (program.id === PROGRAMS.bpfUpgradeableLoader.id) {
    return decodeU32Program(program, data, BPF_UPGRADEABLE_IX)
  }
  if (program.id === PROGRAMS.memo.id || program.id === PROGRAMS.memoV1.id) {
    return decodeMemo(program, data)
  }
  if (
    program.id === PROGRAMS.vote.id ||
    program.id === PROGRAMS.config.id ||
    program.id === PROGRAMS.secp256k1.id ||
    program.id === PROGRAMS.ed25519.id ||
    program.id === PROGRAMS.loaderV3.id
  ) {
    return ix(program, 'instruction', 'Instruction', {
      summary: `${program.label} · ${data.length} B`,
    })
  }

  return ix(program, 'instruction', 'Instruction')
}

export function identifyKnownProgram(
  programId: string,
): KnownProgram | null {
  return BY_ID.get(programId) ?? null
}
