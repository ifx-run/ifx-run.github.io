/** Query keys that carry a tx signature / hash. */
export const SIGNATURE_KEYS = ['hash', 'sig', 'signature'] as const

/** Query keys that carry raw wire (base58 / base64 / hex). */
export const WIRE_KEYS = ['tx', 'wire'] as const

const EXPLORER_KEYS = [...SIGNATURE_KEYS, ...WIRE_KEYS] as const

/**
 * Read explorer ingress from the URL.
 * Prefer signature/hash keys, then wire/tx. Empty values are ignored.
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

/** URL ingress for first paint (`window.location.search`), or null. */
export function explorerIngressFromLocationSearch(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  return explorerIngressFromSearchParams(new URLSearchParams(search))
}

/**
 * Canonical explorer deep-link: `?hash=<signature>`, or no explorer keys.
 * Preserves unrelated query params (e.g. future flags).
 */
export function withExplorerHash(
  params: URLSearchParams,
  signature: string | null,
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of EXPLORER_KEYS) next.delete(key)
  const sig = signature?.trim()
  if (sig) next.set('hash', sig)
  return next
}

export function searchParamsEqual(
  a: URLSearchParams,
  b: URLSearchParams,
): boolean {
  return a.toString() === b.toString()
}
