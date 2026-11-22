/** Detect and decode pasted wire (base64 or hex) into raw bytes. */
export function decodeWireInput(raw: string): Uint8Array {
  const s = raw.trim().replace(/\s+/g, '')
  if (!s) throw new Error('empty wire')

  if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
    const out = new Uint8Array(s.length / 2)
    for (let i = 0; i < out.length; i++) {
      out[i] = Number.parseInt(s.slice(i * 2, i * 2 + 2), 16)
    }
    return out
  }

  // base64 / base64url
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)
  try {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    throw new Error('not valid base64 or hex')
  }
}

export function bytesToHex(bytes: Uint8Array, max = 24): string {
  const slice = bytes.subarray(0, max)
  let hex = ''
  for (const b of slice) hex += b.toString(16).padStart(2, '0')
  if (bytes.length > max) hex += '…'
  return hex
}

export function shortenAddress(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}
