import type { Lang } from '../i18n'

/** English stays at `/docs…`; Chinese lives under `/zh/docs…`. */
export function docsIndexPath(lang: Lang): string {
  return lang === 'zh' ? '/zh/docs' : '/docs'
}

export function docsArticlePath(slug: string, lang: Lang): string {
  return lang === 'zh' ? `/zh/docs/${slug}` : `/docs/${slug}`
}

/** Lang implied by a docs pathname, or null if not a docs URL. */
export function langFromDocsPathname(pathname: string): Lang | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/zh/docs' || path.startsWith('/zh/docs/')) return 'zh'
  if (path === '/docs' || path.startsWith('/docs/')) return 'en'
  return null
}

/** Article slug from `/docs/:slug` or `/zh/docs/:slug`. */
export function docsSlugFromPathname(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  const m = /^\/(?:zh\/)?docs\/([^/]+)$/.exec(path)
  return m?.[1] ?? null
}

/** Swap EN ↔ ZH docs path; non-docs paths unchanged. */
export function docsPathForLang(pathname: string, lang: Lang): string {
  const slug = docsSlugFromPathname(pathname)
  if (slug) return docsArticlePath(slug, lang)
  if (langFromDocsPathname(pathname)) return docsIndexPath(lang)
  return pathname
}
