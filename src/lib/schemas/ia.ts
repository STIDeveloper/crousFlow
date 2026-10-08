import { z } from 'zod'

export const explanationSchema = z.object({
  alert: z.boolean(),
  level: z.enum(['info', 'warn', 'danger']),
  explanation: z.string().min(10).max(300),
  suggestedAction: z.string().min(10).max(200),
})

export type Explanation = z.infer<typeof explanationSchema>

export const patchBatchSchema = z.object({
  id: z.string(),
  preparedCount: z.number().int().min(0),
})

export type PatchBatchInput = z.infer<typeof patchBatchSchema>
