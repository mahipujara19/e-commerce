import { fileURLToPath } from 'node:url'

// Tailwind looks for its config in the working directory, which is the repo root when run through npm scripts.
export default {
  plugins: {
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) },
    autoprefixer: {},
  },
}
