import { z } from 'zod'

const identifierSchema = z.string().trim().min(1).max(128)

export const receptionLineSchema = z
  .object({
    offerId: identifierSchema,
    deliveredQuantity: z.number().int().min(0).max(100_000),
    rejectedQuantity: z.number().int().min(0).max(100_000).default(0),
    lot: z.string().trim().max(128).optional(),
    bestBefore: z.string().date().optional(),
    observation: z.string().trim().max(500).optional(),
  })
  .refine((line) => line.rejectedQuantity <= line.deliveredQuantity, {
    message: 'La quantité refusée ne peut pas dépasser la quantité livrée',
    path: ['rejectedQuantity'],
  })

export const receiveServiceSchema = z.object({
  serviceId: identifierSchema,
  operationKey: z.string().uuid(),
  lines: z.array(receptionLineSchema).min(1).max(500),
  observation: z.string().trim().max(500).optional(),
})

export const adjustStockSchema = z.object({
  offerId: identifierSchema,
  operationKey: z.string().uuid(),
  quantityDelta: z
    .number()
    .int()
    .min(-100_000)
    .max(100_000)
    .refine((value) => value !== 0),
  reason: z.string().trim().min(1).max(500),
})

export type ReceptionLineInput = z.infer<typeof receptionLineSchema>
export type ReceiveServiceInput = z.infer<typeof receiveServiceSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>
