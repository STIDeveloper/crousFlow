import { z } from 'zod'

export const validateTicketSchema = z.object({
  token: z.string().min(1).max(512),
})

export type ValidateTicketInput = z.infer<typeof validateTicketSchema>
