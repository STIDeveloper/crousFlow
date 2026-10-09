import { runAll } from '../src/server/chaos/runner'

async function main() {
  console.log('Démarrage de la suite Chaos...')
  const { results, summary } = await runAll()

  console.log(
    '┌──────┬────────────────────────────────────────┬─────────────────────┬─────────────────────┬─────────┐',
  )
  console.log(
    '│ ID   │ Cas                                    │ Attendu             │ Réel                │ Verdict │',
  )
  console.log(
    '├──────┼────────────────────────────────────────┼─────────────────────┼─────────────────────┼─────────┤',
  )

  for (const r of results) {
    const id = r.caseId.padEnd(4)
    const desc = (cases.find((x) => x.id === r.caseId)?.description || '')
      .padEnd(38)
      .substring(0, 38)
    const expected = r.expected.padEnd(19).substring(0, 19)
    const actual = r.actual.padEnd(19).substring(0, 19)
    const verdict = r.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'

    console.log(`│ ${id} │ ${desc} │ ${expected} │ ${actual} │    ${verdict}    │`)
  }
  console.log(
    '└──────┴────────────────────────────────────────┴─────────────────────┴─────────────────────┴─────────┘',
  )

  console.log(
    `\nRésumé : ${summary.passed}/${summary.total} cas passés en ${summary.totalDurationMs} ms.`,
  )

  if (summary.passed < summary.total) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

// Minimal import to get descriptions
import { cases } from '../src/server/chaos/cases'

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
