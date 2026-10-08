import { z } from 'zod'

export const menuQuerySchema = z.object({
  week: z.coerce.number().int().min(0).max(52),
})

export type MenuQueryInput = z.infer<typeof menuQuerySchema>
