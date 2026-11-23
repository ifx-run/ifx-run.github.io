/** Cross-transaction address names (not binding `$N` keys). */
export const MAX_GLOBAL_ADDRESS_ALIASES = 128

const STORAGE_KEY = 'ifx.run.globalAddressAliases'

type Entry = {
  address: string
  name: string
  touchedAt: number
}

function readEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e): e is Entry =>
          !!e &&
          typeof e === 'object' &&
          typeof (e as Entry).address === 'string' &&
          typeof (e as Entry).name === 'string' &&
          typeof (e as Entry).touchedAt === 'number' &&
          Boolean((e as Entry).name.trim()),
      )
      .map((e) => ({
        address: e.address,
        name: e.name.trim(),
        touchedAt: e.touchedAt,
      }))
  } catch {
    return []
  }
}

function writeEntries(entries: Entry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* quota / private mode */
  }
}

function sortByTouched(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => b.touchedAt - a.touchedAt)
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

/** Set or update; empty name deletes. Touches LRU. */
export function setGlobalAddressAlias(address: string, name: string): void {
  const addr = address.trim()
  if (!addr) return
  const trimmed = name.trim()
  const rest = readEntries().filter((e) => e.address !== addr)
  if (!trimmed) {
    writeEntries(sortByTouched(rest).slice(0, MAX_GLOBAL_ADDRESS_ALIASES))
    return
  }
  writeEntries(
    sortByTouched([
      { address: addr, name: trimmed, touchedAt: Date.now() },
      ...rest,
    ]).slice(0, MAX_GLOBAL_ADDRESS_ALIASES),
  )
}

export function clearGlobalAddressAlias(address: string): void {
  setGlobalAddressAlias(address, '')
}
