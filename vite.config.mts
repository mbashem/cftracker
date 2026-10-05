import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Reuse jsdom within each worker; every file still gets a fresh VM/window.
    pool: 'vmThreads',
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/data/saved_api/**'],
      reporter: ['text-summary', 'json-summary', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage/frontend',
      thresholds: {
        lines: 95,
        'src/util/**': { lines: 100, statements: 100, functions: 100, branches: 100 },
      },
    },
  },
})
