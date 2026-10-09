import db from '../db'
import { predictDemand } from './forecast'
import { ForecastMethod } from '@prisma/client'

export async function predictBatch(date: Date) {
  // Find all distinct meals for the date
  const menuItems = await db.menuItem.findMany({
    where: { date },
    include: { meal: true },
  })

  const meals = Array.from(new Map(menuItems.map((m) => [m.mealId, m.meal])).values())
  const results = []

  for (const meal of meals) {
    const demand = await predictDemand(meal.id, date)

    // Forecast has no composite unique key yet, so update the date/meal row explicitly.
    const existing = await db.forecast.findFirst({
      where: { date, mealId: meal.id },
    })

    if (existing) {
      await db.forecast.update({
        where: { id: existing.id },
        data: {
          predictedCount: demand.predictedCount,
          lower: demand.lower,
          upper: demand.upper,
          method: demand.method as ForecastMethod,
        },
      })
    } else {
      await db.forecast.create({
        data: {
          date,
          mealId: meal.id,
          predictedCount: demand.predictedCount,
          lower: demand.lower,
          upper: demand.upper,
          method: demand.method as ForecastMethod,
        },
      })
    }

    const existingBatch = await db.kitchenBatch.findFirst({
      where: { date, mealId: meal.id },
    })
    if (existingBatch) {
      await db.kitchenBatch.update({
        where: { id: existingBatch.id },
        data: { predictedCount: demand.predictedCount },
      })
    } else {
      await db.kitchenBatch.create({
        data: {
          date,
          mealId: meal.id,
          predictedCount: demand.predictedCount,
          preparedCount: 0,
          status: 'PLANNED',
        },
      })
    }

    results.push({
      mealId: meal.id,
      mealName: meal.name,
      predicted: demand.predictedCount,
      lower: demand.lower,
      upper: demand.upper,
      method: demand.method,
    })
  }

  return results
}
