import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { docsArticlePath, docsIndexPath } from '../lib/docs/paths'

export function HomePage() {
  const { t, lang } = useApp()

  return (
    <section className="home">
      <div className="home-canvas" aria-hidden="true">
        <div className="home-dotgrid" />
        <div className="home-horizon" />
      </div>

      <div className="home-stage">
        <h1 className="home-brand">
          <img
            className="home-brand-mark"
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            width={512}
            height={512}
            decoding="async"
            aria-hidden="true"
          />
          <span className="home-brand-word">{t.brand}</span>
        </h1>
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
            <Link
              to={docsArticlePath('quick-start', lang)}
              className="cta cta-secondary"
            >
              {t.ctaQuickStart}
              <span className="cta-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
          <p className="home-foot">
            <Link to={docsIndexPath(lang)}>{t.ctaDocs}</Link>
            <span className="home-foot-sep" aria-hidden="true" />
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
