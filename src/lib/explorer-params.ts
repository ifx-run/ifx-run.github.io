/** Legacy query keys (still accepted, then redirected to `/explorer/:ingress`). */
const SIGNATURE_KEYS = ['hash', 'sig', 'signature'] as const
const WIRE_KEYS = ['tx', 'wire'] as const

/**
 * Read a one-shot legacy query ingress (`?hash=` / `?tx=` …).
 * Prefer signature keys, then wire/tx.
 */
export function explorerIngressFromSearchParams(
  params: URLSearchParams,
): string | null {
  for (const key of SIGNATURE_KEYS) {
    const v = params.get(key)?.trim()
    if (v) return v
  }
  for (const key of WIRE_KEYS) {
    const v = params.get(key)?.trim()
    if (v) return v
  }
  return null
}

export function hasExplorerSearchIngress(params: URLSearchParams): boolean {
  return explorerIngressFromSearchParams(params) != null
}

/**
 * Path segment from `/explorer/:ingress`, or null on `/explorer`.
 * The segment may be a tx signature/hash or wire bytes (hex / base58 / base64).
 */
export function explorerIngressFromParam(
  ingress: string | undefined | null,
): string | null {
  if (ingress == null) return null
  let raw = ingress.trim()
  if (!raw) return null
  try {
    raw = decodeURIComponent(raw).trim()
  } catch {
    /* keep raw */
  }
  return raw || null
}

/** @deprecated Use explorerIngressFromParam */
export const explorerSignatureFromParam = explorerIngressFromParam

/**
 * Pathname ingress when the URL is `/explorer/<ingress>` (basename-aware).
 * Used for first paint before the router hook is ready.
 */
export function explorerIngressFromPathname(
  pathname: string,
  basename: string = typeof import.meta !== 'undefined'
    ? String(import.meta.env.BASE_URL ?? '').replace(/\/$/, '')
    : '',
): string | null {
  let path = pathname
  if (basename && path.startsWith(basename)) {
    path = path.slice(basename.length) || '/'
  }
  // One segment only — callers must encodeURIComponent wire (so `/` in base64 → %2F).
  const m = /^\/explorer\/([^/]+)\/?$/.exec(path)
  if (!m) return null
  return explorerIngressFromParam(m[1])
}

/** @deprecated Use explorerIngressFromPathname */
export const explorerSignatureFromPathname = explorerIngressFromPathname

/**
 * Canonical explorer location: `/explorer` or `/explorer/<ingress>`.
 * Prefer a signature/hash when available; wire is allowed but should be URL-encoded.
 */
export function explorerPath(ingress: string | null | undefined): string {
  const value = ingress?.trim()
  if (!value) return '/explorer'
  return `/explorer/${encodeURIComponent(value)}`
}

/** Initial textarea value from path, then legacy query (not localStorage). */
export function explorerIngressFromLocation(
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '',
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  return (
    explorerIngressFromPathname(pathname) ??
    explorerIngressFromSearchParams(new URLSearchParams(search))
  )
}
