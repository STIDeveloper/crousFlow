const { existsSync, readFileSync, readdirSync, unlinkSync } = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const Database = require('better-sqlite3')

const root = process.cwd()
const prismaDirectory = path.resolve(root, 'prisma')
const configuredPath = process.env.CROUSFLOW_DEMO_DATABASE_PATH
const databasePath = path.resolve(root, configuredPath ?? path.join('prisma', 'demo.db'))
const forbiddenPaths = new Set([
  path.resolve(root, 'prisma', 'dev.db'),
  path.resolve(root, 'prisma', 'test.db'),
  path.resolve(root, 'prisma', 'e2e.db'),
])

if (!databasePath.startsWith(`${prismaDirectory}${path.sep}`) || forbiddenPaths.has(databasePath)) {
  throw new Error('La base de démo doit être un fichier dédié dans prisma/ (dev.db est interdit)')
}

function recreateDatabase() {
  if (existsSync(databasePath)) unlinkSync(databasePath)

  const database = new Database(databasePath)
  database.pragma('foreign_keys = ON')
  try {
    const migrationsPath = path.join(prismaDirectory, 'migrations')
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
    throw new Error(`Le seed de démonstration a échoué (${result.status ?? 'signal'})`)
  }
}

recreateDatabase()
seedDatabase()

console.log(`Démo prête dans ${databasePath}`)
if (process.platform === 'win32') {
  console.log(
    `Pour la lancer dans PowerShell : $env:CROUSFLOW_DATABASE_PATH='${databasePath}'; pnpm dev`,
  )
} else {
  console.log(`Pour la lancer : CROUSFLOW_DATABASE_PATH='${databasePath}' pnpm dev`)
}
