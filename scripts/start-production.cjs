// Démarrage hébergé (Render, Koyeb…) : recrée une base de démo propre puis lance `next start`.
// Le disque des offres gratuites est éphémère : la base repart du seed à chaque démarrage.
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')

const root = process.cwd()
const databasePath = path.resolve(root, 'prisma', 'demo.db')
const env = {
  ...process.env,
  CROUSFLOW_DEMO_DATABASE_PATH: databasePath,
  CROUSFLOW_DATABASE_PATH: databasePath,
  CROUSFLOW_DATABASE_URL: `file:${databasePath}`,
}

for (const name of ['SESSION_SECRET', 'QR_SECRET']) {
  if ((process.env[name] ?? '').length < 32) {
    console.error(`${name} doit contenir au moins 32 caractères`)
    process.exit(1)
  }
}

const reset = spawnSync(process.execPath, [path.join(root, 'scripts', 'demo-reset.cjs')], {
  cwd: root,
  env,
  stdio: 'inherit',
})
if (reset.status !== 0) process.exit(reset.status ?? 1)

const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const port = process.env.PORT ?? '3000'
const server = spawn(process.execPath, [nextBin, 'start', '-p', port, '-H', '0.0.0.0'], {
  cwd: root,
  env,
  stdio: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal))
}
server.on('exit', (code) => process.exit(code ?? 0))
