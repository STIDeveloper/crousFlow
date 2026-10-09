import { z } from 'zod'
import { parseServiceDate } from '@/server/services/service-date'

const identifierSchema = z.string().trim().min(1).max(128)
const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide')

export const serviceDateSchema = z.string().refine((value) => {
  try {
    parseServiceDate(value)
    return true
  } catch {
    return false
  }
}, 'Date de service invalide')

export const serviceKeySchema = z.enum(['LUNCH', 'DINNER'])
export const serviceStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED'])

export const serviceDraftSchema = z.object({
  restaurantId: identifierSchema,
  serviceDate: serviceDateSchema,
  serviceKey: serviceKeySchema,
  reservationClosingTime: clockSchema.default('18:00'),
  reservationDaysBefore: z.number().int().min(0).max(7).default(1),
  cancellationClosingTime: clockSchema.default('18:00'),
  cancellationDaysBefore: z.number().int().min(0).max(7).default(1),
})

export const serviceOfferSchema = z.object({
  mealId: identifierSchema,
  plannedQuantity: z.number().int().min(0).max(100_000),
  expectedQuantity: z.number().int().min(0).max(100_000),
  available: z.boolean().default(true),
})

export const publishServiceSchema = z.object({
  serviceId: identifierSchema,
  offers: z.array(serviceOfferSchema).min(1).max(500),
})

export const closeServiceSchema = z.object({
  serviceId: identifierSchema,
  reason: z.string().trim().min(1).max(500),
})

export type ServiceDraftInput = z.infer<typeof serviceDraftSchema>
export type ServiceOfferInput = z.infer<typeof serviceOfferSchema>
export type PublishServiceInput = z.infer<typeof publishServiceSchema>
export type CloseServiceInput = z.infer<typeof closeServiceSchema>
