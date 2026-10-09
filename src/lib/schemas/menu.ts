import { z } from 'zod'

export const menuQuerySchema = z.object({
  week: z
    .string()
    .regex(/^\d{1,2}$/, 'La semaine doit être un entier entre 0 et 52')
    .transform(Number)
    .pipe(z.number().int().min(0).max(52)),
})

export type MenuQueryInput = z.infer<typeof menuQuerySchema>
