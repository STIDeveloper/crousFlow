import db from '../db'
import { baseline, getHistory, naiveBaseline } from './forecast'

export { naiveBaseline } from './forecast'

export function meanAbsoluteError(predictions: number[], actuals: number[]): number {
  const count = Math.min(predictions.length, actuals.length)
  if (count === 0) return 0
  let sum = 0
  for (let index = 0; index < count; index += 1)
    sum += Math.abs(predictions[index] - actuals[index])
  return sum / count
}

export function meanAbsolutePercentageError(predictions: number[], actuals: number[]): number {
  const count = Math.min(predictions.length, actuals.length)
  if (count === 0) return 0
  let sum = 0
  let nonZeroActuals = 0
  for (let index = 0; index < count; index += 1) {
    if (actuals[index] > 0) {
      sum += Math.abs(predictions[index] - actuals[index]) / actuals[index]
      nonZeroActuals += 1
    }
  }
  return nonZeroActuals === 0 ? 0 : (sum / nonZeroActuals) * 100
}

export async function evaluateForecast(mealId: string, weeksBack = 4) {
  const modelPredictions: number[] = []
  const naivePredictions: number[] = []
  const actuals: number[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  for (let offset = 1; offset <= weeksBack; offset += 1) {
    const targetDate = new Date(today)
    targetDate.setUTCDate(today.getUTCDate() - offset * 7)
    const actual = await db.reservation.count({
      where: {
        menuItem: { mealId, date: targetDate },
        status: { in: ['CONFIRMED', 'CONSUMED'] },
      },
    })
    const history = await getHistory(mealId, targetDate, 12)
    if (actual === 0 || history.every((count) => count === 0)) continue

    actuals.push(actual)
    modelPredictions.push(Math.max(0, Math.round(baseline(history))))
    naivePredictions.push(naiveBaseline(history))
  }

  const modelMAE = meanAbsoluteError(modelPredictions, actuals)
  const naiveMAE = meanAbsoluteError(naivePredictions, actuals)
  const modelMAPE = meanAbsolutePercentageError(modelPredictions, actuals)
  const naiveMAPE = meanAbsolutePercentageError(naivePredictions, actuals)
  const improvement = naiveMAE === 0 ? 0 : ((naiveMAE - modelMAE) / naiveMAE) * 100

  return { modelMAE, naiveMAE, modelMAPE, naiveMAPE, improvement, sampleSize: actuals.length }
}
