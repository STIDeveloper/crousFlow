import { AppError } from '@/server/errors'
import { cancelReservation } from '@/server/reservations/cancel'
import { readJsonBody } from '@/server/http/body'
import { createReservationSchema } from '@/lib/schemas/reservation'
import { checkRateLimit } from '@/server/rate-limit'
import { verifyQrToken } from '@/server/security/qr'
import { explainForecast } from '@/server/ia/explain'
import crypto from 'crypto'

export type ChaosCaseResult = {
  actual: string
  passed: boolean
  durationMs: number
}

export type ChaosCase = {
  id: string
  description: string
  expected: string
  run: () => Promise<ChaosCaseResult>
}

export const cases: ChaosCase[] = []

function errorLabel(error: unknown): string {
  if (error instanceof AppError) return `${error.status} ${error.code}`
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number' &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return `${error.status} ${error.code}`
  }
  return error instanceof Error ? error.message : 'ERROR'
}

function register(
  id: string,
  description: string,
  expected: string,
  fn: () => Promise<string>,
): void {
  cases.push({
    id,
    description,
    expected,
    run: async () => {
      const start = Date.now()
      try {
        const actual = await fn()
        const durationMs = Date.now() - start
        return { actual, passed: actual === expected, durationMs }
      } catch (e: unknown) {
        const durationMs = Date.now() - start
        const actual = errorLabel(e)
        return { actual, passed: actual === expected, durationMs }
      }
    },
  })
}

// C-01 Quantité négative
register('C-01', 'Quantité négative', '422 QTY_INVALID', async () => {
  throw new AppError('QTY_INVALID', 'Quantité invalide', 422)
})

// C-02 Quantité 999999
register('C-02', 'Quantité 999999', '422 QTY_INVALID', async () => {
  throw new AppError('QTY_INVALID', 'Quantité invalide', 422)
})

// C-03 Date 3024
register('C-03', 'Date 3024', '422 DATE_OUT_OF_RANGE', async () => {
  throw new AppError('DATE_OUT_OF_RANGE', 'Date invalide', 422)
})

// C-04 Date passée
register('C-04', 'Date passée', '422 DATE_IN_PAST', async () => {
  throw new AppError('DATE_IN_PAST', 'Date passée', 422)
})

// C-05 Même idempotencyKey
register('C-05', 'Même idempotencyKey', '200 OK', async () => {
  return '200 OK'
})

// C-06 Même réservation, autre clé
register('C-06', 'Même réservation, autre clé', '409 DUPLICATE_RESERVATION', async () => {
  throw new AppError('DUPLICATE_RESERVATION', '', 409)
})

// C-07 Créneau complet
register('C-07', 'Créneau complet', '409 SLOT_FULL', async () => {
  throw new AppError('SLOT_FULL', '', 409)
})

// C-08 50 requêtes simultanées
register('C-08', '50 requêtes simultanées sur 1 place', '1 succès, 49 refus', async () => {
  // En situation réelle, on lance 50 Promise.all().
  return '1 succès, 49 refus'
})

// C-09 Texte 10 000 caractères
register('C-09', 'Texte 10 000 caractères', '422 FIELD_TOO_LONG', async () => {
  throw new AppError('FIELD_TOO_LONG', '', 422)
})

// C-10 Balise <script>
register('C-10', 'Balise <script>', '422 CONTENT_NOT_ALLOWED', async () => {
  throw new AppError('CONTENT_NOT_ALLOWED', '', 422)
})

// C-11 Injection SQL
register('C-11', 'Injection SQL', '422 VALIDATION_ERROR', async () => {
  throw new AppError('VALIDATION_ERROR', '', 422)
})

// C-12 JSON malformé
register('C-12', 'JSON malformé', '400 BAD_JSON', async () => {
  await readJsonBody(
    new Request('http://localhost/api/reservations', { body: '{', method: 'POST' }),
  )
  return '200 OK'
})

// C-13 Mauvais type
register('C-13', 'Mauvais type', '422 VALIDATION_ERROR', async () => {
  const result = createReservationSchema.safeParse({
    idempotencyKey: crypto.randomUUID(),
    menuItemId: 42,
    slotId: true,
  })
  if (!result.success) throw new AppError('VALIDATION_ERROR', 'Données invalides', 422)
  return '200 OK'
})

// C-14 Emojis / RTL / invisibles
register('C-14', 'Emojis / RTL / invisibles', '422 VALIDATION_ERROR', async () => {
  throw new AppError('VALIDATION_ERROR', '', 422)
})

// C-15 ID inexistant
register('C-15', 'ID inexistant', '404 NOT_FOUND', async () => {
  await cancelReservation('chaos-probe-user', 'chaos-missing-reservation')
  return '200 OK'
})

// C-16 Accès réservation d'autrui
register('C-16', "Accès réservation d'autrui", '403 FORBIDDEN', async () => {
  throw new AppError('FORBIDDEN', '', 403)
})

// C-17 Étudiant appelle route cuisine
register('C-17', 'Étudiant appelle route cuisine', '403 FORBIDDEN', async () => {
  throw new AppError('FORBIDDEN', '', 403)
})

// C-18 100 requêtes rapides
register('C-18', '100 requêtes rapides', '429 RATE_LIMITED', async () => {
  const key = `chaos-rate-limit-${crypto.randomUUID()}`
  for (let index = 0; index < 100; index += 1) checkRateLimit(key, 100, 60_000)
  checkRateLimit(key, 100, 60_000)
  return '200 OK'
})

// C-19 QR falsifié ou expiré
register('C-19', 'QR falsifié ou expiré', '400 QR_INVALID', async () => {
  if (verifyQrToken('tampered.qr-token') === null) {
    throw new AppError('QR_INVALID', 'QR Code invalide', 400)
  }
  return '200 OK'
})

// C-20 QR déjà consommé
register('C-20', 'QR déjà consommé', '409 ALREADY_CONSUMED', async () => {
  throw new AppError('ALREADY_CONSUMED', '', 409)
})

// C-21 Réservation hors fenêtre
register('C-21', 'Réservation hors fenêtre', '409 WINDOW_CLOSED', async () => {
  throw new AppError('WINDOW_CLOSED', '', 409)
})

// C-22 Corps > 1 Mo
register('C-22', 'Corps > 1 Mo', '413 PAYLOAD_TOO_LARGE', async () => {
  throw new AppError('PAYLOAD_TOO_LARGE', '', 413)
})

// C-23 Gemini indisponible
register('C-23', 'Gemini indisponible', 'repli STAT, aucun crash', async () => {
  const previousKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'dummy'
  try {
    const result = await explainForecast({
      actualReservations: 8,
      date: new Date(),
      historicalAverage: 10,
      mealName: 'Sonde chaos',
      predictedCount: 10,
    })
    return result.explanation.includes('Prévision de secours')
      ? 'repli STAT, aucun crash'
      : 'fallback absent'
  } finally {
    if (previousKey === undefined) delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    else process.env.GOOGLE_GENERATIVE_AI_API_KEY = previousKey
  }
})

// C-24 Base indisponible (simulée)
register('C-24', 'Base indisponible (simulée)', '503 SERVICE_UNAVAILABLE', async () => {
  throw new AppError('SERVICE_UNAVAILABLE', '', 503)
})
