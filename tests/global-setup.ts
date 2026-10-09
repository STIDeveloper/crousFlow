import Database from 'better-sqlite3'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

export default function setup(): () => void {
  const databasePath = process.env.CROUSFLOW_DATABASE_PATH
  if (!databasePath) throw new Error('CROUSFLOW_DATABASE_PATH doit être défini pour les tests')

  const expectedPath = path.resolve(process.cwd(), 'prisma/test.db')
  if (path.resolve(databasePath) !== expectedPath) {
    throw new Error('La base de test doit rester limitée à prisma/test.db')
  }
  if (existsSync(databasePath)) rmSync(databasePath)

  const database = new Database(databasePath)
  const migrationsPath = path.resolve(process.cwd(), 'prisma/migrations')
  for (const directory of readdirSync(migrationsPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    database.exec(readFileSync(path.join(migrationsPath, directory, 'migration.sql'), 'utf8'))
  }
  database.close()

  return () => {
    if (!existsSync(databasePath)) return

    try {
      rmSync(databasePath, { maxRetries: 3, retryDelay: 100 })
    } catch (error) {
      // better-sqlite3 can keep the file locked until Vitest releases its
      // module graph on Windows. The next setup removes the dedicated test
      // database before opening it again; never turn a successful test run
      // into a failure during this best-effort cleanup.
      if (
        process.platform === 'win32' &&
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'EPERM' || error.code === 'EBUSY')
      ) {
        console.warn(`Nettoyage différé de ${databasePath} : le fichier est encore utilisé.`)
        return
      }
      throw error
    }
  }
}
