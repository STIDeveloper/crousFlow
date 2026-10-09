import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
process.env.CROUSFLOW_DATABASE_PATH = path.resolve(rootDir, 'prisma/test.db')

export default defineConfig({
  test: {
    environment: 'jsdom',
    // The fork pool cannot start child processes in the Windows sandbox used by CI.
    // A single VM thread keeps tests deterministic while avoiding `spawn EPERM`.
    pool: 'vmThreads',
    maxWorkers: 1,
    // Les tests d'intégration touchent une vraie base SQLite : marge pour les machines lentes.
    testTimeout: 15_000,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
    exclude: ['node_modules', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/server/**'],
      exclude: ['src/server/chaos/**'],
    },
  },
})
