import fs from 'fs'
import { execSync } from 'child_process'
import path from 'path'

function run(cmd: string) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit' })
}

function main() {
  const dbPath = path.resolve(process.cwd(), 'prisma/dev.db')
  if (fs.existsSync(dbPath)) {
    console.log('Suppression de prisma/dev.db...')
    fs.unlinkSync(dbPath)
  }

  run('pnpm prisma migrate deploy')
  run('pnpm prisma db seed')
  console.log('Démo prête. Lance : pnpm dev')
}

main()
