import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { explanationSchema, type Explanation } from '@/lib/schemas/ia'

// Surchargeable via GEMINI_MODEL sans toucher au code.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite'

export type ExplainInput = {
  date: Date
  mealName: string
  predictedCount: number
  actualReservations: number
  historicalAverage: number
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

// Repli déterministe : explique les chiffres sans LLM, toujours conforme au schéma.
export function buildFallbackExplanation(input: ExplainInput): Explanation {
  const predicted = safeCount(input.predictedCount)
  const reserved = safeCount(input.actualReservations)
  const average = safeCount(input.historicalAverage)
  const prefix = 'Prévision de secours'

  const reservations = `${reserved} réservation${reserved > 1 ? 's' : ''}`

  let result: Explanation
  if (predicted === 0 && reserved === 0 && average === 0) {
    result = {
      alert: false,
      level: 'info',
      explanation: `${prefix} : Aucune demande prévue ni réservée pour ce plat, et aucun historique.`,
      suggestedAction: 'Ne pas préparer ce plat pour ce service, sauf commande de dernière minute.',
    }
  } else if (reserved > predicted) {
    const missing = reserved - predicted
    result = {
      alert: true,
      level: 'danger',
      explanation: `${prefix} : ${reservations} confirmée${reserved > 1 ? 's' : ''} pour ${predicted} portions prévues, la demande dépasse la prévision.`,
      suggestedAction: `Produire ${missing} portions de plus pour couvrir toutes les réservations.`,
    }
  } else if (average > 0 && predicted > average * 1.25) {
    const gap = Math.round(((predicted - average) / average) * 100)
    result = {
      alert: true,
      level: 'warn',
      explanation: `${prefix} : ${predicted} portions prévues, soit ${gap} % au-dessus de la moyenne historique (${average}). ${reservations} pour l’instant.`,
      suggestedAction: 'Produire par lots et suivre les réservations avant de lancer le reste.',
    }
  } else {
    const share = predicted > 0 ? Math.round((reserved / predicted) * 100) : 0
    result = {
      alert: false,
      level: 'info',
      explanation: `${prefix} : ${reservations} sur ${predicted} portions prévues (${share} %), moyenne historique de ${average}.`,
      suggestedAction: `Lancer la production prévue de ${predicted} portions.`,
    }
  }

  return {
    ...result,
    explanation: clip(result.explanation, 300),
    suggestedAction: clip(result.suggestedAction, 200),
  }
}

export type SourcedExplanation = Explanation & { source: 'gemini' | 'local' }

// Évite de rappeler Gemini (quota gratuit limité) quand les chiffres n'ont pas changé.
const CACHE_TTL_MS = 10 * 60 * 1000
const explanationCache = new Map<string, { value: SourcedExplanation; expiresAt: number }>()

export function clearExplanationCache(): void {
  explanationCache.clear()
}

function cacheKey(input: ExplainInput): string {
  return JSON.stringify([
    GEMINI_MODEL,
    input.mealName,
    input.date.toISOString().slice(0, 10),
    input.predictedCount,
    input.actualReservations,
    input.historicalAverage,
  ])
}

export async function explainForecast(input: ExplainInput): Promise<Explanation> {
  const { alert, level, explanation, suggestedAction } = await explainForecastWithSource(input)
  return { alert, level, explanation, suggestedAction }
}

/** Explication + origine : `gemini` si le modèle a répondu à temps, `local` pour le repli calculé. */
export async function explainForecastWithSource(input: ExplainInput): Promise<SourcedExplanation> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  const noDemand =
    safeCount(input.predictedCount) === 0 &&
    safeCount(input.actualReservations) === 0 &&
    safeCount(input.historicalAverage) === 0
  if (!apiKey || apiKey === 'dummy' || apiKey === '' || noDemand) {
    return { ...buildFallbackExplanation(input), source: 'local' }
  }

  const key = cacheKey(input)
  const cached = explanationCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), 5000)

  try {
    const prompt = `Tu es un assistant cuisine. On te donne des chiffres déjà calculés pour le plat "${input.mealName.slice(0, 120)}" le ${input.date.toISOString().split('T')[0]}.
    Prévision du modèle : ${input.predictedCount} portions.
    Réservations confirmées : ${input.actualReservations}.
    Moyenne historique : ${input.historicalAverage}.
    
    Tu ne recalcules rien, tu expliques la prévision et tu alertes en 2 phrases max, en français correct avec tous les accents.`

    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: explanationSchema,
      prompt,
      abortSignal: abortController.signal,
    })

    clearTimeout(timeoutId)
    const value: SourcedExplanation = { ...object, source: 'gemini' }
    explanationCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  } catch (error) {
    clearTimeout(timeoutId)
    console.warn(
      '[ia] Gemini indisponible, repli utilisé :',
      error instanceof Error ? error.message : error,
    )
    return { ...buildFallbackExplanation(input), source: 'local' }
  }
}
