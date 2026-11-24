import { useApp } from '../context/AppContext'
import type { RawCpiPatchMapView } from '../lib/ifx/decode-l1'

const MIN_MARKER_PCT = 2.5

export function RawCpiByteBar({
  map,
  onValueClick,
}: {
  map: RawCpiPatchMapView
  onValueClick: (bindingIndex: number) => void
}) {
  const { t } = useApp()
  const len = Math.max(1, map.dataLen)
  const ticks = [0, Math.floor(len / 2), len].filter(
    (v, i, a) => a.indexOf(v) === i,
  )

  return (
    <div className="raw-cpi-map">
      <div className="raw-cpi-map-head">
        <span className="raw-cpi-map-title">
          {t.rawCpiPatchMap}
          {map.label ? <span className="muted"> · {map.label}</span> : null}
        </span>
        <span className="raw-cpi-map-hint muted">
          {t.rawCpiPatchMapHint(map.dataLen)}
        </span>
      </div>
      <div
        className="raw-cpi-bar"
        role="img"
        aria-label={t.rawCpiPatchMapHint(map.dataLen)}
      >
        <div className="raw-cpi-bar-track" />
        {map.patches.map((p, i) => {
          const left = Math.min(100, Math.max(0, (p.dataOffset / len) * 100))
          const width = Math.max(
            MIN_MARKER_PCT,
            Math.min(12, (8 / len) * 100),
          )
          return (
            <button
              key={`${p.dataOffset}-${p.source}-${i}`}
              type="button"
              className="raw-cpi-marker"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`off${p.dataOffset} ← $${p.source}`}
              onClick={() => onValueClick(p.source)}
            >
              <span className="raw-cpi-marker-label">${p.source}</span>
            </button>
          )
        })}
      </div>
      <div className="raw-cpi-ticks" aria-hidden="true">
        {ticks.map((n) => (
          <span
            key={n}
            className="raw-cpi-tick"
            style={{ left: `${(n / len) * 100}%` }}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}
