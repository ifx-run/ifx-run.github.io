import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { bindingColor } from '../lib/ifx/binding-color'
import type { RawCpiPatchMapView } from '../lib/ifx/decode-l1'

function hex2(b: number): string {
  return b.toString(16).padStart(2, '0')
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

  /** offset → source binding for every covered byte */
  const cover = useMemo(() => {
    const m = new Map<number, number>()
    for (const p of map.patches) {
      const width = Math.max(
        1,
        Math.min(len - p.dataOffset, bindingByteSize?.(p.source) ?? 8),
      )
      if (p.dataOffset < 0 || p.dataOffset >= len || width <= 0) continue
      for (let i = 0; i < width; i++) m.set(p.dataOffset + i, p.source)
    }
    return m
  }, [map.patches, bindingByteSize, len])

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
      <div
        className="raw-cpi-hexstrip"
        role="img"
        aria-label={t.rawCpiPatchMapHint(len)}
      >
        {Array.from({ length: len }, (_, i) => {
          const src = cover.get(i)
          if (src !== undefined) {
            return (
              <button
                key={i}
                type="button"
                className="raw-cpi-cell is-patched"
                style={{ color: bindingColor(src) }}
                title={`off${i} ← $${src}`}
                onClick={() => onValueClick(src)}
              >
                <span className="raw-cpi-cell-hex" aria-hidden="true">
                  {hex2(template[i]!)}
                </span>
                <span className="raw-cpi-cell-bind">${src}</span>
              </button>
            )
          }
          return (
            <span
              key={i}
              className="raw-cpi-cell"
              title={`off${i}`}
            >
              <span className="raw-cpi-cell-hex">{hex2(template[i]!)}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
