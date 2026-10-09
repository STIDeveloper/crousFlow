import { NextResponse } from 'next/server'
import { requireSessionUser, requireRole } from '@/server/auth/session'
import db from '@/server/db'

export async function GET() {
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])

    const runs = await db.chaosRun.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(runs)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
