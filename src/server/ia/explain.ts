import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { explanationSchema, type Explanation } from '@/lib/schemas/ia'

// Surchargeable via GEMINI_MODEL sans toucher au code.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash'

type ExplainInput = {
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

  let result: Explanation
  if (reserved > predicted) {
    const missing = reserved - predicted
    result = {
      alert: true,
      level: 'danger',
      explanation: `${prefix} : ${reserved} réservations confirmées pour ${predicted} portions prévues, la demande dépasse la prévision.`,
      suggestedAction: `Produire ${missing} portions de plus pour couvrir toutes les réservations.`,
    }
  } else if (average > 0 && predicted > average * 1.25) {
    const gap = Math.round(((predicted - average) / average) * 100)
    result = {
      alert: true,
      level: 'warn',
      explanation: `${prefix} : ${predicted} portions prévues, soit ${gap} % au-dessus de la moyenne historique (${average}). ${reserved} déjà réservées.`,
      suggestedAction: 'Produire par lots et suivre les réservations avant de lancer le reste.',
    }
  } else {
    const share = predicted > 0 ? Math.round((reserved / predicted) * 100) : 0
    result = {
      alert: false,
      level: 'info',
      explanation: `${prefix} : ${reserved} réservations sur ${predicted} portions prévues (${share} %), en ligne avec la moyenne historique de ${average}.`,
      suggestedAction: `Lancer la production prévue de ${predicted} portions.`,
    }
  }

  return {
    ...result,
    explanation: clip(result.explanation, 300),
    suggestedAction: clip(result.suggestedAction, 200),
  }
}

export async function explainForecast(input: ExplainInput): Promise<Explanation> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey || apiKey === 'dummy' || apiKey === '') {
    return buildFallbackExplanation(input)
  }

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), 5000)

  try {
    const prompt = `Tu es un assistant cuisine. On te donne des chiffres déjà calculés pour le plat "${input.mealName.slice(0, 120)}" le ${input.date.toISOString().split('T')[0]}.
    Prévision du modèle : ${input.predictedCount} portions.
    Réservations confirmées : ${input.actualReservations}.
    Moyenne historique : ${input.historicalAverage}.
    
    Tu ne recalcules rien, tu expliques la prévision et tu alertes en français, en 2 phrases max.`

    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: explanationSchema,
      prompt,
      abortSignal: abortController.signal,
    })

    clearTimeout(timeoutId)
    return object
  } catch (error) {
    clearTimeout(timeoutId)
    console.warn(
      '[ia] Gemini indisponible, repli utilisé :',
      error instanceof Error ? error.message : error,
    )
    return buildFallbackExplanation(input)
  }
}
