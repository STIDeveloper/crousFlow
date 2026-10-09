import db from '../db'

export type DemandPrediction = {
  predictedCount: number
  lower: number
  upper: number
  method: 'STAT' | 'FALLBACK'
}

function atUtcMidnight(value: Date): Date {
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

// The most recent week is first so weighted and naive forecasts use the same ordering.
export async function getHistory(mealId: string, targetDate: Date, weeks = 12): Promise<number[]> {
  const dates = Array.from({ length: weeks }, (_, index) => {
    const date = atUtcMidnight(targetDate)
    date.setUTCDate(date.getUTCDate() - (index + 1) * 7)
    return date
  })

  return Promise.all(
    dates.map((date) =>
      db.reservation.count({
        where: {
          menuItem: { mealId, date },
          status: { in: ['CONFIRMED', 'CONSUMED'] },
        },
      }),
    ),
  )
}

export function baseline(history: number[]): number {
  if (history.length === 0) return 0
  let sum = 0
  let weightSum = 0
  for (let index = 0; index < history.length; index += 1) {
    const weight = history.length - index
    sum += history[index] * weight
    weightSum += weight
  }
  return weightSum === 0 ? 0 : sum / weightSum
}

export function naiveBaseline(history: number[]): number {
  return history.find((count) => count > 0) ?? 0
}

export function adjustWithLiveReservations(
  base: number,
  liveCount: number,
  targetDate: Date,
  now = new Date(),
): number {
  const diffDays = (atUtcMidnight(targetDate).getTime() - atUtcMidnight(now).getTime()) / 86_400_000
  return diffDays >= 0 && diffDays <= 7 ? base * 0.6 + liveCount * 0.4 : base
}

export function predictionFromHistory(
  history: number[],
  liveCount: number,
  targetDate: Date,
  now = new Date(),
): DemandPrediction {
  const nonZeroHistory = history.filter((count) => count > 0)
  const rawPrediction =
    nonZeroHistory.length < 3
      ? nonZeroHistory.length === 0
        ? 0
        : nonZeroHistory.reduce((sum, count) => sum + count, 0) / nonZeroHistory.length
      : baseline(history)
  const predictedCount = Math.max(
    0,
    Math.round(adjustWithLiveReservations(rawPrediction, liveCount, targetDate, now)),
  )

  return {
    predictedCount,
    lower: Math.round(predictedCount * 0.85),
    upper: Math.round(predictedCount * 1.15),
    method: nonZeroHistory.length < 3 ? 'FALLBACK' : 'STAT',
  }
}

export async function predictDemand(mealId: string, targetDate: Date): Promise<DemandPrediction> {
  try {
    const normalizedDate = atUtcMidnight(targetDate)
    const [history, liveCount] = await Promise.all([
      getHistory(mealId, normalizedDate, 12),
      db.reservation.count({
        where: {
          menuItem: { mealId, date: normalizedDate },
          status: 'CONFIRMED',
        },
      }),
    ])
    return predictionFromHistory(history, liveCount, normalizedDate)
  } catch {
    return { predictedCount: 0, lower: 0, upper: 0, method: 'FALLBACK' }
  }
}
