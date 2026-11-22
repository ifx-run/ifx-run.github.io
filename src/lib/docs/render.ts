import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import { DOC_ENTRIES } from './catalog'

const GITHUB_DOCS =
  'https://github.com/ifx-run/ifx/blob/main/docs/'

const SLUGS = new Set(DOC_ENTRIES.map((d) => d.slug))

/**
 * GFM ends a table on a blank line. Upstream docs sometimes insert a blank
 * between rows (e.g. errors 6031/6032); stitch those back into one table.
 */
export function fixBrokenGfmTables(md: string): string {
  return md.replace(/(\|[^\n]*\|)\r?\n[ \t]*\r?\n+(?=\|)/g, '$1\n')
}

/**
 * Rewrite relative markdown links:
 * - `./foo.md` → `/docs/foo?lang=en`
 * - `./foo.zh-CN.md` → `/docs/foo?lang=zh`
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
        return `[${label}](${GITHUB_DOCS}${file}${hash ? `#${hash}` : ''})`
      }

      const isZh = /\.zh-CN\.md$/i.test(file)
      const base = file
        .replace(/\.zh-CN\.md$/i, '')
        .replace(/\.md$/i, '')
        .split('/')
        .pop()!

      if (SLUGS.has(base)) {
        const lang = isZh ? 'zh' : 'en'
        const q = `?lang=${lang}`
        return `[${label}](/docs/${base}${q}${hash ? `#${hash}` : ''})`
      }
      return `[${label}](${GITHUB_DOCS}${file}${hash ? `#${hash}` : ''})`
    },
  )
}

export async function renderMarkdown(md: string): Promise<string> {
  const rewritten = rewriteDocLinks(fixBrokenGfmTables(md))
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
