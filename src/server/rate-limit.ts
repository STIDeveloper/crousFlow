import { AppError } from './errors'

const store = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const record = store.get(key)

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (record.count >= limit) {
    throw new AppError('RATE_LIMITED', 'Trop de requêtes, réessayez plus tard', 429)
  }

  record.count += 1
}
