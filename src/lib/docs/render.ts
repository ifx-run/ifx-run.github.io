import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import { DOC_ENTRIES } from './catalog'

const GITHUB_BLOB = 'https://github.com/ifx-run/ifx/blob/main/'
const GITHUB_DOCS = `${GITHUB_BLOB}docs/`

const SLUGS = new Set(DOC_ENTRIES.map((d) => d.slug))

/**
 * Rewrite relative markdown links:
 * - `./foo.md` / `docs/foo.md` → `/docs/foo`
 * - `./foo.zh-CN.md` → `/zh/docs/foo`
 * - `README.md` / `README.zh-CN.md` → `/docs/readme` / `/zh/docs/readme`
 * - otherwise → GitHub blob URL
 */
export function rewriteDocLinks(md: string): string {
  return md.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (full, label: string, href: string) => {
      const trimmed = href.trim()
      if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('mailto:')
      ) {
        return full
      }

      const hashIdx = trimmed.indexOf('#')
      const pathPart = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed
      const hash = hashIdx >= 0 ? trimmed.slice(hashIdx + 1) : ''
      const file = pathPart.replace(/^\.\//, '').replace(/^\//, '')
      if (!file.endsWith('.md')) {
        const blob = file.startsWith('docs/')
          ? `${GITHUB_BLOB}${file}`
          : `${GITHUB_DOCS}${file}`
        return `[${label}](${blob}${hash ? `#${hash}` : ''})`
      }

      const isZh = /\.zh-CN\.md$/i.test(file)
      let base = file
        .replace(/\.zh-CN\.md$/i, '')
        .replace(/\.md$/i, '')
        .split('/')
        .pop()!
      if (/^readme$/i.test(base)) base = 'readme'
      // Site guides: quick-start.two-hop-swap.md → slug quick-start/two-hop-swap
      const nested = base.includes('.') ? base.replace(/\./g, '/') : base
      const slug = SLUGS.has(base)
        ? base
        : SLUGS.has(nested)
          ? nested
          : null

      if (slug) {
        const path = isZh ? `/zh/docs/${slug}` : `/docs/${slug}`
        return `[${label}](${path}${hash ? `#${hash}` : ''})`
      }
      const blob = file.startsWith('docs/')
        ? `${GITHUB_BLOB}${file}`
        : /^readme\.md$/i.test(file)
          ? `${GITHUB_BLOB}README.md`
          : `${GITHUB_DOCS}${file}`
      return `[${label}](${blob}${hash ? `#${hash}` : ''})`
    },
  )
}

export async function renderMarkdown(md: string): Promise<string> {
  const rewritten = rewriteDocLinks(md)
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(rewritten)
  return String(file)
}
