import { z } from 'zod'

export const chaosRunSchema = z.object({
  caseId: z.string().optional(),
})

export type ChaosRunInput = z.infer<typeof chaosRunSchema>
