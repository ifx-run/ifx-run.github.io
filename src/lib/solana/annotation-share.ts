import { bytesToHex, decodeWireInput, type WireEncoding } from './bytes'
import { getStoredAliases } from './alias-storage'

export const ANNOTATION_FORMAT = 'ifx.run.annotation' as const
export const ANNOTATION_VERSION = 1 as const

export type AnnotationPackage = {
  format: typeof ANNOTATION_FORMAT
  version: number
  wire: {
    encoding: WireEncoding
    data: string
  }
  /** Binding keys (`frame:index`) and address pubkeys → display names. */
  aliases: Record<string, string>
}

function isWireEncoding(v: unknown): v is WireEncoding {
  return v === 'hex' || v === 'base58' || v === 'base64'
}

function cleanAliases(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('aliases must be an object')
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== 'string' || !key.trim()) continue
    if (typeof value !== 'string') continue
    const name = value.trim()
    if (name) out[key.trim()] = name
  }
  return out
}

/** Build a shareable JSON package for the current wire + local names. */
export function buildAnnotationPackage(wire: string): AnnotationPackage {
  const trimmed = wire.trim()
  if (!trimmed) throw new Error('empty wire')
  const { bytes } = decodeWireInput(trimmed)
  return {
    format: ANNOTATION_FORMAT,
    version: ANNOTATION_VERSION,
    // Hex is unambiguous across paste targets.
    wire: { encoding: 'hex', data: bytesToHex(bytes) },
    aliases: getStoredAliases(trimmed),
  }
}

export function annotationPackageToJson(pkg: AnnotationPackage): string {
  return `${JSON.stringify(pkg, null, 2)}\n`
}

/** Parse and validate an imported annotation JSON value. */
export function parseAnnotationPackage(raw: unknown): AnnotationPackage {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('invalid annotation JSON')
  }
  const obj = raw as Record<string, unknown>
  if (obj.format !== ANNOTATION_FORMAT) {
    throw new Error('not an ifx.run annotation file')
  }
  if (typeof obj.version !== 'number' || obj.version < 1) {
    throw new Error('unsupported annotation version')
  }
  const wire = obj.wire
  if (!wire || typeof wire !== 'object' || Array.isArray(wire)) {
    throw new Error('missing wire')
  }
  const w = wire as Record<string, unknown>
  if (!isWireEncoding(w.encoding) || typeof w.data !== 'string' || !w.data.trim()) {
    throw new Error('invalid wire')
  }
  // Ensure the wire actually decodes.
  decodeWireInput(w.data.trim())
  return {
    format: ANNOTATION_FORMAT,
    version: obj.version,
    wire: { encoding: w.encoding, data: w.data.trim() },
    aliases: cleanAliases(obj.aliases ?? {}),
  }
}

export function parseAnnotationJson(text: string): AnnotationPackage {
  let raw: unknown
  try {
    raw = JSON.parse(text) as unknown
  } catch {
    throw new Error('invalid JSON')
  }
  return parseAnnotationPackage(raw)
}

/** Wire string to paste into the explorer (prefer package encoding as-is). */
export function annotationWireText(pkg: AnnotationPackage): string {
  if (pkg.wire.encoding === 'hex') {
    return pkg.wire.data.startsWith('0x') || pkg.wire.data.startsWith('0X')
      ? pkg.wire.data
      : pkg.wire.data
  }
  return pkg.wire.data
}

export function annotationDownloadName(pkg: AnnotationPackage): string {
  const id = pkg.wire.data.replace(/^0x/i, '').slice(0, 12) || 'tx'
  return `ifx-annotation-${id}.json`
}
