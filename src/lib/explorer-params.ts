/** Legacy query keys (still accepted, then redirected to `/explorer/:sig`). */
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

/** Signature segment from `/explorer/:sig`, or null on `/explorer`. */
export function explorerSignatureFromParam(
  sig: string | undefined | null,
): string | null {
  if (sig == null) return null
  let raw = sig.trim()
  if (!raw) return null
  try {
    raw = decodeURIComponent(raw).trim()
  } catch {
    /* keep raw */
  }
  return raw || null
}

/**
 * Pathname signature when the URL is `/explorer/<sig>` (basename-aware).
 * Used for first paint before the router hook is ready.
 */
export function explorerSignatureFromPathname(
  pathname: string,
  basename: string = typeof import.meta !== 'undefined'
    ? String(import.meta.env.BASE_URL ?? '').replace(/\/$/, '')
    : '',
): string | null {
  let path = pathname
  if (basename && path.startsWith(basename)) {
    path = path.slice(basename.length) || '/'
  }
  const m = /^\/explorer\/([^/]+)\/?$/.exec(path)
  if (!m) return null
  return explorerSignatureFromParam(m[1])
}

/** Canonical explorer location: `/explorer` or `/explorer/<signature>`. */
export function explorerPath(signature: string | null | undefined): string {
  const sig = signature?.trim()
  if (!sig) return '/explorer'
  return `/explorer/${encodeURIComponent(sig)}`
}

/** Initial textarea value from path, then legacy query (not localStorage). */
export function explorerIngressFromLocation(
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '',
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  return (
    explorerSignatureFromPathname(pathname) ??
    explorerIngressFromSearchParams(new URLSearchParams(search))
  )
}
