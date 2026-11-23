import {
  getBase58Decoder,
  getTransactionDecoder,
  signature as asSignature,
  type Signature,
} from '@solana/kit'

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/

/** Typical base58 length of a 64-byte Solana transaction signature. */
const SIG_LEN_MIN = 86
const SIG_LEN_MAX = 90

/** True when the paste looks like a lone tx signature (not full wire). */
export function looksLikeSignature(raw: string): boolean {
  const s = raw.trim().replace(/\s+/g, '')
  if (s.length < SIG_LEN_MIN || s.length > SIG_LEN_MAX) return false
  if (!BASE58_RE.test(s)) return false
  try {
    asSignature(s)
    return true
  } catch {
    return false
  }
}

export function parseSignature(raw: string): Signature {
  const s = raw.trim().replace(/\s+/g, '')
  return asSignature(s)
}

/**
 * First non-null signature in wire order — the transaction id for signed txs.
 */
export function signatureFromWireBytes(bytes: Uint8Array): string | null {
  try {
    const tx = getTransactionDecoder().decode(bytes)
    for (const sig of Object.values(tx.signatures)) {
      if (!sig) continue
      return String(getBase58Decoder().decode(sig))
    }
    return null
  } catch {
    return null
  }
}
