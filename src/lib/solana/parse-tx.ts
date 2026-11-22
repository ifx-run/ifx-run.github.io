import {
  decompileTransactionConfig,
  decodeTransactionFromRpcResponse,
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
import { bytesToHex, decodeWireInput, shortenAddress } from './bytes'

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
  source: 'signature' | 'wire'
  signature?: string
  slot?: number | bigint | null
  err?: unknown
  packet: PacketMeta
  instructions: ExploredInstruction[]
  decoderNote: string
}

export type RpcTxEnvelope = {
  slot: number | bigint
  transaction: unknown
  meta: unknown
  version?: PacketVersion
}

function versionLabel(v: CompiledTransactionMessage['version']): PacketVersion {
  if (v === 'legacy') return 'legacy'
  if (v === 0) return 0
  if (v === 1) return 1
  return 'legacy'
}

function extractPacketMeta(
  compiled: CompiledTransactionMessage,
  wireLen: number,
  messageLen: number,
): PacketMeta {
  const version = versionLabel(compiled.version)
  let altCount = 0
  let altAddresses: string[] = []
  let v1Header: V1HeaderInfo | undefined

  if (compiled.version === 0 && 'addressTableLookups' in compiled) {
    const lookups = compiled.addressTableLookups ?? []
    altCount = lookups.length
    altAddresses = lookups.map((l) => String(l.lookupTableAddress))
  }

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
  loadedAddresses?: {
    writable: readonly Address[]
    readonly: readonly Address[]
  } | null,
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

const DECODER_NOTE =
  'decoder: @solana/kit (SIMD-0385 v1) + Ifx L0 disc map · args L1 TBD'

/** Parse a pasted wire transaction (base64 or hex) entirely in-browser. */
export function exploreFromWire(raw: string): ExploredTransaction {
  const bytes = decodeWireInput(raw)
  const tx = getTransactionDecoder().decode(bytes)
  const compiled = getCompiledTransactionMessageDecoder().decode(
    tx.messageBytes,
  )
  const packet = extractPacketMeta(
    compiled,
    bytes.byteLength,
    tx.messageBytes.byteLength,
  )
  const instructions = mapInstructions(compiled)

  return {
    source: 'wire',
    packet,
    instructions,
    decoderNote: DECODER_NOTE,
  }
}

/** Explore a getTransaction RPC response (encoding base64, maxSupportedTransactionVersion: 1). */
export function exploreFromRpcResponse(
  signature: string,
  rpcTx: RpcTxEnvelope,
): ExploredTransaction {
  // Cast: kit overloads distinguish base64 vs json; we always request base64.
  const decoded = decodeTransactionFromRpcResponse(rpcTx as never) as unknown as {
    compiledMessage: CompiledTransactionMessage
    loadedAddresses: {
      writable: readonly Address[]
      readonly: readonly Address[]
    }
    transaction?: {
      messageBytes: { byteLength: number }
      signatures: Record<string, unknown>
    }
  }

  let actualWire = 0
  const tuple = (rpcTx as { transaction?: [string, string] }).transaction
  if (Array.isArray(tuple) && typeof tuple[0] === 'string') {
    try {
      actualWire = decodeWireInput(tuple[0]).byteLength
    } catch {
      /* ignore */
    }
  }
  if (!actualWire && decoded.transaction) {
    // Approximate: compact-u16 sig count + 64×sigs + message (good enough for UI)
    const sigCount = Object.keys(decoded.transaction.signatures).length
    actualWire =
      1 + sigCount * 64 + decoded.transaction.messageBytes.byteLength
  }

  const packet = extractPacketMeta(
    decoded.compiledMessage,
    actualWire,
    decoded.transaction?.messageBytes.byteLength ?? 0,
  )
  const instructions = mapInstructions(
    decoded.compiledMessage,
    decoded.loadedAddresses,
  )

  const meta = rpcTx.meta as { err?: unknown } | null | undefined

  return {
    source: 'signature',
    signature,
    slot: rpcTx.slot,
    err: meta?.err ?? null,
    packet,
    instructions,
    decoderNote: DECODER_NOTE,
  }
}
