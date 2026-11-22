import {
  decompileTransactionConfig,
  getCompiledTransactionMessageDecoder,
  getInstructionsFromCompiledTransactionMessage,
  getTransactionDecoder,
  type Address,
  type CompiledTransactionMessage,
} from '@solana/kit'
import {
  decodeIfxInstruction,
  docsSlugForIfxIx,
  IFX_IX_SHORT,
  type IfxIxName,
} from '../ifx/decode-l0'
import { tryDecodeIfxL1, type IfxL1View } from '../ifx/decode-l1'
import { formatL1Lines, formatL1Summary } from '../ifx/format-l1'
import { identifyIfxProgram, type IfxCluster } from '../ifx/program-ids'
import {
  parseAccountRole,
  type AccountRoleFlags,
} from './account-role'
import {
  bytesToHex,
  decodeWireCandidates,
  type WireEncoding,
  shortenAddress,
} from './bytes'
import {
  fetchLoadedAddresses,
  type LoadedAddresses,
} from './fetch-alts'
import {
  identifyKnownInstruction,
  type KnownInstruction,
} from './known-programs'

export type PacketVersion = 'legacy' | 0 | 1

export type V1HeaderInfo = {
  computeUnitLimit?: number
  loadedAccountsDataSizeLimit?: number
  heapSize?: number
  priorityFeeLamports?: string
}

export type PacketMeta = {
  version: PacketVersion
  wireBytes: number
  messageBytes: number
  altCount: number
  altAddresses: string[]
  v1Header?: V1HeaderInfo
  staticAccountCount: number
  instructionCount: number
}

export type ExploredAccount = {
  address: string
  role: AccountRoleFlags
}

export type ExploredInstruction = {
  index: number
  programId: string
  /** Prefer this in UI when set (Ifx / System / Token / …). */
  programLabel?: string
  programShort?: string
  /** Prefer this over raw address for the ix name column. */
  ixLabel?: string
  ixName?: string
  isIfx: boolean
  ifxCluster?: IfxCluster
  ifxName?: IfxIxName
  ifxShort?: string
  discriminator?: number
  docsSlug?: string
  accounts: ExploredAccount[]
  /** Full instruction data bytes (for hex / base58 / base64 toggle). */
  data: Uint8Array
  dataHex: string
  dataLen: number
  summary: string
  /** Well-known Solana program ix decode (non-Ifx). */
  known?: KnownInstruction
  /** L1 decoded args + human-readable lines (Ifx only). */
  l1?: IfxL1View
}

export type ExploredTransaction = {
  source: 'wire'
  encoding: WireEncoding
  /** True when the tx references ALTs and accounts are not fully resolved yet. */
  needsAltRpc: boolean
  /** True after ALT accounts were fetched (or when there are no ALTs). */
  altResolved: boolean
  packet: PacketMeta
  instructions: ExploredInstruction[]
  decoderNote: string
}

type DecodedWire = {
  encoding: WireEncoding
  bytes: Uint8Array
  compiled: CompiledTransactionMessage
  messageByteLength: number
}

function versionLabel(v: CompiledTransactionMessage['version']): PacketVersion {
  if (v === 'legacy') return 'legacy'
  if (v === 0) return 0
  if (v === 1) return 1
  return 'legacy'
}

function extractLookups(compiled: CompiledTransactionMessage): {
  altCount: number
  altAddresses: string[]
} {
  if (
    'addressTableLookups' in compiled &&
    Array.isArray(compiled.addressTableLookups) &&
    compiled.addressTableLookups.length > 0
  ) {
    const lookups = compiled.addressTableLookups
    return {
      altCount: lookups.length,
      altAddresses: lookups.map((l) => String(l.lookupTableAddress)),
    }
  }
  return { altCount: 0, altAddresses: [] }
}

function extractPacketMeta(
  compiled: CompiledTransactionMessage,
  wireLen: number,
  messageLen: number,
): PacketMeta {
  const version = versionLabel(compiled.version)
  const { altCount, altAddresses } = extractLookups(compiled)
  let v1Header: V1HeaderInfo | undefined

  if (compiled.version === 1) {
    const cfg = decompileTransactionConfig(
      compiled.configMask,
      compiled.configValues,
    )
    v1Header = {
      computeUnitLimit: cfg.computeUnitLimit,
      loadedAccountsDataSizeLimit: cfg.loadedAccountsDataSizeLimit,
      heapSize: cfg.heapSize,
      priorityFeeLamports:
        cfg.priorityFeeLamports !== undefined
          ? String(cfg.priorityFeeLamports)
          : undefined,
    }
  }

  const staticAccountCount = compiled.staticAccounts.length
  let instructionCount = 0
  if ('instructions' in compiled && Array.isArray(compiled.instructions)) {
    instructionCount = compiled.instructions.length
  } else if ('numInstructions' in compiled) {
    instructionCount = compiled.numInstructions
  }

  return {
    version,
    wireBytes: wireLen,
    messageBytes: messageLen,
    altCount,
    altAddresses,
    v1Header,
    staticAccountCount,
    instructionCount,
  }
}

/**
 * Track Frame binding indexes across a transaction:
 * create/reset → next = 0; each let appends from current next.
 * Let before any create/reset in this tx → assume $0 + warn.
 */
type FrameBindingCursor = {
  nextIndex: number
  sawFrameStart: boolean
}

function applyFrameBindingCursor(
  l1: IfxL1View,
  cursor: FrameBindingCursor,
): IfxL1View {
  if (l1.args.kind === 'create_frame' || l1.args.kind === 'reset_frame') {
    cursor.nextIndex = 0
    cursor.sawFrameStart = true
    return l1
  }
  if (l1.args.kind !== 'let') return l1

  const missingFrameReset = !cursor.sawFrameStart
  const bindingBase = cursor.nextIndex
  const opts = { bindingBase }
  cursor.nextIndex += l1.args.bindings.length

  return {
    ...l1,
    bindingBase,
    missingFrameReset,
    lines: formatL1Lines(l1.args, opts),
    summary: formatL1Summary(l1.args, opts),
  }
}

function mapInstructions(
  compiled: CompiledTransactionMessage,
  loadedAddresses?: LoadedAddresses | null,
): ExploredInstruction[] {
  const resolved = getInstructionsFromCompiledTransactionMessage(
    compiled,
    loadedAddresses ?? undefined,
  )

  const frameCursor: FrameBindingCursor = {
    nextIndex: 0,
    sawFrameStart: false,
  }

  return resolved.map((ix, index) => {
    const programId = String(ix.programAddress)
    const data =
      ix.data && ix.data.byteLength > 0
        ? new Uint8Array(ix.data)
        : new Uint8Array()
    const accounts = (ix.accounts ?? []).map((a) => ({
      address: String(a.address),
      role: parseAccountRole(a.role),
    }))

    const ifx = identifyIfxProgram(programId)
    if (ifx) {
      if (data.length > 0) {
        try {
          const decoded = decodeIfxInstruction(data)
          const rawL1 = tryDecodeIfxL1(data)
          const l1 = rawL1
            ? applyFrameBindingCursor(rawL1, frameCursor)
            : undefined
          const short = IFX_IX_SHORT[decoded.name]
          return {
            index,
            programId,
            programLabel: 'Ifx',
            programShort: 'ifx',
            ixLabel: decoded.name,
            ixName: short,
            isIfx: true,
            ifxCluster: ifx.cluster,
            ifxName: decoded.name,
            ifxShort: short,
            discriminator: decoded.discriminator,
            docsSlug: docsSlugForIfxIx(decoded.name),
            accounts,
            data,
            dataHex: bytesToHex(data, 32),
            dataLen: data.length,
            summary: l1
              ? `${short} · ${l1.summary}`
              : `${short} · disc ${decoded.discriminator} · ${data.length} B`,
            l1,
          }
        } catch {
          return {
            index,
            programId,
            programLabel: 'Ifx',
            programShort: 'ifx',
            isIfx: true,
            ifxCluster: ifx.cluster,
            accounts,
            data,
            dataHex: bytesToHex(data, 32),
            dataLen: data.length,
            summary: `Ifx · unknown disc · ${data.length} B`,
          }
        }
      }
      return {
        index,
        programId,
        programLabel: 'Ifx',
        programShort: 'ifx',
        isIfx: true,
        ifxCluster: ifx.cluster,
        accounts,
        data,
        dataHex: bytesToHex(data, 16),
        dataLen: data.length,
        summary: 'Ifx',
      }
    }

    const known = identifyKnownInstruction(programId, data)
    if (known) {
      return {
        index,
        programId,
        programLabel: known.program.label,
        programShort: known.program.short,
        ixLabel: known.label,
        ixName: known.name,
        isIfx: false,
        accounts,
        data,
        dataHex: bytesToHex(data, 24),
        dataLen: data.length,
        summary: known.summary,
        known,
      }
    }

    return {
      index,
      programId,
      isIfx: false,
      accounts,
      data,
      dataHex: bytesToHex(data, 16),
      dataLen: data.length,
      summary: `${shortenAddress(programId, 6, 4)} · ${data.length} B`,
    }
  })
}

function decoderNote(altResolved: boolean, needsAltRpc: boolean): string {
  if (needsAltRpc) {
    return 'decoder: wire decoded offline · ALT accounts unresolved — provide RPC to finish'
  }
  if (altResolved) {
    return 'decoder: @solana/kit (SIMD-0385 v1) + Ifx L0 · ALT resolved via RPC'
  }
  return 'decoder: @solana/kit (SIMD-0385 v1) + Ifx L0/L1 · offline wire only'
}

function decodeWireToCompiled(raw: string): DecodedWire {
  const candidates = decodeWireCandidates(raw)
  let lastError: unknown

  for (const { bytes, encoding } of candidates) {
    try {
      const tx = getTransactionDecoder().decode(bytes)
      const compiled = getCompiledTransactionMessageDecoder().decode(
        tx.messageBytes,
      )
      return {
        encoding,
        bytes,
        compiled,
        messageByteLength: tx.messageBytes.byteLength,
      }
    } catch (e) {
      lastError = e
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError ?? '')
  throw new Error(
    detail
      ? `could not decode as a Solana transaction (${detail})`
      : 'could not decode as a Solana transaction',
  )
}

function buildExplored(
  decoded: DecodedWire,
  loadedAddresses: LoadedAddresses | null,
  opts: { altResolved: boolean; needsAltRpc: boolean },
): ExploredTransaction {
  const packet = extractPacketMeta(
    decoded.compiled,
    decoded.bytes.byteLength,
    decoded.messageByteLength,
  )

  let instructions: ExploredInstruction[] = []
  if (!opts.needsAltRpc) {
    instructions = mapInstructions(decoded.compiled, loadedAddresses)
  }

  return {
    source: 'wire',
    encoding: decoded.encoding,
    needsAltRpc: opts.needsAltRpc,
    altResolved: opts.altResolved,
    packet,
    instructions,
    decoderNote: decoderNote(opts.altResolved, opts.needsAltRpc),
  }
}

/** Parse pasted wire (base58 or base64). No network — ALT txs return needsAltRpc. */
export function exploreFromWire(raw: string): ExploredTransaction {
  const decoded = decodeWireToCompiled(raw)
  const { altCount } = extractLookups(decoded.compiled)

  if (altCount > 0) {
    return buildExplored(decoded, null, {
      altResolved: false,
      needsAltRpc: true,
    })
  }

  return buildExplored(decoded, null, {
    altResolved: true,
    needsAltRpc: false,
  })
}

/** Re-decode wire and fetch ALT accounts from RPC to resolve instruction accounts. */
export async function exploreFromWireResolvingAlts(
  raw: string,
  rpcUrl: string,
  signal?: AbortSignal,
): Promise<ExploredTransaction> {
  const decoded = decodeWireToCompiled(raw)
  const { altCount } = extractLookups(decoded.compiled)

  if (altCount === 0) {
    return buildExplored(decoded, null, {
      altResolved: true,
      needsAltRpc: false,
    })
  }

  const loaded = await fetchLoadedAddresses(decoded.compiled, rpcUrl, signal)
  return buildExplored(decoded, loaded, {
    altResolved: true,
    needsAltRpc: false,
  })
}

// Re-export for callers that type against Address lists
export type { Address }
