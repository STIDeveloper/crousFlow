import { NextRequest, NextResponse } from 'next/server'
import { requireSessionUser, requireRole } from '@/server/auth/session'
import { runAll, runCase } from '@/server/chaos/runner'
import { chaosRunSchema } from '@/lib/schemas/chaos'

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])

    const body = await req.json().catch(() => ({}))
    const parsed = chaosRunSchema.safeParse(body)

    if (parsed.success && parsed.data.caseId) {
      const res = await runCase(parsed.data.caseId)
      if (!res) return NextResponse.json({ error: 'Case introuvable' }, { status: 404 })
      return NextResponse.json({
        results: [res],
        summary: {
          passed: res.passed ? 1 : 0,
          failed: res.passed ? 0 : 1,
          total: 1,
          totalDurationMs: res.durationMs,
        },
      })
    }

    const result = await runAll()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
