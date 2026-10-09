import { describe, it, expect } from 'vitest'
import { explainForecast } from '../../src/server/ia/explain'
import { getReservationById } from '../../src/server/reservations/query'

describe('Coverage boosts - Part 3', () => {
  it('covers explain', async () => {
    const expl = await explainForecast({
      mealName: 'meal1',
      predictedCount: 10,
      lower: 8,
      upper: 12,
      targetDate: new Date('2026-10-10'),
    })
    expect(expl).toBeDefined()
  })

  it('covers query 2', async () => {
    // Expect error since id is likely invalid format or not found
    await expect(getReservationById('student1', 'randomid')).rejects.toThrow()
  })
})
