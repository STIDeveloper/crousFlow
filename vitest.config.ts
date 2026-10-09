import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    exclude: ['node_modules', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/server/**'],
      exclude: ['src/server/chaos/**'],
    },
  },
})
