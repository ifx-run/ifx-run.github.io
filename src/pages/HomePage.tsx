import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function HomePage() {
  const { t } = useApp()
  const [params] = useSearchParams()
  const tx = params.get('tx')
  if (tx) {
    return (
      <Navigate to={`/explorer?tx=${encodeURIComponent(tx)}`} replace />
    )
  }

  return (
    <section className="home">
      <aside className="home-slab" aria-hidden="true">
        <div className="home-slab-marks">
          <span>let</span>
          <span>assert</span>
          <span>if_else</span>
          <span>cpi</span>
        </div>
      </aside>

      <div className="home-copy">
        <p className="home-kicker">{t.homeKicker}</p>
        <h1 className="home-brand">
          <span className="home-brand-ink">{t.brand}</span>
        </h1>
        <p className="home-headline">{t.homeHeadline}</p>
        <p className="home-support">{t.homeSupport}</p>
        <div className="home-ctas">
          <Link to="/explorer" className="cta cta-primary">
            {t.ctaExplorer}
          </Link>
          <Link to="/docs" className="cta cta-secondary">
            {t.ctaDocs}
            <span className="cta-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
        <p className="home-foot">
          <a href="https://github.com/ifx-run/ifx" target="_blank" rel="noreferrer">
            {t.github}
          </a>
          <span className="home-foot-sep" aria-hidden="true" />
          <a
            href="https://www.npmjs.com/package/@ifx-run/sdk"
            target="_blank"
            rel="noreferrer"
          >
            @ifx-run/sdk
          </a>
        </p>
      </div>
    </section>
  )
}
