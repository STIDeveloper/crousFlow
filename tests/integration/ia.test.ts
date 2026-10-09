import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { predictDemand } from '../../src/server/ia/forecast'
import { evaluateForecast } from '../../src/server/ia/evaluate'
import { explainForecast } from '../../src/server/ia/explain'
import { generateObject } from 'ai'
import { explanationSchema } from '../../src/lib/schemas/ia'

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

  describe('explainForecast', () => {
    const baseInput = {
      date: new Date('2026-10-12'),
      mealName: 'Poulet Rôti',
      predictedCount: 100,
      actualReservations: 80,
      historicalAverage: 90,
    }

    beforeEach(() => {
      vi.mocked(generateObject).mockReset()
      vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('renvoie la réponse Gemini quand elle est valide', async () => {
      const geminiAnswer = {
        alert: false,
        level: 'info' as const,
        explanation: 'La demande suit la moyenne historique, 80 % déjà réservés.',
        suggestedAction: 'Lancer la production prévue de 100 portions.',
      }
      vi.mocked(generateObject).mockResolvedValueOnce({ object: geminiAnswer } as never)

      const result = await explainForecast(baseInput)

      expect(generateObject).toHaveBeenCalledTimes(1)
      expect(result).toEqual(geminiAnswer)
    })

    it('repli calculé si Gemini rejette (ex: timeout)', async () => {
      vi.mocked(generateObject).mockRejectedValueOnce(new Error('Timeout'))

      const result = await explainForecast(baseInput)

      expect(generateObject).toHaveBeenCalledTimes(1)
      expect(result.explanation).toContain('Prévision de secours')
      expect(result.explanation).toContain('80')
      expect(result.level).toBe('info')
      expect(result.alert).toBe(false)
    })

    it('repli calculé si sortie invalide (ZodError)', async () => {
      vi.mocked(generateObject).mockRejectedValueOnce(new Error('ZodError: invalid'))

      const result = await explainForecast(baseInput)

      expect(result.explanation).toContain('Prévision de secours')
    })

    it("n'appelle pas Gemini sans clé et explique quand même", async () => {
      vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')

      const result = await explainForecast(baseInput)

      expect(generateObject).not.toHaveBeenCalled()
      expect(result.explanation).toContain('Prévision de secours')
      expect(result.suggestedAction.length).toBeGreaterThanOrEqual(10)
    })

    it('repli : alerte danger si les réservations dépassent la prévision', async () => {
      vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')

      const result = await explainForecast({ ...baseInput, actualReservations: 130 })

      expect(result.alert).toBe(true)
      expect(result.level).toBe('danger')
      expect(result.suggestedAction).toContain('30')
    })

    it('repli : vigilance si la prévision dépasse nettement la moyenne historique', async () => {
      vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')

      const result = await explainForecast({
        ...baseInput,
        predictedCount: 150,
        actualReservations: 40,
      })

      expect(result.alert).toBe(true)
      expect(result.level).toBe('warn')
    })

    it('repli : respecte toujours le schéma Zod, même avec des chiffres absurdes', async () => {
      vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')

      for (const input of [
        { ...baseInput, predictedCount: 0, actualReservations: 0, historicalAverage: 0 },
        { ...baseInput, predictedCount: 0, actualReservations: 12 },
        { ...baseInput, predictedCount: 1e9, actualReservations: 1e9 + 1, historicalAverage: 1 },
        { ...baseInput, predictedCount: Number.NaN, actualReservations: -5, historicalAverage: -1 },
        { ...baseInput, mealName: 'x'.repeat(5000) },
      ]) {
        const result = await explainForecast(input)
        expect(explanationSchema.safeParse(result).success).toBe(true)
      }
    })
  })
})
