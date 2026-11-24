import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { bindingColor } from '../lib/ifx/binding-color'
import type { RawCpiPatchMapView } from '../lib/ifx/decode-l1'

function hex2(b: number): string {
  return b.toString(16).padStart(2, '0')
}

type CellPatch = {
  source: number
  /** First byte of this patch span — only cell that shows $N. */
  head: boolean
  /** Contiguous with previous cell in the same patch (for seamless bar). */
  cont: boolean
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

  const cover = useMemo(() => {
    const m = new Map<number, CellPatch>()
    for (const p of map.patches) {
      const width = Math.max(
        1,
        Math.min(len - p.dataOffset, bindingByteSize?.(p.source) ?? 8),
      )
      if (p.dataOffset < 0 || p.dataOffset >= len || width <= 0) continue
      for (let i = 0; i < width; i++) {
        m.set(p.dataOffset + i, {
          source: p.source,
          head: i === 0,
          cont: i > 0,
        })
      }
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
        <span className="raw-cpi-map-hint muted">{len} B</span>
      </div>
      <div
        className="raw-cpi-hexstrip"
        role="img"
        aria-label={`${t.rawCpiPatchMap} · ${len} B`}
      >
        {Array.from({ length: len }, (_, i) => {
          const patch = cover.get(i)
          if (patch) {
            return (
              <button
                key={i}
                type="button"
                className={[
                  'raw-cpi-cell',
                  'is-patched',
                  patch.head ? 'is-patch-head' : 'is-patch-tail',
                  patch.cont ? 'is-patch-cont' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ color: bindingColor(patch.source) }}
                title={`off${i} ← $${patch.source}`}
                onClick={() => onValueClick(patch.source)}
              >
                <span className="raw-cpi-cell-hex" aria-hidden="true">
                  {hex2(template[i]!)}
                </span>
                {patch.head ? (
                  <span className="raw-cpi-cell-bind">${patch.source}</span>
                ) : null}
              </button>
            )
          }
          return (
            <span key={i} className="raw-cpi-cell" title={`off${i}`}>
              <span className="raw-cpi-cell-hex">{hex2(template[i]!)}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
