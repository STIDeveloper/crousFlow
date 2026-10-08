import { z } from 'zod'

export const createReservationSchema = z.object({
  slotId: z.string(),
  menuItemId: z.string(),
  idempotencyKey: z.string().uuid(),
})

export const cancelReservationSchema = z.object({
  id: z.string(),
})

export type CreateReservationInput = z.infer<typeof createReservationSchema>
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>
