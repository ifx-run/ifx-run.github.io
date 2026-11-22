import meta from '../../../content/docs-meta.json' with { type: 'json' }
import type { Lang } from '../i18n'

export type DocEntry = {
  slug: string
  titleEn: string
  titleZh: string
  en: string
  zh: string
}

export const DOCS_META = meta as {
  repo: string
  ref: string
  sha: string
  syncedAt: string
  files: string[]
  githubTreeUrl: string
}

const rawModules = import.meta.glob('../../../content/docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const TITLE_OVERRIDES: Record<string, { en: string; zh: string }> = {
  readme: { en: 'README', zh: 'README' },
  design: { en: 'Design', zh: '设计' },
  glossary: { en: 'Glossary', zh: '术语表' },
  implementation: { en: 'Implementation', zh: '实现' },
  'frame-authority': { en: 'Frame authority', zh: 'Frame 权限' },
  bundles: { en: 'Bundles', zh: 'Bundles' },
  'structured-cpi-patches': {
    en: 'Structured CPI patches',
    zh: '结构化 CPI patch',
  },
  'raw-cpi-patches': { en: 'Raw CPI patches', zh: 'Raw CPI patch' },
  errors: { en: 'Errors', zh: '错误码' },
  debugging: { en: 'Debugging', zh: '调试' },
  'typed-let-bindings': { en: 'Typed let bindings', zh: 'Typed let 绑定' },
}

function fileName(path: string): string {
  return path.split('/').pop() ?? path
}

function slugFromFile(name: string): string | null {
  if (name.endsWith('.zh-CN.md')) return name.replace(/\.zh-CN\.md$/i, '')
  if (name.endsWith('.md')) return name.replace(/\.md$/i, '')
  return null
}

function buildEntries(): DocEntry[] {
  const bySlug = new Map<string, { en?: string; zh?: string }>()
  for (const [path, text] of Object.entries(rawModules)) {
    const name = fileName(path)
    const slug = slugFromFile(name)
    if (!slug) continue
    const slot = bySlug.get(slug) ?? {}
    if (name.endsWith('.zh-CN.md')) slot.zh = text
    else slot.en = text
    bySlug.set(slug, slot)
  }

  const order = DOCS_META.files
    .filter((f) => f.endsWith('.md') && !f.includes('.zh-CN.'))
    .map((f) => f.replace(/\.md$/i, ''))

  const slugs = order.length
    ? order.filter((s) => bySlug.has(s))
    : [...bySlug.keys()].sort()

  return slugs.map((slug) => {
    const pair = bySlug.get(slug)!
    const titles = TITLE_OVERRIDES[slug] ?? {
      en: slug,
      zh: slug,
    }
    return {
      slug,
      titleEn: titles.en,
      titleZh: titles.zh,
      en: pair.en ?? pair.zh ?? '',
      zh: pair.zh ?? pair.en ?? '',
    }
  })
}

export const DOC_ENTRIES: DocEntry[] = buildEntries()

export function getDoc(slug: string): DocEntry | undefined {
  return DOC_ENTRIES.find((d) => d.slug === slug)
}

export function docMarkdown(entry: DocEntry, lang: Lang): string {
  return lang === 'zh' ? entry.zh : entry.en
}

export function docTitle(entry: DocEntry, lang: Lang): string {
  return lang === 'zh' ? entry.titleZh : entry.titleEn
}
