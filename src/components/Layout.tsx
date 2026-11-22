import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEFAULT_IFX_PROGRAM_ID } from '../lib/ifx/program-ids'

export function Layout() {
  const { t, toggleLang, lang } = useApp()

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-brand">
          <NavLink to="/" className="logo" end>
            {t.brand}
          </NavLink>
          <span className="topbar-tagline" title={t.tagline}>
            explorer
          </span>
        </div>
        <nav className="topbar-nav" aria-label="Primary">
          <NavLink to="/" end>
            {t.navExplorer}
          </NavLink>
          <NavLink to="/docs">{t.navDocs}</NavLink>
          <a
            href="https://github.com/ifx-run/ifx"
            target="_blank"
            rel="noreferrer"
          >
            {t.github}
          </a>
          <button type="button" className="ghost" onClick={toggleLang}>
            {t.langToggle}
          </button>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <span>
          {t.programId}:{' '}
          <code>{DEFAULT_IFX_PROGRAM_ID}</code>
        </span>
        <span className="footer-sep">·</span>
        <a href="https://www.npmjs.com/package/@ifx-run/sdk" target="_blank" rel="noreferrer">
          @ifx-run/sdk
        </a>
        <span className="footer-sep">·</span>
        <span lang={lang}>ifx.run</span>
      </footer>
    </div>
  )
}
