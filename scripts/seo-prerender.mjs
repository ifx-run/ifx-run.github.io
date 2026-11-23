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

async function readDocMarkdown(slug) {
  try {
    return await readFile(join(docsDir, `${slug}.md`), 'utf8')
  } catch {
    try {
      return await readFile(join(docsDir, `${slug}.zh-CN.md`), 'utf8')
    } catch {
      return ''
    }
  }
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
  },
]

for (const r of routes) {
  const html = patchHead(template, {
    title: r.title,
    description: r.description,
    canonical: `${ORIGIN}${r.path === '/' ? '/' : r.path}`,
    ogType: r.ogType,
  })
  const file = await writeRoute(r.dir, html)
  console.log('seo:', file.replace(root + '/', ''))
}

for (const slug of slugs) {
  const titles = seo.docTitles?.[slug] ?? { en: slug }
  const title = `${titles.en} — Ifx Docs`
  const description = `Ifx docs: ${titles.en}. On-chain Solana orchestration — design and implementation notes.`
  const canonical = `${ORIGIN}/docs/${slug}`
  const md = await readDocMarkdown(slug)
  const bodyHtml = md ? await renderMarkdown(md) : ''
  const noscript = bodyHtml
    ? `      <article class="docs-article">\n        <h1>${esc(titles.en)}</h1>\n        <div class="md-body">${bodyHtml}</div>\n      </article>`
    : ''

  let html = patchHead(template, {
    title,
    description,
    canonical,
    ogType: 'article',
  })
  html = injectNoscript(html, noscript)

  // TechArticle JSON-LD (text for AI/crawlers; does not affect the SPA UI)
  if (md) {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: titles.en,
      description,
      url: canonical,
      inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', name: 'Ifx', url: ORIGIN },
      author: { '@type': 'Organization', name: 'Ifx' },
    }
    html = html.replace(
      '</head>',
      `    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  </head>`,
    )
  }

  const file = await writeRoute(join('docs', slug), html)
  console.log('seo:', file.replace(root + '/', ''))
}

const today = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: `${ORIGIN}/`, priority: '1.0' },
  { loc: `${ORIGIN}/explorer`, priority: '0.9' },
  { loc: `${ORIGIN}/docs`, priority: '0.9' },
  ...slugs.map((slug) => ({
    loc: `${ORIGIN}/docs/${slug}`,
    priority: '0.8',
  })),
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
