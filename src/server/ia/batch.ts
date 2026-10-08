import db from '../db'
import { predictDemand } from './forecast'
import crypto from 'crypto'
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

    // Check if a forecast already exists to simulate Upsert if @@unique is not present
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
          id: crypto.randomUUID(),
          date,
          mealId: meal.id,
          predictedCount: demand.predictedCount,
          lower: demand.lower,
          upper: demand.upper,
          method: demand.method as ForecastMethod,
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
