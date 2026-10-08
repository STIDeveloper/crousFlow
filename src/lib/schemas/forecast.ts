import { z } from 'zod'

export const forecastQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>
