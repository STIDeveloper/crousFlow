import { describe, it, expect, vi } from 'vitest'
import { predictDemand } from '../../src/server/ia/forecast'
import { evaluateForecast } from '../../src/server/ia/evaluate'
import { explainForecast } from '../../src/server/ia/explain'
import { generateObject } from 'ai'

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}))

describe('IA Services', () => {
  it('predictDemand : retourne un résultat dans les bornes ±15%', async () => {
    const mealId = 'm1' // Dummy meal
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    const result = await predictDemand(mealId, date)

    expect(result).toHaveProperty('predictedCount')
    expect(result).toHaveProperty('lower')
    expect(result).toHaveProperty('upper')
    expect(result).toHaveProperty('method')

    // Bounds check
    expect(result.lower).toBe(Math.round(result.predictedCount * 0.85))
    expect(result.upper).toBe(Math.round(result.predictedCount * 1.15))
    // If not enough data, it will be FALLBACK, otherwise STAT. Either is fine.
    expect(['STAT', 'FALLBACK']).toContain(result.method)
  })

  it('evaluateForecast : retourne les métriques MAE et improvement', async () => {
    const mealId = 'm1'
    const result = await evaluateForecast(mealId, 2)

    expect(result).toHaveProperty('modelMAE')
    expect(result).toHaveProperty('naiveMAE')
    expect(result).toHaveProperty('improvement')
  })

  it('explainForecast : fallback si Gemini rejette (ex: timeout)', async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('Timeout'))

    const result = await explainForecast({
      date: new Date(),
      mealName: 'Poulet Rôti',
      predictedCount: 100,
      actualReservations: 80,
      historicalAverage: 90,
    })

    expect(result.alert).toBe(false)
    expect(result.level).toBe('info')
    expect(result.explanation).toContain('Prévision de secours')
  })

  it('explainForecast : fallback si sortie invalide (ZodError)', async () => {
    // GenerateObject throws on invalid schema matching
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('ZodError: invalid'))

    const result = await explainForecast({
      date: new Date(),
      mealName: 'Poulet Rôti',
      predictedCount: 100,
      actualReservations: 80,
      historicalAverage: 90,
    })

    expect(result.alert).toBe(false)
    expect(result.level).toBe('info')
    expect(result.explanation).toContain('Prévision de secours')
  })
})
