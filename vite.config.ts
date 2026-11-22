import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Org Pages (ifx-run.github.io) + custom domain ifx.run → base `/`
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
