import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { predictDemand } from '../../src/server/ia/forecast'
import { evaluateForecast } from '../../src/server/ia/evaluate'
import {
  clearExplanationCache,
  explainForecast,
  explainForecastWithSource,
} from '../../src/server/ia/explain'
import { explainForecasts } from '../../src/server/ia/batch'
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
      clearExplanationCache()
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

    it('indique la source : gemini si le modèle répond, local sinon', async () => {
      vi.mocked(generateObject).mockResolvedValueOnce({
        object: {
          alert: false,
          level: 'info',
          explanation: 'Demande stable, conforme à la moyenne historique.',
          suggestedAction: 'Lancer la production prévue.',
        },
      } as never)
      expect((await explainForecastWithSource(baseInput)).source).toBe('gemini')

      vi.mocked(generateObject).mockRejectedValueOnce(new Error('Timeout'))
      const other = { ...baseInput, actualReservations: 79 }
      expect((await explainForecastWithSource(other)).source).toBe('local')
    })

    it('explainForecasts : ajoute une explication à chaque prévision, en parallèle', async () => {
      vi.mocked(generateObject).mockRejectedValue(new Error('réseau coupé'))
      const date = new Date('2026-10-12T00:00:00.000Z')

      const result = await explainForecasts(date, [
        {
          mealId: 'inconnu-1',
          mealName: 'Curry',
          predicted: 40,
          lower: 34,
          upper: 46,
          method: 'STAT',
        },
        {
          mealId: 'inconnu-2',
          mealName: 'Poisson',
          predicted: 0,
          lower: 0,
          upper: 0,
          method: 'FALLBACK',
        },
      ])

      expect(result).toHaveLength(2)
      expect(generateObject).toHaveBeenCalledTimes(1) // le plat sans demande n'appelle pas Gemini
      for (const forecast of result) {
        expect(forecast.source).toBe('local')
        expect(forecast.suggestedAction.length).toBeGreaterThanOrEqual(10)
        expect(['info', 'warn', 'danger']).toContain(forecast.level)
      }
      expect(result[0].mealName).toBe('Curry')
    })

    it("n'appelle pas Gemini pour un plat sans aucune demande", async () => {
      const result = await explainForecastWithSource({
        ...baseInput,
        predictedCount: 0,
        actualReservations: 0,
        historicalAverage: 0,
      })

      expect(generateObject).not.toHaveBeenCalled()
      expect(result.source).toBe('local')
      expect(result.explanation).toContain('Aucune demande')
      expect(result.suggestedAction).not.toContain('0 portions')
    })

    it('met en cache la réponse Gemini pour des chiffres identiques', async () => {
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          alert: false,
          level: 'info',
          explanation: 'Demande stable, conforme à la moyenne historique.',
          suggestedAction: 'Lancer la production prévue.',
        },
      } as never)

      await explainForecastWithSource(baseInput)
      const second = await explainForecastWithSource(baseInput)
      await explainForecastWithSource({ ...baseInput, actualReservations: 81 })

      expect(second.source).toBe('gemini')
      expect(generateObject).toHaveBeenCalledTimes(2)
    })

    it('repli : accorde le pluriel de « réservation »', async () => {
      vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '')
      const one = await explainForecast({ ...baseInput, actualReservations: 1 })
      expect(one.explanation).toContain('1 réservation ')
      expect(one.explanation).not.toContain('1 réservations')
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
