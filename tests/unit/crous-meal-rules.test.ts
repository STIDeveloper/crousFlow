import { describe, expect, it } from 'vitest'
import { createReservationSchema } from '@/lib/schemas/reservation'
import { getServiceKey } from '@/server/reservations/time'

const baseReservation = {
  slotId: 'slot-lunch',
  menuItemId: 'main-menu-item',
  idempotencyKey: '4f157506-289f-49fe-a50c-465b0d38448d',
}

describe('Règles de composition CROUS', () => {
  it('accepte un plat seul ou accompagné de deux périphériques au plus', () => {
    expect(createReservationSchema.safeParse(baseReservation).success).toBe(true)
    expect(
      createReservationSchema.safeParse({
        ...baseReservation,
        peripheralMenuItemIds: ['side-1', 'side-2'],
      }).success,
    ).toBe(true)
  })

  it('refuse un troisième périphérique', () => {
    const result = createReservationSchema.safeParse({
      ...baseReservation,
      peripheralMenuItemIds: ['side-1', 'side-2', 'side-3'],
    })

    expect(result.success).toBe(false)
  })

  it('refuse le même produit dans plusieurs rôles', () => {
    const result = createReservationSchema.safeParse({
      ...baseReservation,
      peripheralMenuItemIds: ['side-1'],
      supplementMenuItemIds: ['side-1'],
    })

    expect(result.success).toBe(false)
  })
})

describe('Identification du service local', () => {
  it('distingue le midi et le soir sans inventer un service intermédiaire', () => {
    expect(getServiceKey('12:15')).toBe('LUNCH')
    expect(getServiceKey('19:00')).toBe('DINNER')
    expect(getServiceKey('15:00')).toBeNull()
  })
})
