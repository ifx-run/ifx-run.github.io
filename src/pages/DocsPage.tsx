import { useEffect, useState, type MouseEvent } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  DOCS_META,
  SITE_DOC_ENTRIES,
  SYNCED_DOC_ENTRIES,
  docMarkdown,
  docTitle,
  getDoc,
} from '../lib/docs/catalog'
import {
  docsArticlePath,
  docsIndexPath,
  docsSlugFromPathname,
  langFromDocsPathname,
} from '../lib/docs/paths'
import { renderMarkdown } from '../lib/docs/render'
import type { Lang } from '../lib/i18n'

export function parseLangParam(raw: string | null): Lang | null {
  if (raw === 'zh' || raw === 'en') return raw
  return null
}

function useDocSlugFromRoute(): string | undefined {
  const { slug, topic } = useParams()
  if (!slug) return undefined
  return topic ? `${slug}/${topic}` : slug
}

/** Route path is the source of truth for docs language. */
function useLangFromDocsPath() {
  const { lang, setLang } = useApp()
  const { pathname } = useLocation()

  useEffect(() => {
    const fromPath = langFromDocsPathname(pathname)
    if (fromPath && fromPath !== lang) setLang(fromPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [pathname, setLang])
}

/** Old `?lang=` bookmarks → `/docs…` or `/zh/docs…`. */
function useRedirectLegacyLangQuery() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const docSlug = useDocSlugFromRoute()

  useEffect(() => {
    const q = parseLangParam(params.get('lang'))
    if (!q) return
    const target = docSlug
      ? docsArticlePath(docSlug, q)
      : docsIndexPath(q)
    navigate(target, { replace: true })
  }, [docSlug, navigate, params, pathname])
}

export function DocsIndexPage() {
  const { t, lang } = useApp()
  useLangFromDocsPath()
  useRedirectLegacyLangQuery()

  return (
    <div className="docs-layout">
      <aside className="docs-nav">
        <DocsNav />
      </aside>
      <article className="docs-article">
        <h1>{t.navDocs}</h1>
        <p className="muted">{t.docsIndexLead}</p>

        <h2 className="docs-group-title">{t.docsGroupQuickStart}</h2>
        <ul className="docs-index-list">
          {SITE_DOC_ENTRIES.map((d) => (
            <li key={d.slug}>
              <Link to={docsArticlePath(d.slug, lang)}>{docTitle(d, lang)}</Link>
            </li>
          ))}
        </ul>

        <h2 className="docs-group-title">{t.docsGroupReference}</h2>
        <p className="muted">
          Source:{' '}
          <a href={DOCS_META.githubTreeUrl} target="_blank" rel="noreferrer">
            {DOCS_META.repo}
          </a>{' '}
          — not rewritten here.
        </p>
        <ul className="docs-index-list">
          {SYNCED_DOC_ENTRIES.map((d) => (
            <li key={d.slug}>
              <Link to={docsArticlePath(d.slug, lang)}>{docTitle(d, lang)}</Link>
            </li>
          ))}
        </ul>
        <p className="docs-footnote">{t.docsFootnote(DOCS_META.sha)}</p>
      </article>
    </div>
  )
}

export function DocsArticlePage() {
  const docSlug = useDocSlugFromRoute()
  const { t, lang, setLang } = useApp()
  const navigate = useNavigate()
  const entry = docSlug ? getDoc(docSlug) : undefined
  const [html, setHtml] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)

  useLangFromDocsPath()
  useRedirectLegacyLangQuery()

  useEffect(() => {
    if (!entry) return
    let cancelled = false
    setErr(null)
    void renderMarkdown(docMarkdown(entry, lang))
      .then((h) => {
        if (!cancelled) setHtml(h)
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [entry, lang])

  function onDocClick(e: MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) return
    if (href.startsWith('#')) return
    if (href.startsWith('/')) {
      e.preventDefault()
      try {
        const url = new URL(href, window.location.origin)
        const pathLang = langFromDocsPathname(url.pathname)
        if (pathLang) setLang(pathLang)
        const qLang = parseLangParam(url.searchParams.get('lang'))
        if (qLang) {
          const articleSlug = docsSlugFromPathname(url.pathname)
          navigate(
            articleSlug
              ? docsArticlePath(articleSlug, qLang)
              : docsIndexPath(qLang),
            { replace: true },
          )
          return
        }
        navigate(`${url.pathname}${url.search}${url.hash}`)
      } catch {
        navigate(href)
      }
    }
  }

  if (!docSlug || !entry) return <Navigate to={docsIndexPath(lang)} replace />

  const githubHref = entry.site
    ? undefined
    : `https://github.com/${DOCS_META.repo}/blob/${DOCS_META.sha}/docs/${docSlug}${lang === 'zh' ? '.zh-CN' : ''}.md`

  return (
    <div className="docs-layout">
      <aside className="docs-nav">
        <DocsNav active={docSlug} />
      </aside>
      <article className="docs-article">
        {err && <p className="banner error">{err}</p>}
        <div
          className="md-body"
          onClick={onDocClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <p className="docs-footnote">
          {entry.site ? t.docsSiteFootnote : t.docsFootnote(DOCS_META.sha)}
          {githubHref ? (
            <>
              {' '}
              ·{' '}
              <a href={githubHref} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </>
          ) : null}
        </p>
      </article>
    </div>
  )
}

function DocsNav({ active }: { active?: string }) {
  const { t, lang } = useApp()
  return (
    <nav aria-label="Docs">
      <Link
        to={docsIndexPath(lang)}
        className={!active ? 'active' : undefined}
      >
        Index
      </Link>
      <p className="docs-nav-label">{t.docsGroupQuickStart}</p>
      {SITE_DOC_ENTRIES.map((d) => (
        <Link
          key={d.slug}
          to={docsArticlePath(d.slug, lang)}
          className={active === d.slug ? 'active' : undefined}
        >
          {docTitle(d, lang)}
        </Link>
      ))}
      <p className="docs-nav-label">{t.docsGroupReference}</p>
      {SYNCED_DOC_ENTRIES.map((d) => (
        <Link
          key={d.slug}
          to={docsArticlePath(d.slug, lang)}
          className={active === d.slug ? 'active' : undefined}
        >
          {docTitle(d, lang)}
        </Link>
      ))}
    </nav>
  )
}
