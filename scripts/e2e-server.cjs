const { existsSync, readFileSync, readdirSync, unlinkSync } = require('node:fs')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const Database = require('better-sqlite3')

const root = process.cwd()
const databasePath = path.resolve(root, 'prisma', 'e2e.db')
const forbiddenPaths = new Set([
  path.resolve(root, 'prisma', 'dev.db'),
  path.resolve(root, 'prisma', 'test.db'),
])

if (forbiddenPaths.has(databasePath)) {
  throw new Error('La base Playwright ne peut pas être dev.db ou test.db')
}

function recreateDatabase() {
  if (existsSync(databasePath)) unlinkSync(databasePath)

  const database = new Database(databasePath)
  database.pragma('foreign_keys = ON')
  try {
    const migrationsPath = path.join(root, 'prisma', 'migrations')
    for (const directory of readdirSync(migrationsPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()) {
      database.exec(readFileSync(path.join(migrationsPath, directory, 'migration.sql'), 'utf8'))
    }
  } finally {
    database.close()
  }
}

function seedDatabase() {
  const tsxPath = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  const result = spawnSync(process.execPath, [tsxPath, 'prisma/seed.ts'], {
    cwd: root,
    env: {
      ...process.env,
      CROUSFLOW_DATABASE_PATH: databasePath,
      CROUSFLOW_DATABASE_URL: `file:${databasePath}`,
    },
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error(`Le seed Playwright a échoué (${result.status ?? 'signal'})`)
  }
}

recreateDatabase()
seedDatabase()

const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const server = spawn(process.execPath, [nextBin, 'start', '-p', '3100'], {
  cwd: root,
  env: {
    ...process.env,
    CROUSFLOW_DATABASE_PATH: databasePath,
    CROUSFLOW_DATABASE_URL: `file:${databasePath}`,
  },
  stdio: 'inherit',
})

let stopping = false
function stop(signal) {
  if (stopping) return
  stopping = true
  if (server.exitCode === null) server.kill(signal)
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))

server.on('exit', (code, signal) => {
  if (existsSync(databasePath)) unlinkSync(databasePath)
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
