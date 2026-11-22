import { useEffect, useState, type MouseEvent } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  DOC_ENTRIES,
  DOCS_META,
  docMarkdown,
  docTitle,
  getDoc,
} from '../lib/docs/catalog'
import { renderMarkdown } from '../lib/docs/render'
import type { Lang } from '../lib/i18n'

function parseLangParam(raw: string | null): Lang | null {
  if (raw === 'zh' || raw === 'en') return raw
  return null
}

export function DocsIndexPage() {
  const { t, lang, setLang } = useApp()
  const [params] = useSearchParams()

  useEffect(() => {
    const fromUrl = parseLangParam(params.get('lang'))
    if (fromUrl && fromUrl !== lang) setLang(fromUrl)
  }, [params, lang, setLang])

  return (
    <div className="docs-layout">
      <aside className="docs-nav">
        <DocsNav />
      </aside>
      <article className="docs-article">
        <h1>{t.navDocs}</h1>
        <p className="muted">
          Source:{' '}
          <a href={DOCS_META.githubTreeUrl} target="_blank" rel="noreferrer">
            {DOCS_META.repo}
          </a>{' '}
          — not rewritten here.
        </p>
        <ul className="docs-index-list">
          {DOC_ENTRIES.map((d) => (
            <li key={d.slug}>
              <Link to={`/docs/${d.slug}?lang=${lang}`}>{docTitle(d, lang)}</Link>
            </li>
          ))}
        </ul>
        <p className="docs-footnote">{t.docsFootnote(DOCS_META.sha)}</p>
      </article>
    </div>
  )
}

export function DocsArticlePage() {
  const { slug } = useParams()
  const { t, lang, setLang } = useApp()
  const [params, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const entry = slug ? getDoc(slug) : undefined
  const [html, setHtml] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)

  // In-doc English|中文 links navigate to ?lang=… — pull into site language
  useEffect(() => {
    const fromUrl = parseLangParam(params.get('lang'))
    if (fromUrl && fromUrl !== lang) setLang(fromUrl)
  }, [params, lang, setLang])

  // Keep ?lang= in the URL so top-right toggle and shareable links stay aligned
  useEffect(() => {
    if (params.get('lang') === lang) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('lang', lang)
        return next
      },
      { replace: true },
    )
  }, [lang, params, setSearchParams])

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
    // In-app docs / explorer links — SPA navigate (keeps ?lang= working)
    if (href.startsWith('/')) {
      e.preventDefault()
      navigate(href)
    }
  }

  if (!slug || !entry) return <Navigate to="/docs" replace />

  return (
    <div className="docs-layout">
      <aside className="docs-nav">
        <DocsNav active={slug} />
      </aside>
      <article className="docs-article">
        {err && <p className="banner error">{err}</p>}
        <div
          className="md-body"
          onClick={onDocClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <p className="docs-footnote">
          {t.docsFootnote(DOCS_META.sha)} ·{' '}
          <a
            href={`https://github.com/${DOCS_META.repo}/blob/${DOCS_META.sha}/docs/${slug}${lang === 'zh' ? '.zh-CN' : ''}.md`}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </p>
      </article>
    </div>
  )
}

function DocsNav({ active }: { active?: string }) {
  const { lang } = useApp()
  return (
    <nav aria-label="Docs">
      <Link to={`/docs?lang=${lang}`} className={!active ? 'active' : undefined}>
        Index
      </Link>
      {DOC_ENTRIES.map((d) => (
        <Link
          key={d.slug}
          to={`/docs/${d.slug}?lang=${lang}`}
          className={active === d.slug ? 'active' : undefined}
        >
          {docTitle(d, lang)}
        </Link>
      ))}
    </nav>
  )
}
