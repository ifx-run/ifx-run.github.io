import { decodeWireInput } from './bytes'

const STORAGE_KEY = 'ifx.run.bindingAliases'

type AliasBag = Record<string, Record<string, string>>

/** FNV-1a 64-bit — stable across hex / base58 / base64 of the same bytes. */
function fingerprintBytes(bytes: Uint8Array): string {
  let h = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i]!)
    h = (h * prime) & 0xffffffffffffffffn
  }
  return `${bytes.length.toString(16)}-${h.toString(16).padStart(16, '0')}`
}

/**
 * Storage bag key for a pasted wire string.
 * Same transaction bytes → same key, regardless of encoding.
 */
export function wireAliasBagKey(wire: string): string {
  const trimmed = wire.trim()
  if (!trimmed) return 'raw:'
  try {
    return `w:${fingerprintBytes(decodeWireInput(trimmed).bytes)}`
  } catch {
    return `raw:${trimmed}`
  }
}

function isCanonicalKey(key: string): boolean {
  return key.startsWith('w:') || key.startsWith('raw:')
}

/** Rewrite legacy wire-string keys to byte fingerprints (idempotent). */
function migrateBag(map: AliasBag): { map: AliasBag; changed: boolean } {
  let changed = false
  const next: AliasBag = {}
  const entries = Object.entries(map)
  // Canonical keys first so they win over legacy wire-string duplicates.
  const ordered = [
    ...entries.filter(([k]) => isCanonicalKey(k)),
    ...entries.filter(([k]) => !isCanonicalKey(k)),
  ]
  for (const [key, aliases] of ordered) {
    if (!aliases || typeof aliases !== 'object') {
      changed = true
      continue
    }
    const canon = isCanonicalKey(key) ? key : wireAliasBagKey(key)
    if (canon !== key) changed = true
    const prev = next[canon]
    if (!prev) {
      next[canon] = { ...aliases }
    } else {
      next[canon] = { ...aliases, ...prev }
      changed = true
    }
  }
  return { map: next, changed }
}

function readBag(): AliasBag {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const { map, changed } = migrateBag(parsed as AliasBag)
    if (changed) writeBag(map)
    return map
  } catch {
    return {}
  }
}

function writeBag(map: AliasBag): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* quota / private mode */
  }
}

/** Aliases keyed by transaction wire bytes; cleared when that wire is cleared. */
export function getStoredAliases(wire: string): Record<string, string> {
  const key = wireAliasBagKey(wire)
  if (key === 'raw:') return {}
  return { ...(readBag()[key] ?? {}) }
}

export function setStoredAlias(
  wire: string,
  aliasKey: string,
  name: string,
): void {
  const key = wireAliasBagKey(wire)
  if (key === 'raw:') return
  const map = readBag()
  const entry = { ...(map[key] ?? {}) }
  const trimmed = name.trim()
  if (!trimmed) delete entry[aliasKey]
  else entry[aliasKey] = trimmed
  if (Object.keys(entry).length === 0) delete map[key]
  else map[key] = entry
  writeBag(map)
}

export function clearStoredAliases(wire?: string): void {
  try {
    if (wire === undefined) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    const key = wireAliasBagKey(wire)
    if (key === 'raw:') return
    const map = readBag()
    if (!(key in map)) return
    delete map[key]
    writeBag(map)
  } catch {
    /* ignore */
  }
}
