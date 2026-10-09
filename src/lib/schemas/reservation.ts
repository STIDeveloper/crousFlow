import { z } from 'zod'
import { rules } from '@/config/rules'

const menuItemIdSchema = z.string().min(1).max(128)

export const createReservationSchema = z
  .object({
    slotId: z.string().min(1).max(128),
    menuItemId: menuItemIdSchema,
    peripheralMenuItemIds: z.array(menuItemIdSchema).max(rules.maxPeripheralProducts).default([]),
    supplementMenuItemIds: z.array(menuItemIdSchema).max(rules.maxSupplementProducts).default([]),
    serviceId: menuItemIdSchema.optional(),
    starterMenuItemId: menuItemIdSchema.optional(),
    dessertMenuItemId: menuItemIdSchema.optional(),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((value, context) => {
    const selectedIds = [
      value.menuItemId,
      ...value.peripheralMenuItemIds,
      ...value.supplementMenuItemIds,
      ...(value.starterMenuItemId ? [value.starterMenuItemId] : []),
      ...(value.dessertMenuItemId ? [value.dessertMenuItemId] : []),
    ]
    if (new Set(selectedIds).size !== selectedIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Un produit ne peut être sélectionné qu’une fois',
      })
    }
  })

export const cancelReservationSchema = z.object({
  id: z.string(),
})

export type CreateReservationInput = z.input<typeof createReservationSchema>
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>
