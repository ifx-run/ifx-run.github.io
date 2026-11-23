/** Query keys that carry a tx signature / hash. */
const SIGNATURE_KEYS = ['hash', 'sig', 'signature'] as const

/** Query keys that carry raw wire (base58 / base64 / hex). */
const WIRE_KEYS = ['tx', 'wire'] as const

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
