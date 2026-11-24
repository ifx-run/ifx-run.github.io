/** Cross-transaction address names (not binding `$N` keys). */
export const MAX_GLOBAL_ADDRESS_ALIASES = 128

export const GLOBAL_ADDRESS_BOOK_FORMAT = 'ifx.run.globalAddressBook' as const
export const GLOBAL_ADDRESS_BOOK_VERSION = 1 as const

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

export type GlobalAddressBookPackage = {
  format: typeof GLOBAL_ADDRESS_BOOK_FORMAT
  version: number
  entries: { address: string; name: string }[]
}

/** Shareable JSON for the current global address book (or an explicit row list). */
export function buildGlobalAddressBookPackage(
  rows?: { address: string; name: string }[],
): GlobalAddressBookPackage {
  const source =
    rows ??
    listGlobalAddressAliases().map((e) => ({
      address: e.address,
      name: e.name,
    }))
  const seen = new Set<string>()
  const entries: { address: string; name: string }[] = []
  for (const row of source) {
    const address = row.address.trim()
    const name = row.name.trim()
    if (!address || !name || seen.has(address)) continue
    seen.add(address)
    entries.push({ address, name })
  }
  return {
    format: GLOBAL_ADDRESS_BOOK_FORMAT,
    version: GLOBAL_ADDRESS_BOOK_VERSION,
    entries,
  }
}

export function globalAddressBookPackageToJson(
  pkg: GlobalAddressBookPackage,
): string {
  return `${JSON.stringify(pkg, null, 2)}\n`
}

/** Parse and validate an imported global address book JSON value. */
export function parseGlobalAddressBookPackage(
  raw: unknown,
): GlobalAddressBookPackage {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('invalid address book JSON')
  }
  const obj = raw as Record<string, unknown>
  if (obj.format !== GLOBAL_ADDRESS_BOOK_FORMAT) {
    throw new Error('not an ifx.run global address book file')
  }
  if (typeof obj.version !== 'number' || obj.version < 1) {
    throw new Error('unsupported address book version')
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error('entries must be an array')
  }
  const seen = new Set<string>()
  const entries: { address: string; name: string }[] = []
  for (const item of obj.entries) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const row = item as Record<string, unknown>
    if (typeof row.address !== 'string' || typeof row.name !== 'string') continue
    const address = row.address.trim()
    const name = row.name.trim()
    if (!address || !name || seen.has(address)) continue
    seen.add(address)
    entries.push({ address, name })
  }
  return {
    format: GLOBAL_ADDRESS_BOOK_FORMAT,
    version: obj.version,
    entries,
  }
}

export function globalAddressBookDownloadName(): string {
  const d = new Date()
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('')
  return `ifx-address-book-${stamp}.json`
}
