import seoConfig from '../../seo.config.json' with { type: 'json' }
import { DOC_ENTRIES } from './docs/catalog'
import {
  docsArticlePath,
  docsIndexPath,
  docsSlugFromPathname,
  langFromDocsPathname,
} from './docs/paths'
import type { Lang } from './i18n'

export type SeoMeta = {
  title: string
  description: string
  /** Absolute canonical URL */
  canonical: string
  /** When true, ask indexers not to list this URL */
  noindex?: boolean
  ogType?: 'website' | 'article'
  /** BCP47 language for <html lang> */
  htmlLang?: string
  /** hreflang alternates (absolute URLs) */
  alternates?: { lang: string; href: string }[]
}

const ORIGIN = seoConfig.origin.replace(/\/$/, '')

export const SEO = {
  origin: ORIGIN,
  siteName: seoConfig.siteName,
  defaultTitle: seoConfig.defaultTitle,
  defaultDescription: seoConfig.defaultDescription,
  ogImageUrl: `${ORIGIN}${seoConfig.ogImagePath}`,
} as const

function abs(path: string): string {
  if (path.startsWith('http')) return path
  return `${ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

function docsAlternates(slug: string | null): SeoMeta['alternates'] {
  if (slug) {
    return [
      { lang: 'en', href: abs(docsArticlePath(slug, 'en')) },
      { lang: 'zh-CN', href: abs(docsArticlePath(slug, 'zh')) },
      { lang: 'x-default', href: abs(docsArticlePath(slug, 'en')) },
    ]
  }
  return [
    { lang: 'en', href: abs(docsIndexPath('en')) },
    { lang: 'zh-CN', href: abs(docsIndexPath('zh')) },
    { lang: 'x-default', href: abs(docsIndexPath('en')) },
  ]
}

function docLabel(slug: string, lang: Lang): string {
  const entry = DOC_ENTRIES.find((d) => d.slug === slug)
  const titles =
    (seoConfig.docTitles as Record<string, { en: string; zh: string }>)[
      slug
    ] ?? null
  if (lang === 'zh') return entry?.titleZh ?? titles?.zh ?? slug
  return entry?.titleEn ?? titles?.en ?? slug
}

export function resolveSeoMeta(pathname: string): SeoMeta {
  const path = pathname.replace(/\/+$/, '') || '/'

  if (path === '/') {
    return {
      title: seoConfig.pages.home.title,
      description: seoConfig.pages.home.description,
      canonical: abs('/'),
      ogType: 'website',
      htmlLang: 'en',
    }
  }

  if (path === '/explorer') {
    return {
      title: seoConfig.pages.explorer.title,
      description: seoConfig.pages.explorer.description,
      canonical: abs('/explorer'),
      ogType: 'website',
      htmlLang: 'en',
    }
  }

  if (path.startsWith('/explorer/')) {
    return {
      title: seoConfig.pages.explorer.title,
      description: seoConfig.pages.explorer.description,
      canonical: abs('/explorer'),
      noindex: true,
      ogType: 'website',
      htmlLang: 'en',
    }
  }

  const docsLang = langFromDocsPathname(path)
  if (docsLang) {
    const slug = docsSlugFromPathname(path)
    const htmlLang = docsLang === 'zh' ? 'zh-CN' : 'en'

    if (!slug) {
      const title =
        docsLang === 'zh'
          ? '文档 — Ifx 设计与实现'
          : seoConfig.pages.docs.title
      const description =
        docsLang === 'zh'
          ? 'Ifx 设计、术语表、Frame 权限、CPI patch、typed let 与调试说明。'
          : seoConfig.pages.docs.description
      return {
        title,
        description,
        canonical: abs(docsIndexPath(docsLang)),
        ogType: 'website',
        htmlLang,
        alternates: docsAlternates(null),
      }
    }

    const label = docLabel(slug, docsLang)
    const title =
      docsLang === 'zh' ? `${label} — Ifx 文档` : `${label} — Ifx Docs`
    const description =
      docsLang === 'zh'
        ? `Ifx 文档：${label}。Solana 链上编排的设计与实现说明。`
        : `Ifx docs: ${docLabel(slug, 'en')}. On-chain Solana orchestration — design and implementation notes.`
    return {
      title,
      description,
      canonical: abs(docsArticlePath(slug, docsLang)),
      ogType: 'article',
      htmlLang,
      alternates: docsAlternates(slug),
    }
  }

  return {
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    canonical: abs(path),
    ogType: 'website',
    htmlLang: 'en',
  }
}
