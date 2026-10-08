import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { explanationSchema, type Explanation } from '@/lib/schemas/ia'

const FALLBACK_EXPLANATION: Explanation = {
  alert: false,
  level: 'info',
  explanation: 'Prévision de secours : explication indisponible.',
  suggestedAction: 'Vérifier manuellement les quantités.',
}

type ExplainInput = {
  date: Date
  mealName: string
  predictedCount: number
  actualReservations: number
  historicalAverage: number
}

export async function explainForecast(input: ExplainInput): Promise<Explanation> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey || apiKey === 'dummy' || apiKey === '') {
    return FALLBACK_EXPLANATION
  }

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), 5000)

  try {
    const prompt = `Tu es un assistant cuisine. On te donne des chiffres déjà calculés pour le plat "${input.mealName}" le ${input.date.toISOString().split('T')[0]}.
    Prévision du modèle : ${input.predictedCount} portions.
    Réservations confirmées : ${input.actualReservations}.
    Moyenne historique : ${input.historicalAverage}.
    
    Tu ne recalcules rien, tu expliques la prévision et tu alertes en français, en 2 phrases max.`

    // Note: We use gemini-1.5-flash as it's the stable fast model supported by Vercel AI SDK.
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: explanationSchema,
      prompt,
      abortSignal: abortController.signal,
    })

    clearTimeout(timeoutId)
    return object
  } catch {
    clearTimeout(timeoutId)
    return FALLBACK_EXPLANATION
  }
}
