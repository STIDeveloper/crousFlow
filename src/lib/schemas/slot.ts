import { z } from 'zod'

export const slotQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type SlotQueryInput = z.infer<typeof slotQuerySchema>
