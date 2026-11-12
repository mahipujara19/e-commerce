import { defineConfig } from 'vitest/config'

// Unit tests (frontend/src/**/*.test.js) and API integration tests (backend/tests/*.test.js, against an
// in-memory MongoDB).
export default defineConfig({
  // Tests use the built-in default store rules, never the values in your local .env.
  envDir: './backend/tests',
  test: {
    include: ['frontend/src/**/*.test.js', 'backend/tests/**/*.test.js'],
    environment: 'node',
    // The API tests share one in-memory database, so files run one after another.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
})
