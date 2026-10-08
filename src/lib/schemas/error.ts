import { z } from 'zod'

export const appErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  requestId: z.string(),
})

export type AppErrorSchema = z.infer<typeof appErrorSchema>
