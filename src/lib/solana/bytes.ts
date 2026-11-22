import {
  getBase58Decoder,
  getBase58Encoder,
  getBase64Decoder,
  getBase64Encoder,
} from '@solana/kit'

export type WireEncoding = 'base58' | 'base64'
export type DataEncoding = 'hex' | 'base58' | 'base64'

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/
const BASE64_RE = /^[A-Za-z0-9+/_-]+={0,2}$/

function normalizeBase64(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)
  return b64
}

function decodeBase58(s: string): Uint8Array {
  if (!BASE58_RE.test(s)) throw new Error('invalid base58 alphabet')
  return new Uint8Array(getBase58Encoder().encode(s))
}

function decodeBase64(s: string): Uint8Array {
  if (!BASE64_RE.test(s)) throw new Error('invalid base64 alphabet')
  return new Uint8Array(getBase64Encoder().encode(normalizeBase64(s)))
}

/**
 * Decode pasted transaction wire as base58 or base64 (no network).
 * Returns candidates ordered by likelihood; caller should try tx decode on each.
 */
export function decodeWireCandidates(
  raw: string,
): { bytes: Uint8Array; encoding: WireEncoding }[] {
  const s = raw.trim().replace(/\s+/g, '')
  if (!s) throw new Error('empty wire')

  const looksB64 = /[+/=_-]/.test(s)
  const order: WireEncoding[] = looksB64
    ? ['base64', 'base58']
    : ['base58', 'base64']

  const out: { bytes: Uint8Array; encoding: WireEncoding }[] = []
  for (const encoding of order) {
    try {
      const bytes =
        encoding === 'base58' ? decodeBase58(s) : decodeBase64(s)
      if (bytes.byteLength > 0) out.push({ bytes, encoding })
    } catch {
      /* try next */
    }
  }
  if (out.length === 0) {
    throw new Error('not valid base58 or base64 wire')
  }
  return out
}

/** Decode pasted wire; prefers the first successful encoding guess. */
export function decodeWireInput(raw: string): {
  bytes: Uint8Array
  encoding: WireEncoding
} {
  return decodeWireCandidates(raw)[0]!
}

export function bytesToHex(bytes: Uint8Array, max?: number): string {
  const slice =
    max !== undefined && bytes.length > max
      ? bytes.subarray(0, max)
      : bytes
  let hex = ''
  for (const b of slice) hex += b.toString(16).padStart(2, '0')
  if (max !== undefined && bytes.length > max) hex += '…'
  return hex
}

/** Encode instruction / account bytes for display (full payload). */
export function formatBytes(
  bytes: Uint8Array,
  encoding: DataEncoding,
): string {
  if (bytes.byteLength === 0) return ''
  if (encoding === 'hex') return bytesToHex(bytes)
  if (encoding === 'base58') return String(getBase58Decoder().decode(bytes))
  return String(getBase64Decoder().decode(bytes))
}

export function shortenAddress(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}
