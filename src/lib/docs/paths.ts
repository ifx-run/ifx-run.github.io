import type { Lang } from '../i18n'

/** English stays at `/docs…`; Chinese lives under `/zh/docs…`. */
export function docsIndexPath(lang: Lang): string {
  return lang === 'zh' ? '/zh/docs' : '/docs'
}

/** Slug may be nested, e.g. `quick-start/two-hop-swap`. */
export function docsArticlePath(slug: string, lang: Lang): string {
  const path = slug
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')
  return lang === 'zh' ? `/zh/docs/${path}` : `/docs/${path}`
}

/** Lang implied by a docs pathname, or null if not a docs URL. */
export function langFromDocsPathname(pathname: string): Lang | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/zh/docs' || path.startsWith('/zh/docs/')) return 'zh'
  if (path === '/docs' || path.startsWith('/docs/')) return 'en'
  return null
}

/** Article slug from `/docs/…` or `/zh/docs/…` (may include `/`). */
export function docsSlugFromPathname(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  const m = /^\/(?:zh\/)?docs\/(.+)$/.exec(path)
  if (!m?.[1]) return null
  try {
    return m[1]
      .split('/')
      .map((p) => decodeURIComponent(p))
      .join('/')
  } catch {
    return m[1]
  }
}

/** Swap EN ↔ ZH docs path; non-docs paths unchanged. */
export function docsPathForLang(pathname: string, lang: Lang): string {
  const slug = docsSlugFromPathname(pathname)
  if (slug) return docsArticlePath(slug, lang)
  if (langFromDocsPathname(pathname)) return docsIndexPath(lang)
  return pathname
}
