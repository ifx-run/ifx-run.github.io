#!/usr/bin/env node
/**
 * Notify IndexNow-compatible engines (Bing, Yandex, …) about ifx.run URLs.
 * Requires the key file to be live at https://ifx.run/<key>.txt
 *
 * Usage: node scripts/submit-indexnow.mjs
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://ifx.run'
const key = (await readFile(join(root, 'indexnow.key'), 'utf8')).trim()
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
  console.error('invalid indexnow.key')
  process.exit(1)
}

const seo = JSON.parse(await readFile(join(root, 'seo.config.json'), 'utf8'))
const docsMeta = JSON.parse(
  await readFile(join(root, 'content', 'docs-meta.json'), 'utf8'),
)
const slugs = (docsMeta.files ?? [])
  .filter((f) => f.endsWith('.md') && !f.includes('.zh-CN.'))
  .map((f) => f.replace(/\.md$/i, ''))

const urlList = [
  `${ORIGIN}/`,
  `${ORIGIN}/explorer`,
  `${ORIGIN}/docs`,
  `${ORIGIN}/zh/docs`,
  `${ORIGIN}/llms.txt`,
  `${ORIGIN}/sitemap.xml`,
  ...slugs.flatMap((slug) => [
    `${ORIGIN}/docs/${slug}`,
    `${ORIGIN}/zh/docs/${slug}`,
  ]),
]

const keyLocation = `${ORIGIN}/${key}.txt`
const body = {
  host: 'ifx.run',
  key,
  keyLocation,
  urlList,
}

console.log(`IndexNow: ${urlList.length} URLs, keyLocation=${keyLocation}`)

// Confirm key is publicly readable before submitting.
const keyRes = await fetch(keyLocation)
if (!keyRes.ok) {
  console.error(
    `key file not live yet (${keyRes.status}). Deploy Pages first, then re-run.`,
  )
  process.exit(1)
}
const keyBody = (await keyRes.text()).trim()
if (keyBody !== key) {
  console.error('key file content mismatch')
  process.exit(1)
}

const endpoints = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
]

for (const endpoint of endpoints) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    })
    const text = await res.text().catch(() => '')
    console.log(
      `${endpoint} → ${res.status}${text ? ` ${text.slice(0, 120)}` : ''}`,
    )
  } catch (e) {
    console.warn(
      `${endpoint} failed: ${e instanceof Error ? e.message : e}`,
    )
  }
}

// Bing still accepts an explicit sitemap ping.
try {
  const sitemap = `${ORIGIN}/sitemap.xml`
  const ping = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`
  const res = await fetch(ping)
  console.log(`Bing sitemap ping → ${res.status}`)
} catch (e) {
  console.warn(`Bing sitemap ping failed: ${e instanceof Error ? e.message : e}`)
}

console.log('Done. Google: submit sitemap in Search Console (manual once).')
void seo
