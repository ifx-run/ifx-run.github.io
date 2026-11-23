import seoConfig from '../../seo.config.json' with { type: 'json' }
import { DOC_ENTRIES } from './docs/catalog'

export type SeoMeta = {
  title: string
  description: string
  /** Absolute canonical URL */
  canonical: string
  /** When true, ask indexers not to list this URL */
  noindex?: boolean
  ogType?: 'website' | 'article'
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

export function resolveSeoMeta(pathname: string): SeoMeta {
  const path = pathname.replace(/\/+$/, '') || '/'

  if (path === '/') {
    return {
      title: seoConfig.pages.home.title,
      description: seoConfig.pages.home.description,
      canonical: abs('/'),
      ogType: 'website',
    }
  }

  if (path === '/explorer') {
    return {
      title: seoConfig.pages.explorer.title,
      description: seoConfig.pages.explorer.description,
      canonical: abs('/explorer'),
      ogType: 'website',
    }
  }

  // /explorer/:ingress — useful tool URLs, not index targets
  if (path.startsWith('/explorer/')) {
    return {
      title: seoConfig.pages.explorer.title,
      description: seoConfig.pages.explorer.description,
      canonical: abs('/explorer'),
      noindex: true,
      ogType: 'website',
    }
  }

  if (path === '/docs') {
    return {
      title: seoConfig.pages.docs.title,
      description: seoConfig.pages.docs.description,
      canonical: abs('/docs'),
      ogType: 'website',
    }
  }

  const docMatch = /^\/docs\/([^/]+)$/.exec(path)
  if (docMatch) {
    const slug = docMatch[1]
    const entry = DOC_ENTRIES.find((d) => d.slug === slug)
    const titles =
      (seoConfig.docTitles as Record<string, { en: string; zh: string }>)[
        slug
      ] ?? null
    const label = entry?.titleEn ?? titles?.en ?? slug
    const description = entry
      ? `Ifx docs: ${entry.titleEn}. On-chain Solana orchestration — design and implementation notes.`
      : seoConfig.pages.docs.description
    return {
      title: `${label} — Ifx Docs`,
      description,
      canonical: abs(`/docs/${slug}`),
      ogType: 'article',
    }
  }

  return {
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    canonical: abs(path),
    ogType: 'website',
  }
}
