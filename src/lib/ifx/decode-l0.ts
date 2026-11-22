/**
 * L0 Ifx instruction decode — mirrors `@ifx-run/sdk` `decodeIfxInstruction` / `ifxIxHint`.
 * Discriminators must match on-chain `constants.rs` / SDK `IX_DISC_*`.
 *
 * Sync plan: when L1 lands, prefer importing decode helpers / IDL from `@ifx-run/sdk`
 * (or shared package). Until then this module is intentionally small and pin-aligned.
 */

export const IFX_IX_NAMES = [
  'ifx_create_frame',
  'ifx_close_frame',
  'ifx_reset_frame',
  'ifx_let',
  'ifx_assert',
  'ifx_assert_multi',
  'ifx_patched_cpi',
  'ifx_if_else',
] as const

export type IfxIxName = (typeof IFX_IX_NAMES)[number]

/** Short UI labels (create / let / …). */
export const IFX_IX_SHORT: Record<IfxIxName, string> = {
  ifx_create_frame: 'create',
  ifx_close_frame: 'close',
  ifx_reset_frame: 'reset',
  ifx_let: 'let',
  ifx_assert: 'assert',
  ifx_assert_multi: 'assert_multi',
  ifx_patched_cpi: 'patched_cpi',
  ifx_if_else: 'if_else',
}

export const IX_DISC_CREATE_FRAME = 0
export const IX_DISC_CLOSE_FRAME = 1
export const IX_DISC_RESET_FRAME = 2
export const IX_DISC_LET = 3
export const IX_DISC_ASSERT = 4
export const IX_DISC_ASSERT_MULTI = 5
export const IX_DISC_PATCHED_CPI = 6
export const IX_DISC_IF_ELSE = 7

const DISC_TO_NAME: ReadonlyMap<number, IfxIxName> = new Map([
  [IX_DISC_CREATE_FRAME, 'ifx_create_frame'],
  [IX_DISC_CLOSE_FRAME, 'ifx_close_frame'],
  [IX_DISC_RESET_FRAME, 'ifx_reset_frame'],
  [IX_DISC_LET, 'ifx_let'],
  [IX_DISC_ASSERT, 'ifx_assert'],
  [IX_DISC_ASSERT_MULTI, 'ifx_assert_multi'],
  [IX_DISC_PATCHED_CPI, 'ifx_patched_cpi'],
  [IX_DISC_IF_ELSE, 'ifx_if_else'],
])

export type DecodedIfxInstruction = {
  name: IfxIxName
  discriminator: number
  data: Uint8Array
  payload: Uint8Array
}

export function decodeIfxInstruction(
  data: Uint8Array,
): DecodedIfxInstruction {
  if (data.length < 1) {
    throw new Error('Ifx instruction data is empty')
  }
  const discriminator = data[0]!
  const name = DISC_TO_NAME.get(discriminator)
  if (!name) {
    throw new Error(`unknown Ifx instruction discriminator: ${discriminator}`)
  }
  return {
    name,
    discriminator,
    data,
    payload: data.subarray(1),
  }
}

export function ifxIxHint(data: Uint8Array): string | undefined {
  try {
    return decodeIfxInstruction(data).name
  } catch {
    return undefined
  }
}

/** Docs slug for deep links (Explorer ↔ /docs). */
export function docsSlugForIfxIx(name: IfxIxName): string {
  switch (name) {
    case 'ifx_create_frame':
    case 'ifx_close_frame':
    case 'ifx_reset_frame':
      return 'frame-authority'
    case 'ifx_let':
      return 'typed-let-bindings'
    case 'ifx_assert':
    case 'ifx_assert_multi':
      return 'errors'
    case 'ifx_patched_cpi':
      return 'raw-cpi-patches'
    case 'ifx_if_else':
      return 'structured-cpi-patches'
  }
}
