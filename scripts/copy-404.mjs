#!/usr/bin/env node
/** SPA fallback for GitHub Pages: unknown paths serve index.html. */
import { copyFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
await copyFile(join(dist, 'index.html'), join(dist, '404.html'))
console.log('copied dist/index.html → dist/404.html')
