import db from '../db'

// 12 semaines d'historique
export async function getHistory(mealId: string, targetDate: Date, weeks = 12) {
  const pastDates = []
  for (let i = 1; i <= weeks; i++) {
    const d = new Date(targetDate)
    d.setUTCDate(d.getUTCDate() - i * 7)
    pastDates.push(d)
  }

  // on récupère les slots de ces jours-là et le nombre de réservations confirmées pour ce meal
  const history = []
  for (const date of pastDates) {
    const slots = await db.slot.findMany({ where: { date } })
    const slotIds = slots.map((s) => s.id)

    if (slotIds.length > 0) {
      const count = await db.reservation.count({
        where: {
          menuItemId: { startsWith: `menu-${date.toISOString().split('T')[0]}-${mealId}` }, // Approximation
          slotId: { in: slotIds },
          status: 'CONFIRMED',
        },
      })
      history.push(count)
    } else {
      history.push(0)
    }
  }
  return history
}

export function baseline(history: number[]): number {
  if (history.length === 0) return 0

  // Poids décroissants (récent = max poids)
  let sum = 0
  let weightSum = 0

  for (let i = 0; i < history.length; i++) {
    const weight = history.length - i
    sum += history[i] * weight
    weightSum += weight
  }

  return weightSum > 0 ? sum / weightSum : 0
}

export function adjustWithLiveReservations(
  base: number,
  liveCount: number,
  targetDate: Date,
): number {
  const diffDays = (targetDate.getTime() - Date.now()) / (1000 * 3600 * 24)
  if (diffDays >= 0 && diffDays <= 7) {
    return base * 0.6 + liveCount * 0.4
  }
  return base
}

export async function predictDemand(mealId: string, targetDate: Date) {
  try {
    const history = await getHistory(mealId, targetDate, 12)
    // Historique insuffisant (< 3 semaines avec données non-nulles)
    const validHistory = history.filter((h) => h > 0)

    if (validHistory.length < 3) {
      const naive =
        validHistory.length > 0 ? validHistory.reduce((a, b) => a + b, 0) / validHistory.length : 0
      return {
        predictedCount: Math.round(naive),
        lower: Math.round(naive * 0.85),
        upper: Math.round(naive * 1.15),
        method: 'FALLBACK',
      }
    }

    const base = baseline(history)

    // Réservations actuelles
    const liveReservations = await db.reservation.count({
      where: {
        menuItem: { mealId, date: targetDate },
        status: 'CONFIRMED',
      },
    })

    const adjusted = adjustWithLiveReservations(base, liveReservations, targetDate)
    const predictedCount = Math.round(adjusted)

    return {
      predictedCount,
      lower: Math.round(predictedCount * 0.85),
      upper: Math.round(predictedCount * 1.15),
      method: 'STAT',
    }
  } catch {
    return {
      predictedCount: 0,
      lower: 0,
      upper: 0,
      method: 'FALLBACK',
    }
  }
}
