import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// .env and .env.local live at the repo root and are shared with the backend; only VITE_* values reach the browser.
const envDir = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig(({ mode }) => {
  const { PORT } = loadEnv(mode, envDir, '')

  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    envDir,
    plugins: [react()],
    server: {
      // Same-origin in development: the refresh and CSRF cookies are first-party and need no CORS.
      proxy: {
        '/api': `http://localhost:${PORT || 5000}`,
      },
    },
  }
})
