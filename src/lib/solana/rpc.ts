const STORAGE_KEY = 'ifx.run.rpcUrl'

export const DEFAULT_RPC_URL =
  (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined)?.trim() ||
  'https://api.mainnet-beta.solana.com'

export function getStoredRpcUrl(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY)?.trim()
    if (v) return v
  } catch {
    /* ignore */
  }
  return DEFAULT_RPC_URL
}

export function setStoredRpcUrl(url: string): void {
  const trimmed = url.trim()
  if (!trimmed) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, trimmed)
}
