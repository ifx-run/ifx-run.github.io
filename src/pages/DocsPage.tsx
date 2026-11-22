import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  DOC_ENTRIES,
  DOCS_META,
  docMarkdown,
  docTitle,
  getDoc,
} from '../lib/docs/catalog'
import { renderMarkdown } from '../lib/docs/render'

export function DocsIndexPage() {
  const { t, lang } = useApp()
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
              <Link to={`/docs/${d.slug}`}>{docTitle(d, lang)}</Link>
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
  const { t, lang } = useApp()
  const entry = slug ? getDoc(slug) : undefined
  const [html, setHtml] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)

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
      <Link to="/docs" className={!active ? 'active' : undefined}>
        Index
      </Link>
      {DOC_ENTRIES.map((d) => (
        <Link
          key={d.slug}
          to={`/docs/${d.slug}`}
          className={active === d.slug ? 'active' : undefined}
        >
          {docTitle(d, lang)}
        </Link>
      ))}
    </nav>
  )
}
