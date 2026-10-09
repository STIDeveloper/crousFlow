import { z } from 'zod'

export const validateTicketSchema = z.object({
  token: z.string().min(1).max(512),
  operationKey: z.string().uuid().optional(),
  paymentObserved: z.literal(true).default(true),
})

export const withdrawTicketSchema = z.object({
  token: z.string().min(1).max(512),
  operationKey: z.string().uuid(),
  paymentObserved: z.literal(true).default(true),
})

export type ValidateTicketInput = z.infer<typeof validateTicketSchema>
export type WithdrawTicketInput = z.infer<typeof withdrawTicketSchema>
