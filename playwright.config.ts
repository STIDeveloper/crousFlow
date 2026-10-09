import { defineConfig } from '@playwright/test'
import path from 'node:path'

process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve(process.cwd(), '.playwright-browsers')

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:3100',
  },
  webServer: {
    command: 'node scripts/e2e-server.cjs',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
  },
})
