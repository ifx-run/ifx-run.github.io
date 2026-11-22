const STORAGE_KEY = 'ifx.run.wire'

export function getStoredWire(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setStoredWire(wire: string): void {
  try {
    const trimmed = wire.trim()
    if (!trimmed) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, trimmed)
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredWire(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
