import { NextRequest, NextResponse } from 'next/server'
import { requireSessionUser, requireRole } from '@/server/auth/session'
import db from '@/server/db'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['reservations', 'stats']),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    const parsed = schema.safeParse({ type })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    let csvContent = ''

    if (parsed.data.type === 'reservations') {
      const recent = await db.reservation.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { slot: true, menuItem: { include: { meal: true } } },
      })

      csvContent = 'ID,Date,Plat,Statut\n'
      recent.forEach((r) => {
        csvContent += `${r.id},${r.createdAt.toISOString()},"${r.menuItem?.meal?.name || ''}",${r.status}\n`
      })
    } else {
      csvContent = 'Metric,Value\n'
      const total = await db.reservation.count()
      const consumed = await db.reservation.count({ where: { status: 'CONSUMED' } })
      csvContent += `Total Reservations,${total}\n`
      csvContent += `Consumed,${consumed}\n`
      csvContent += `No Shows,${total - consumed}\n`
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="export_${parsed.data.type}.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
