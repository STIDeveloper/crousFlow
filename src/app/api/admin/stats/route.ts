import { NextResponse } from 'next/server'
import { requireSessionUser, requireRole } from '@/server/auth/session'
import db from '@/server/db'
export async function GET() {
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 1. Total repas servis (CONSUMED) sur 30 jours
    const consumedCount = await db.reservation.count({
      where: {
        status: 'CONSUMED',
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    // 2. Taux de no-show
    const noShowCount = await db.reservation.count({
      where: {
        status: 'NO_SHOW',
        createdAt: { gte: thirtyDaysAgo },
      },
    })
    const totalCount = await db.reservation.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    })
    const noShowRate = totalCount > 0 ? (noShowCount / totalCount) * 100 : 0

    // 3. Minutes de file économisées : 3 min par réservation globale
    const minutesSaved = totalCount * 3

    // 4. Gaspillage évité estimé (simulé ici à 12% des réservations pour l'exercice)
    const gaspillageEvite = Math.floor(consumedCount * 0.12)

    // Data for charts: reservations per day (last 14 days)
    const chartData = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStart = new Date(d.setUTCHours(0, 0, 0, 0))
      const dayEnd = new Date(d.setUTCHours(23, 59, 59, 999))

      const count = await db.reservation.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
      })
      chartData.push({
        date: d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
        reservations: count,
      })
    }

    return NextResponse.json({
      consumedCount,
      minutesSaved,
      gaspillageEvite,
      noShowRate,
      chartData,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
