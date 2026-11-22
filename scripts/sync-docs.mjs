#!/usr/bin/env node
/**
 * Sync allowlisted docs from ifx-run/ifx at the pinned tag/SHA.
 * Source of truth stays in the main repo — this site only renders a snapshot.
 *
 * Allowlist entries are either:
 * - `README.md` (repo root) → written as `readme.md`
 * - `foo.md` → `docs/foo.md` in the source repo
 *
 * Strategy: shallow sparse git clone (more reliable than raw.githubusercontent.com),
 * with HTTP fetch as fallback.
 */
import { mkdir, readFile, writeFile, rm, cp } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdtemp, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pinPath = join(root, 'docs-pin.json')
const outDir = join(root, 'content', 'docs')
const metaPath = join(root, 'content', 'docs-meta.json')

const pin = JSON.parse(await readFile(pinPath, 'utf8'))
const ref = process.env.IFX_DOCS_REF || pin.ref
const allowlist = pin.allowlist

if (!ref || !Array.isArray(allowlist) || allowlist.length === 0) {
  console.error('docs-pin.json must set ref and allowlist')
  process.exit(1)
}

/** Map allowlist entry → path inside the ifx repo. */
function sourcePath(entry) {
  if (/^readme\.md$/i.test(entry)) return 'README.md'
  if (entry.includes('/')) return entry
  return `docs/${entry}`
}

/** Flatten into content/docs; normalize README casing for the site slug. */
function destFileName(entry) {
  const base = basename(entry)
  if (/^readme\.md$/i.test(base)) return 'readme.md'
  return base
}

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

const resolvedSha = await resolveSha(pin.repo, ref)
console.log(`syncing docs from ${pin.repo}@${resolvedSha} (${allowlist.length} files)`)

let fetched
try {
  fetched = await syncViaGit(pin.repo, resolvedSha, allowlist, outDir)
} catch (e) {
  console.warn(`git sync failed (${e instanceof Error ? e.message : e}); falling back to HTTP`)
  fetched = await syncViaHttp(pin.repo, resolvedSha, allowlist, outDir)
}

const meta = {
  repo: pin.repo,
  ref,
  sha: resolvedSha,
  syncedAt: new Date().toISOString(),
  files: fetched,
  githubTreeUrl: `https://github.com/${pin.repo}/tree/${resolvedSha}/docs`,
}
await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8')
console.log(`wrote ${metaPath}`)

async function syncViaGit(repo, sha, files, dest) {
  const tmp = await mkdtemp(join(tmpdir(), 'ifx-docs-'))
  try {
    await run('git', [
      'clone',
      '--depth',
      '1',
      '--filter=blob:none',
      '--sparse',
      `https://github.com/${repo}.git`,
      tmp,
    ])
    // Cone mode only accepts directories; root README is fetched over HTTP below.
    await run('git', ['-C', tmp, 'sparse-checkout', 'set', 'docs'])
    // Fetch exact SHA if not on default tip
    await run('git', ['-C', tmp, 'fetch', '--depth', '1', 'origin', sha]).catch(
      () => {},
    )
    await run('git', ['-C', tmp, 'checkout', sha])
    const copied = []
    for (const name of files) {
      const repoPath = sourcePath(name)
      const outName = destFileName(name)
      if (repoPath.startsWith('docs/')) {
        const src = join(tmp, repoPath)
        await access(src)
        await cp(src, join(dest, outName))
      } else {
        const url = `https://raw.githubusercontent.com/${repo}/${sha}/${repoPath}`
        const text = await fetchTextWithRetry(url, repoPath)
        await writeFile(join(dest, outName), text, 'utf8')
      }
      copied.push(outName)
      console.log(`  + ${outName} ← ${repoPath}`)
    }
    return copied
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

async function syncViaHttp(repo, sha, files, dest) {
  const copied = []
  for (const name of files) {
    const repoPath = sourcePath(name)
    const url = `https://raw.githubusercontent.com/${repo}/${sha}/${repoPath}`
    const text = await fetchTextWithRetry(url, repoPath)
    const outName = destFileName(name)
    await writeFile(join(dest, outName), text, 'utf8')
    copied.push(outName)
    console.log(`  + ${outName} ← ${repoPath}`)
  }
  return copied
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    child.stderr.on('data', (d) => {
      err += d
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} → ${code}: ${err.trim()}`))
    })
  })
}

async function fetchTextWithRetry(url, label, attempts = 4) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      lastErr = e
      const wait = 500 * 2 ** i
      console.warn(`  retry ${label} (${i + 1}/${attempts}) after ${wait}ms`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error(`failed ${label}: ${lastErr}`)
}

async function resolveSha(repo, ref) {
  if (/^[0-9a-f]{40}$/i.test(ref)) return ref.toLowerCase()
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ifx-run-docs-sync',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  const res = await fetch(
    `https://api.github.com/repos/${repo}/commits/${encodeURIComponent(ref)}`,
    { headers },
  )
  if (!res.ok) {
    throw new Error(`resolve ref ${ref}: HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.sha
}
