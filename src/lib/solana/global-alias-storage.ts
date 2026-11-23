/** Cross-transaction address names (not binding `$N` keys). */
export const MAX_GLOBAL_ADDRESS_ALIASES = 128

const STORAGE_KEY = 'ifx.run.globalAddressAliases'

export type GlobalAddressAliasEntry = {
  address: string
  name: string
  /** When the entry was first added (stable for “newest first” lists). */
  createdAt: number
  touchedAt: number
}

function readEntries(): GlobalAddressAliasEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e): e is GlobalAddressAliasEntry =>
          !!e &&
          typeof e === 'object' &&
          typeof (e as GlobalAddressAliasEntry).address === 'string' &&
          typeof (e as GlobalAddressAliasEntry).name === 'string' &&
          Boolean((e as GlobalAddressAliasEntry).name.trim()),
      )
      .map((e) => {
        const touchedAt =
          typeof e.touchedAt === 'number' ? e.touchedAt : Date.now()
        const createdAt =
          typeof e.createdAt === 'number' ? e.createdAt : touchedAt
        return {
          address: e.address,
          name: e.name.trim(),
          createdAt,
          touchedAt,
        }
      })
  } catch {
    return []
  }
}

function writeEntries(entries: GlobalAddressAliasEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* quota / private mode */
  }
}

function sortByTouched(
  entries: GlobalAddressAliasEntry[],
): GlobalAddressAliasEntry[] {
  return [...entries].sort((a, b) => b.touchedAt - a.touchedAt)
}

function sortByCreated(
  entries: GlobalAddressAliasEntry[],
): GlobalAddressAliasEntry[] {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt)
}

/** Newest additions first (for the manager UI). */
export function listGlobalAddressAliases(): GlobalAddressAliasEntry[] {
  return sortByCreated(readEntries())
}

export function getGlobalAddressAlias(address: string): string | null {
  const addr = address.trim()
  if (!addr) return null
  return readEntries().find((e) => e.address === addr)?.name ?? null
}

export function hasGlobalAddressAlias(address: string): boolean {
  return getGlobalAddressAlias(address) != null
}

/** Address → name map (no LRU touch). */
export function getGlobalAddressAliasMap(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of readEntries()) out[e.address] = e.name
  return out
}

/** Set or update; empty name deletes. Touches LRU; preserves createdAt on update. */
export function setGlobalAddressAlias(address: string, name: string): void {
  const addr = address.trim()
  if (!addr) return
  const trimmed = name.trim()
  const existing = readEntries()
  const prev = existing.find((e) => e.address === addr)
  const rest = existing.filter((e) => e.address !== addr)
  if (!trimmed) {
    writeEntries(sortByTouched(rest).slice(0, MAX_GLOBAL_ADDRESS_ALIASES))
    return
  }
  const now = Date.now()
  writeEntries(
    sortByTouched([
      {
        address: addr,
        name: trimmed,
        createdAt: prev?.createdAt ?? now,
        touchedAt: now,
      },
      ...rest,
    ]).slice(0, MAX_GLOBAL_ADDRESS_ALIASES),
  )
}

export function clearGlobalAddressAlias(address: string): void {
  setGlobalAddressAlias(address, '')
}

/**
 * Replace the entire global book from the manager UI.
 * Rows with empty name or address are dropped; duplicate addresses keep the first.
 */
export function replaceGlobalAddressAliases(
  rows: { address: string; name: string; createdAt?: number }[],
): void {
  const now = Date.now()
  const seen = new Set<string>()
  const next: GlobalAddressAliasEntry[] = []
  for (const row of rows) {
    const address = row.address.trim()
    const name = row.name.trim()
    if (!address || !name || seen.has(address)) continue
    seen.add(address)
    const prev = readEntries().find((e) => e.address === address)
    next.push({
      address,
      name,
      createdAt: row.createdAt ?? prev?.createdAt ?? now,
      touchedAt: now,
    })
  }
  writeEntries(
    sortByTouched(next).slice(0, MAX_GLOBAL_ADDRESS_ALIASES),
  )
}
