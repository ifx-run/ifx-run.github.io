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
    <section className="home-hero">
      <div className="home-hero-glow" aria-hidden="true" />
      <p className="home-kicker">{t.homeKicker}</p>
      <h1 className="home-brand">{t.brand}</h1>
      <p className="home-headline">{t.homeHeadline}</p>
      <p className="home-support">{t.homeSupport}</p>
      <div className="home-ctas">
        <Link to="/explorer" className="cta cta-primary">
          {t.ctaExplorer}
        </Link>
        <Link to="/docs" className="cta cta-secondary">
          {t.ctaDocs}
        </Link>
      </div>
      <p className="home-foot">
        <a href="https://github.com/ifx-run/ifx" target="_blank" rel="noreferrer">
          {t.github}
        </a>
        <span aria-hidden="true"> · </span>
        <a
          href="https://www.npmjs.com/package/@ifx-run/sdk"
          target="_blank"
          rel="noreferrer"
        >
          @ifx-run/sdk
        </a>
      </p>
    </section>
  )
}
