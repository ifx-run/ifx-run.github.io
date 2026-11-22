import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Custom domain ifx.run → base must be `/`
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
