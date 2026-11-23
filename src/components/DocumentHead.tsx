import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { resolveSeoMeta, SEO } from '../lib/seo'

function upsertMeta(
  attr: 'name' | 'property',
  key: string,
  content: string,
) {
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(
    `link[rel="${rel}"]`,
  ) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Keeps document title / description / OG tags in sync with the route.
 * Does not change layout or navigation — head-only side effects.
 */
export function DocumentHead() {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = resolveSeoMeta(pathname)
    document.title = meta.title

    upsertMeta('name', 'description', meta.description)
    upsertMeta('name', 'robots', meta.noindex ? 'noindex,follow' : 'index,follow')

    upsertLink('canonical', meta.canonical)

    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:url', meta.canonical)
    upsertMeta('property', 'og:type', meta.ogType ?? 'website')
    upsertMeta('property', 'og:site_name', SEO.siteName)
    upsertMeta('property', 'og:image', SEO.ogImageUrl)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', meta.title)
    upsertMeta('name', 'twitter:description', meta.description)
    upsertMeta('name', 'twitter:image', SEO.ogImageUrl)
  }, [pathname])

  return null
}
