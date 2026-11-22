import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEFAULT_IFX_PROGRAM_ID } from '../lib/ifx/program-ids'

export function Layout() {
  const { t, toggleLang, lang } = useApp()
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className={isHome ? 'shell shell-home' : 'shell'}>
      <header className="topbar">
        {!isHome && (
          <NavLink to="/" className="logo" end>
            {t.brand}
          </NavLink>
        )}
        <nav className="topbar-nav" aria-label="Primary">
          <NavLink to="/explorer">{t.navExplorer}</NavLink>
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
      <main className={isHome ? 'main main-home' : 'main'}>
        <Outlet />
      </main>
      {!isHome && (
        <footer className="footer">
          <span>
            {t.programId}: <code>{DEFAULT_IFX_PROGRAM_ID}</code>
          </span>
          <span className="footer-sep">·</span>
          <a
            href="https://www.npmjs.com/package/@ifx-run/sdk"
            target="_blank"
            rel="noreferrer"
          >
            @ifx-run/sdk
          </a>
          <span className="footer-sep">·</span>
          <span lang={lang}>ifx.run</span>
        </footer>
      )}
    </div>
  )
}
