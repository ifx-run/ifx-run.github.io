/** Soft cap — same order of magnitude as the wire LRU. */
export const MAX_SIGNATURE_WIRE_CACHE = 32

const STORAGE_KEY = 'ifx.run.sigWireCache'

export type SignatureWireEntry = {
  signature: string
  wire: string
  touchedAt: number
}

function readEntries(): SignatureWireEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e): e is SignatureWireEntry =>
          !!e &&
          typeof e === 'object' &&
          typeof (e as SignatureWireEntry).signature === 'string' &&
          typeof (e as SignatureWireEntry).wire === 'string' &&
          typeof (e as SignatureWireEntry).touchedAt === 'number',
      )
      .map((e) => ({
        signature: e.signature,
        wire: e.wire,
        touchedAt: e.touchedAt,
      }))
  } catch {
    return []
  }
}

function writeEntries(entries: SignatureWireEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* quota / private mode */
  }
}

function sortByTouched(entries: SignatureWireEntry[]): SignatureWireEntry[] {
  return [...entries].sort((a, b) => b.touchedAt - a.touchedAt)
}

export function hasCachedWireForSignature(signature: string): boolean {
  const sig = signature.trim()
  if (!sig) return false
  return readEntries().some((e) => e.signature === sig)
}

/** Return cached wire for a signature, touching LRU on hit. */
export function getCachedWireForSignature(signature: string): string | null {
  const sig = signature.trim()
  if (!sig) return null
  const entries = readEntries()
  const hit = entries.find((e) => e.signature === sig)
  if (!hit) return null
  const now = Date.now()
  const rest = entries.filter((e) => e.signature !== sig)
  writeEntries(
    sortByTouched([{ ...hit, touchedAt: now }, ...rest]).slice(
      0,
      MAX_SIGNATURE_WIRE_CACHE,
    ),
  )
  return hit.wire
}

/** Remember signature → wire; evict oldest past the cap. */
export function rememberSignatureWire(signature: string, wire: string): void {
  const sig = signature.trim()
  const w = wire.trim()
  if (!sig || !w) return
  const now = Date.now()
  const rest = readEntries().filter((e) => e.signature !== sig)
  writeEntries(
    sortByTouched([{ signature: sig, wire: w, touchedAt: now }, ...rest]).slice(
      0,
      MAX_SIGNATURE_WIRE_CACHE,
    ),
  )
}
