import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Asset/router base:
 * - Project Pages (default today): https://ifx-run.github.io/ifx-run/ → `/ifx-run/`
 * - Custom domain ifx.run (after DNS + Pages custom domain): set VITE_BASE=/ and rebuild
 */
const base = process.env.VITE_BASE || '/ifx-run/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})

