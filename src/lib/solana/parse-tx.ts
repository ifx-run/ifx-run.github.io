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
import { identifyIfxProgram, type IfxCluster } from '../ifx/program-ids'
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
  role: string
}

export type ExploredInstruction = {
  index: number
  programId: string
  isIfx: boolean
  ifxCluster?: IfxCluster
  ifxName?: IfxIxName
  ifxShort?: string
  discriminator?: number
  docsSlug?: string
  accounts: ExploredAccount[]
  dataHex: string
  dataLen: number
  summary: string
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

function mapInstructions(
  compiled: CompiledTransactionMessage,
  loadedAddresses?: LoadedAddresses | null,
): ExploredInstruction[] {
  const resolved = getInstructionsFromCompiledTransactionMessage(
    compiled,
    loadedAddresses ?? undefined,
  )

  return resolved.map((ix, index) => {
    const programId = String(ix.programAddress)
    const data =
      ix.data && ix.data.byteLength > 0
        ? new Uint8Array(ix.data)
        : new Uint8Array()
    const accounts = (ix.accounts ?? []).map((a) => ({
      address: String(a.address),
      role: String(a.role),
    }))

    const ifx = identifyIfxProgram(programId)
    if (ifx && data.length > 0) {
      try {
        const decoded = decodeIfxInstruction(data)
        return {
          index,
          programId,
          isIfx: true,
          ifxCluster: ifx.cluster,
          ifxName: decoded.name,
          ifxShort: IFX_IX_SHORT[decoded.name],
          discriminator: decoded.discriminator,
          docsSlug: docsSlugForIfxIx(decoded.name),
          accounts,
          dataHex: bytesToHex(data, 32),
          dataLen: data.length,
          summary: `${IFX_IX_SHORT[decoded.name]} · disc ${decoded.discriminator} · ${data.length} B`,
        }
      } catch {
        return {
          index,
          programId,
          isIfx: true,
          ifxCluster: ifx.cluster,
          accounts,
          dataHex: bytesToHex(data, 32),
          dataLen: data.length,
          summary: `Ifx · unknown disc · ${data.length} B`,
        }
      }
    }

    return {
      index,
      programId,
      isIfx: false,
      accounts,
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
  return 'decoder: @solana/kit (SIMD-0385 v1) + Ifx L0 disc map · offline wire only'
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
