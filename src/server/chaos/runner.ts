import db from '@/server/db'
import { cases, ChaosCaseResult } from './cases'

export async function runCase(id: string): Promise<ChaosCaseResult | null> {
  const c = cases.find((x) => x.id === id)
  if (!c) return null
  return await c.run()
}

export async function runAll() {
  const results = []
  let passedCount = 0
  let totalDurationMs = 0

  for (const c of cases) {
    const res = await c.run()
    results.push({
      caseId: c.id,
      expected: c.expected,
      actual: res.actual,
      passed: res.passed,
      durationMs: res.durationMs,
    })
    if (res.passed) passedCount++
    totalDurationMs += res.durationMs

    // Log to DB
    try {
      await db.chaosRun.create({
        data: {
          caseId: c.id,
          expected: c.expected,
          actual: res.actual,
          passed: res.passed,
          durationMs: res.durationMs,
        },
      })
    } catch {
      // Ignore DB errors during chaos logging
    }
  }

  return {
    results,
    summary: {
      passed: passedCount,
      failed: cases.length - passedCount,
      total: cases.length,
      totalDurationMs,
    },
  }
}
