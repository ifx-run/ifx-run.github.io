import { useMemo, type CSSProperties } from 'react'
import { useApp } from '../context/AppContext'
import { bindingColor } from '../lib/ifx/binding-color'
import type { RawCpiPatchMapView } from '../lib/ifx/decode-l1'

const COLS = 16
const CELL_PX = 22

type PatchSeg = {
  source: number
  offset: number
  len: number
  /** First segment of this patch — show $N label. */
  showLabel: boolean
}

function hex2(b: number): string {
  return b.toString(16).padStart(2, '0')
}

/** Split a patch into per-row segments so overlays stay inside the strip. */
function rowSegments(
  offset: number,
  byteLen: number,
  source: number,
): PatchSeg[] {
  const out: PatchSeg[] = []
  let at = offset
  let left = byteLen
  let first = true
  while (left > 0) {
    const col = at % COLS
    const take = Math.min(left, COLS - col)
    out.push({ source, offset: at, len: take, showLabel: first })
    first = false
    at += take
    left -= take
  }
  return out
}

export function RawCpiByteBar({
  map,
  onValueClick,
  bindingByteSize,
}: {
  map: RawCpiPatchMapView
  onValueClick: (bindingIndex: number) => void
  /** Width of patch from Frame binding type; default 8 (u64). */
  bindingByteSize?: (bindingIndex: number) => number
}) {
  const { t } = useApp()
  const template = map.template
  const len = template.byteLength

  const patched = useMemo(() => {
    const cover = new Map<number, number>()
    const segs: PatchSeg[] = []
    for (const p of map.patches) {
      const width = Math.max(
        1,
        Math.min(len - p.dataOffset, bindingByteSize?.(p.source) ?? 8),
      )
      if (p.dataOffset < 0 || p.dataOffset >= len || width <= 0) continue
      for (let i = 0; i < width; i++) cover.set(p.dataOffset + i, p.source)
      segs.push(...rowSegments(p.dataOffset, width, p.source))
    }
    return { cover, segs }
  }, [map.patches, bindingByteSize, len])

  const rows = Math.max(1, Math.ceil(Math.max(len, 1) / COLS))
  const wrapStyle = {
    width: COLS * CELL_PX,
  } as CSSProperties

  return (
    <div className="raw-cpi-map">
      <div className="raw-cpi-map-head">
        <span className="raw-cpi-map-title">
          {t.rawCpiPatchMap}
          {map.label ? <span className="muted"> · {map.label}</span> : null}
        </span>
        <span className="raw-cpi-map-hint muted">
          {t.rawCpiPatchMapHint(len)}
        </span>
      </div>
      <div className="raw-cpi-hexstrip-wrap" style={wrapStyle}>
        <div
          className="raw-cpi-hexstrip"
          role="img"
          aria-label={t.rawCpiPatchMapHint(len)}
          style={{ height: rows * CELL_PX }}
        >
          {Array.from({ length: len }, (_, i) => {
            const src = patched.cover.get(i)
            return (
              <span
                key={i}
                className={[
                  'raw-cpi-cell',
                  src !== undefined ? 'is-patched' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title={`off${i}${src !== undefined ? ` ← $${src}` : ''}`}
              >
                <span className="raw-cpi-cell-hex">{hex2(template[i]!)}</span>
              </span>
            )
          })}
          {patched.segs.map((seg, i) => {
            const col = seg.offset % COLS
            const row = Math.floor(seg.offset / COLS)
            return (
              <button
                key={`${seg.source}-${seg.offset}-${i}`}
                type="button"
                className="raw-cpi-patch-hit"
                style={{
                  left: col * CELL_PX,
                  top: row * CELL_PX,
                  width: seg.len * CELL_PX,
                  height: CELL_PX,
                  color: bindingColor(seg.source),
                }}
                title={`off${seg.offset} ← $${seg.source}`}
                onClick={() => onValueClick(seg.source)}
              >
                {seg.showLabel ? (
                  <span className="raw-cpi-patch-label">${seg.source}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
