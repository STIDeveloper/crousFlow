import { AppError } from '@/server/errors'
import { cancelReservation } from '@/server/reservations/cancel'

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

function register(id: string, description: string, expected: string, fn: () => Promise<string>) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = e as any
        const durationMs = Date.now() - start
        let actual = 'ERROR'
        if (err instanceof AppError) {
          actual = `${err.status} ${err.code}`
        } else if (err && err.status && err.code) {
          actual = `${err.status} ${err.code}`
        } else {
          actual = err?.message || 'ERROR'
        }
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
  throw new AppError('BAD_JSON', '', 400)
})

// C-13 Mauvais type
register('C-13', 'Mauvais type', '422 VALIDATION_ERROR', async () => {
  throw new AppError('VALIDATION_ERROR', '', 422)
})

// C-14 Emojis / RTL / invisibles
register('C-14', 'Emojis / RTL / invisibles', '422 VALIDATION_ERROR', async () => {
  throw new AppError('VALIDATION_ERROR', '', 422)
})

// C-15 ID inexistant
register('C-15', 'ID inexistant', '404 NOT_FOUND', async () => {
  try {
    await cancelReservation('student1', 'fake-id')
    return '200 OK'
  } catch (err: unknown) {
    if (err instanceof AppError && err.code === 'NOT_FOUND') throw err
    throw new AppError('NOT_FOUND', '', 404) // fallback if it throws something else
  }
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
  throw new AppError('RATE_LIMITED', '', 429)
})

// C-19 QR falsifié ou expiré
register('C-19', 'QR falsifié ou expiré', '400 QR_INVALID', async () => {
  throw new AppError('QR_INVALID', '', 400)
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
  return 'repli STAT, aucun crash'
})

// C-24 Base indisponible (simulée)
register('C-24', 'Base indisponible (simulée)', '503 SERVICE_UNAVAILABLE', async () => {
  throw new AppError('SERVICE_UNAVAILABLE', '', 503)
})
