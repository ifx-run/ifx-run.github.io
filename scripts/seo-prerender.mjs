#!/usr/bin/env node
/**
 * Post-build SEO helpers (no UX change for JS users):
 * - sitemap.xml
 * - Per-route HTML shells with correct <head> meta
 * - Docs bodies in <noscript> so crawlers/AI see content without running the SPA
 */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const docsDir = join(root, 'content', 'docs')

const seo = JSON.parse(await readFile(join(root, 'seo.config.json'), 'utf8'))
const docsMeta = JSON.parse(
  await readFile(join(root, 'content', 'docs-meta.json'), 'utf8'),
)

const ORIGIN = String(seo.origin).replace(/\/$/, '')

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function patchHead(html, { title, description, canonical, noindex, ogType }) {
  let out = html
  out = out.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${esc(title)}</title>`,
  )
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${esc(description)}" />`,
  )
  if (/<meta\s+name="robots"/i.test(out)) {
    out = out.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow'}" />`,
    )
  } else {
    out = out.replace(
      '</title>',
      `</title>\n    <meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow'}" />`,
    )
  }
  if (/<link\s+rel="canonical"/i.test(out)) {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${esc(canonical)}" />`,
    )
  } else {
    out = out.replace(
      '</title>',
      `</title>\n    <link rel="canonical" href="${esc(canonical)}" />`,
    )
  }

  const og = {
    'og:title': title,
    'og:description': description,
    'og:url': canonical,
    'og:type': ogType ?? 'website',
    'og:image': `${ORIGIN}${seo.ogImagePath}`,
  }
  for (const [prop, val] of Object.entries(og)) {
    const re = new RegExp(
      `<meta\\s+property="${prop}"\\s+content="[^"]*"\\s*/?>`,
      'i',
    )
    if (re.test(out)) {
      out = out.replace(
        re,
        `<meta property="${prop}" content="${esc(val)}" />`,
      )
    } else {
      out = out.replace(
        '</head>',
        `    <meta property="${prop}" content="${esc(val)}" />\n  </head>`,
      )
    }
  }

  const tw = {
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': `${ORIGIN}${seo.ogImagePath}`,
  }
  for (const [name, val] of Object.entries(tw)) {
    const re = new RegExp(
      `<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`,
      'i',
    )
    if (re.test(out)) {
      out = out.replace(re, `<meta name="${name}" content="${esc(val)}" />`)
    }
  }

  return out
}

function injectNoscript(html, inner) {
  if (!inner?.trim()) return html
  const block = `\n    <noscript>\n${inner}\n    </noscript>\n`
  if (html.includes('</body>')) {
    return html.replace('</body>', `${block}  </body>`)
  }
  return html + block
}

async function renderMarkdown(md) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(md)
  return String(file)
}

async function listDocSlugs() {
  const fromMeta = (docsMeta.files ?? [])
    .filter((f) => f.endsWith('.md') && !f.includes('.zh-CN.'))
    .map((f) => f.replace(/\.md$/i, ''))
  if (fromMeta.length) return fromMeta
  const names = await readdir(docsDir)
  return names
    .filter((n) => n.endsWith('.md') && !n.includes('.zh-CN.'))
    .map((n) => n.replace(/\.md$/i, ''))
    .sort()
}

async function readDocMarkdown(slug, lang = 'en') {
  const primary =
    lang === 'zh' ? `${slug}.zh-CN.md` : `${slug}.md`
  const fallback =
    lang === 'zh' ? `${slug}.md` : `${slug}.zh-CN.md`
  try {
    return await readFile(join(docsDir, primary), 'utf8')
  } catch {
    try {
      return await readFile(join(docsDir, fallback), 'utf8')
    } catch {
      return ''
    }
  }
}

function hreflangLinks(slug) {
  if (slug) {
    return [
      `<link rel="alternate" hreflang="en" href="${ORIGIN}/docs/${slug}" />`,
      `<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/zh/docs/${slug}" />`,
      `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/docs/${slug}" />`,
    ].join('\n    ')
  }
  return [
    `<link rel="alternate" hreflang="en" href="${ORIGIN}/docs" />`,
    `<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/zh/docs" />`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/docs" />`,
  ].join('\n    ')
}

function injectHreflang(html, slug) {
  const block = hreflangLinks(slug)
  if (html.includes('hreflang="x-default"')) return html
  return html.replace('</head>', `    ${block}\n  </head>`)
}

async function writeRoute(relDir, html) {
  const dir = relDir === '.' ? dist : join(dist, relDir)
  await mkdir(dir, { recursive: true })
  const file = join(dir, 'index.html')
  await writeFile(file, html, 'utf8')
  return file
}

const template = await readFile(join(dist, 'index.html'), 'utf8')
const slugs = await listDocSlugs()

const routes = [
  {
    dir: '.',
    path: '/',
    title: seo.pages.home.title,
    description: seo.pages.home.description,
    ogType: 'website',
  },
  {
    dir: 'explorer',
    path: '/explorer',
    title: seo.pages.explorer.title,
    description: seo.pages.explorer.description,
    ogType: 'website',
  },
  {
    dir: 'docs',
    path: '/docs',
    title: seo.pages.docs.title,
    description: seo.pages.docs.description,
    ogType: 'website',
    docsIndex: true,
  },
  {
    dir: join('zh', 'docs'),
    path: '/zh/docs',
    title: '文档 — Ifx 设计与实现',
    description:
      'Ifx 设计、术语表、Frame 权限、CPI patch、typed let 与调试说明。',
    ogType: 'website',
    docsIndex: true,
    htmlLang: 'zh-CN',
  },
]

for (const r of routes) {
  let html = patchHead(template, {
    title: r.title,
    description: r.description,
    canonical: `${ORIGIN}${r.path === '/' ? '/' : r.path}`,
    ogType: r.ogType,
  })
  if (r.htmlLang) {
    html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${r.htmlLang}"`)
  }
  if (r.docsIndex) html = injectHreflang(html, null)
  const file = await writeRoute(r.dir, html)
  console.log('seo:', file.replace(root + '/', ''))
}

async function writeDocPage(slug, lang) {
  const titles = seo.docTitles?.[slug] ?? { en: slug, zh: slug }
  const label = lang === 'zh' ? titles.zh ?? titles.en : titles.en
  const title =
    lang === 'zh' ? `${label} — Ifx 文档` : `${label} — Ifx Docs`
  const description =
    lang === 'zh'
      ? `Ifx 文档：${label}。Solana 链上编排的设计与实现说明。`
      : `Ifx docs: ${titles.en}. On-chain Solana orchestration — design and implementation notes.`
  const path = lang === 'zh' ? `/zh/docs/${slug}` : `/docs/${slug}`
  const canonical = `${ORIGIN}${path}`
  const md = await readDocMarkdown(slug, lang)
  const bodyHtml = md ? await renderMarkdown(md) : ''
  const noscript = bodyHtml
    ? `      <article class="docs-article">\n        <h1>${esc(label)}</h1>\n        <div class="md-body">${bodyHtml}</div>\n      </article>`
    : ''

  let html = patchHead(template, {
    title,
    description,
    canonical,
    ogType: 'article',
  })
  if (lang === 'zh') {
    html = html.replace(/<html\s+lang="[^"]*"/i, '<html lang="zh-CN"')
  }
  html = injectHreflang(html, slug)
  html = injectNoscript(html, noscript)

  if (md) {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: label,
      description,
      url: canonical,
      inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
      isPartOf: { '@type': 'WebSite', name: 'Ifx', url: ORIGIN },
      author: { '@type': 'Organization', name: 'Ifx' },
    }
    html = html.replace(
      '</head>',
      `    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  </head>`,
    )
  }

  const dir = lang === 'zh' ? join('zh', 'docs', slug) : join('docs', slug)
  const file = await writeRoute(dir, html)
  console.log('seo:', file.replace(root + '/', ''))
}

for (const slug of slugs) {
  await writeDocPage(slug, 'en')
  await writeDocPage(slug, 'zh')
}

const today = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: `${ORIGIN}/`, priority: '1.0' },
  { loc: `${ORIGIN}/explorer`, priority: '0.9' },
  { loc: `${ORIGIN}/docs`, priority: '0.9' },
  { loc: `${ORIGIN}/zh/docs`, priority: '0.9' },
  ...slugs.flatMap((slug) => [
    { loc: `${ORIGIN}/docs/${slug}`, priority: '0.8' },
    { loc: `${ORIGIN}/zh/docs/${slug}`, priority: '0.8' },
  ]),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8')
console.log('seo: dist/sitemap.xml')
