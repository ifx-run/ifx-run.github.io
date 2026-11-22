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
 * Rewrite relative markdown links:
 * - `./foo.md` / `foo.md` / `foo.zh-CN.md` → `/docs/foo` when allowlisted
 * - otherwise → GitHub blob URL
 * - keep http(s) and hash-only links
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

      const [pathPart, hash = ''] = trimmed.split('#')
      const file = pathPart.replace(/^\.\//, '').replace(/^\//, '')
      if (!file.endsWith('.md')) {
        return `[${label}](${GITHUB_DOCS}${file}${hash ? `#${hash}` : ''})`
      }

      const base = file
        .replace(/\.zh-CN\.md$/i, '')
        .replace(/\.md$/i, '')
        .split('/')
        .pop()!

      if (SLUGS.has(base)) {
        return `[${label}](/docs/${base}${hash ? `#${hash}` : ''})`
      }
      return `[${label}](${GITHUB_DOCS}${file}${hash ? `#${hash}` : ''})`
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
