import {
  clearStoredAliases,
  pruneStoredAliasesToBagKeys,
  wireAliasBagKey,
} from './alias-storage'

/**
 * Soft cap for remembered transactions.
 * Wire blobs are small; 32 (2^5) is plenty of history without meaningful quota pressure.
 */
export const MAX_WIRE_CACHE = 32

const LEGACY_KEY = 'ifx.run.wire'
const DRAFT_KEY = 'ifx.run.wireDraft'
const CACHE_KEY = 'ifx.run.wireCache'

export type WireCacheEntry = {
  id: string
  wire: string
  touchedAt: number
}

type WireCacheBag = {
  activeId: string | null
  entries: WireCacheEntry[]
}

function emptyBag(): WireCacheBag {
  return { activeId: null, entries: [] }
}

function readBag(): WireCacheBag {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>
        const entries = Array.isArray(obj.entries)
          ? obj.entries
              .filter(
                (e): e is WireCacheEntry =>
                  !!e &&
                  typeof e === 'object' &&
                  typeof (e as WireCacheEntry).id === 'string' &&
                  typeof (e as WireCacheEntry).wire === 'string' &&
                  typeof (e as WireCacheEntry).touchedAt === 'number',
              )
              .map((e) => ({
                id: e.id,
                wire: e.wire,
                touchedAt: e.touchedAt,
              }))
          : []
        const activeId =
          typeof obj.activeId === 'string' || obj.activeId === null
            ? (obj.activeId as string | null)
            : null
        return { activeId, entries }
      }
    }

    // Migrate legacy single-wire key once into draft + cache.
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy?.trim()) {
      const wire = legacy.trim()
      try {
        localStorage.setItem(DRAFT_KEY, wire)
      } catch {
        /* ignore */
      }
      const id = wireAliasBagKey(wire)
      const bag: WireCacheBag =
        id === 'raw:'
          ? emptyBag()
          : {
              activeId: id,
              entries: [{ id, wire, touchedAt: Date.now() }],
            }
      writeBag(bag)
      localStorage.removeItem(LEGACY_KEY)
      return bag
    }
  } catch {
    /* ignore */
  }
  return emptyBag()
}

function writeBag(bag: WireCacheBag): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(bag))
  } catch {
    /* quota / private mode */
  }
}

function sortByTouched(entries: WireCacheEntry[]): WireCacheEntry[] {
  return [...entries].sort((a, b) => b.touchedAt - a.touchedAt)
}

function enforceLimit(bag: WireCacheBag): WireCacheBag {
  let entries = sortByTouched(bag.entries)
  const evicted: WireCacheEntry[] = []
  while (entries.length > MAX_WIRE_CACHE) {
    const old = entries.pop()
    if (old) evicted.push(old)
  }
  for (const e of evicted) {
    clearStoredAliases(e.wire)
  }
  const ids = new Set(entries.map((e) => e.id))
  pruneStoredAliasesToBagKeys(ids)
  let activeId = bag.activeId
  if (activeId && !ids.has(activeId)) {
    activeId = entries[0]?.id ?? null
  }
  return { activeId, entries }
}

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(wire: string): void {
  try {
    const trimmed = wire.trim()
    if (!trimmed) localStorage.removeItem(DRAFT_KEY)
    else localStorage.setItem(DRAFT_KEY, trimmed)
  } catch {
    /* ignore */
  }
}

/** Textarea draft, falling back to the active cache entry. */
export function getStoredWire(): string {
  const draft = readDraft()
  if (draft) return draft
  const bag = readBag()
  if (bag.activeId) {
    const hit = bag.entries.find((e) => e.id === bag.activeId)
    if (hit) return hit.wire
  }
  return sortByTouched(bag.entries)[0]?.wire ?? ''
}

/** Persist the textarea draft (does not grow the LRU list). */
export function setStoredWire(wire: string): void {
  writeDraft(wire)
}

/**
 * Remember a successfully decoded transaction in the LRU cache.
 * Same byte fingerprint updates in place; oldest entries drop past the cap.
 */
export function rememberDecodedWire(wire: string): void {
  const trimmed = wire.trim()
  if (!trimmed) return
  writeDraft(trimmed)
  const id = wireAliasBagKey(trimmed)
  if (id === 'raw:') return

  const bag = readBag()
  const now = Date.now()
  const rest = bag.entries.filter((e) => e.id !== id)
  writeBag(
    enforceLimit({
      activeId: id,
      entries: [{ id, wire: trimmed, touchedAt: now }, ...rest],
    }),
  )
}

/** Remove one wire (and its aliases) from the cache; clear draft if it matches. */
export function removeStoredWire(wire: string): void {
  const trimmed = wire.trim()
  if (!trimmed) {
    writeDraft('')
    return
  }
  const id = wireAliasBagKey(trimmed)
  const bag = readBag()
  const hit = bag.entries.find((e) => e.id === id)
  if (hit) clearStoredAliases(hit.wire)
  else clearStoredAliases(trimmed)
  const entries = bag.entries.filter((e) => e.id !== id)
  const activeId =
    bag.activeId === id ? (entries[0]?.id ?? null) : bag.activeId
  writeBag(enforceLimit({ activeId, entries }))
  if (readDraft() === trimmed || wireAliasBagKey(readDraft()) === id) {
    writeDraft('')
  }
}

/** Clear the current draft and drop it from the cache. */
export function clearStoredWire(): void {
  const current = getStoredWire()
  if (current) removeStoredWire(current)
  else writeDraft('')
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
}

