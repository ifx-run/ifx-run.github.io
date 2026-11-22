const STORAGE_KEY = 'ifx.run.bindingAliases'

type AliasBag = Record<string, Record<string, string>>

function readBag(): AliasBag {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as AliasBag
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

/** Aliases keyed by wire string; cleared when that wire is cleared. */
export function getStoredAliases(wire: string): Record<string, string> {
  const key = wire.trim()
  if (!key) return {}
  return { ...(readBag()[key] ?? {}) }
}

export function setStoredAlias(
  wire: string,
  aliasKey: string,
  name: string,
): void {
  const key = wire.trim()
  if (!key) return
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
    const key = wire.trim()
    if (!key) return
    const map = readBag()
    if (!(key in map)) return
    delete map[key]
    writeBag(map)
  } catch {
    /* ignore */
  }
}
