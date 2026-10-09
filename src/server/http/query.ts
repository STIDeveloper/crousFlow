import { z } from 'zod'
import { AppError } from '@/server/errors'

const isoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
  })

/** Parses an optional `AAAA-MM-JJ` query parameter; returns null when absent. */
export function parseDateQuery(value: string | null): Date | null {
  if (value === null) return null
  const parsed = isoDaySchema.safeParse(value)
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Paramètre date invalide (format attendu : AAAA-MM-JJ)',
      422,
    )
  }
  return new Date(`${parsed.data}T00:00:00.000Z`)
}
