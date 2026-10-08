import { getHistory } from './forecast'
import db from '../db'

export function meanAbsoluteError(predictions: number[], actuals: number[]): number {
  if (predictions.length === 0 || actuals.length === 0) return 0
  let sum = 0
  for (let i = 0; i < predictions.length; i++) {
    sum += Math.abs(predictions[i] - actuals[i])
  }
  return sum / predictions.length
}

export function meanAbsolutePercentageError(predictions: number[], actuals: number[]): number {
  if (predictions.length === 0 || actuals.length === 0) return 0
  let sum = 0
  let validCount = 0
  for (let i = 0; i < predictions.length; i++) {
    if (actuals[i] > 0) {
      sum += Math.abs(predictions[i] - actuals[i]) / actuals[i]
      validCount++
    }
  }
  return validCount > 0 ? (sum / validCount) * 100 : 0
}

export function naiveBaseline(history: number[]): number {
  return history.length > 0 ? history[0] : 0 // The most recent one (last week)
}

export async function evaluateForecast(mealId: string, weeksBack = 4) {
  const modelPredictions: number[] = []
  const naivePredictions: number[] = []
  const actuals: number[] = []

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  for (let i = 1; i <= weeksBack; i++) {
    const targetDate = new Date(today)
    targetDate.setUTCDate(today.getUTCDate() - i * 7)

    // Get actual
    const count = await db.reservation.count({
      where: {
        menuItem: { mealId, date: targetDate },
        status: { in: ['CONFIRMED', 'CONSUMED'] },
      },
    })

    if (count > 0) {
      actuals.push(count)

      const history = await getHistory(mealId, targetDate, 12)

      // Simulate predictDemand logic at that point in time
      const base = naiveBaseline(history)
      naivePredictions.push(base)

      // Model prediction (without live adjustments for simplicity in eval)
      let sum = 0
      let weightSum = 0
      for (let j = 0; j < history.length; j++) {
        const weight = history.length - j
        sum += history[j] * weight
        weightSum += weight
      }
      modelPredictions.push(weightSum > 0 ? Math.round(sum / weightSum) : 0)
    }
  }

  const modelMAE = meanAbsoluteError(modelPredictions, actuals)
  const naiveMAE = meanAbsoluteError(naivePredictions, actuals)
  const improvement = naiveMAE > 0 ? ((naiveMAE - modelMAE) / naiveMAE) * 100 : 0

  return { modelMAE, naiveMAE, improvement }
}
