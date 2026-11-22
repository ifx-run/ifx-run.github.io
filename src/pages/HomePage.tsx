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
      <div className="home-canvas" aria-hidden="true">
        <div className="home-dotgrid" />
        <div className="home-horizon" />
      </div>

      <div className="home-stage">
        <h1 className="home-brand">{t.brand}</h1>
      </div>

      <div className="home-dock">
        <div className="home-dock-inner">
          <p className="home-kicker">{t.homeKicker}</p>
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
            <a
              href="https://github.com/ifx-run/ifx"
              target="_blank"
              rel="noreferrer"
            >
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
      </div>
    </section>
  )
}
