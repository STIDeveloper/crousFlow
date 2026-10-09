import { describe, expect, it } from 'vitest'
import { publishServiceSchema, serviceDraftSchema } from '@/lib/schemas/service'
import { receiveServiceSchema } from '@/lib/schemas/stock'

describe('contrats des services et des stocks', () => {
  it('accepte un brouillon daté et applique les horaires par défaut', () => {
    const result = serviceDraftSchema.parse({
      restaurantId: 'restaurant-montreuil',
      serviceDate: '2026-03-30',
      serviceKey: 'LUNCH',
    })
    expect(result.reservationClosingTime).toBe('18:00')
    expect(result.reservationDaysBefore).toBe(1)
  })

  it('refuse une date impossible et une offre sans quantité', () => {
    expect(
      serviceDraftSchema.safeParse({
        restaurantId: 'restaurant-montreuil',
        serviceDate: '2026-02-30',
        serviceKey: 'LUNCH',
      }).success,
    ).toBe(false)
    expect(
      publishServiceSchema.safeParse({
        serviceId: 'service-1',
        offers: [{ mealId: 'meal-1', plannedQuantity: -1, expectedQuantity: 10 }],
      }).success,
    ).toBe(false)
  })

  it('refuse une réception où les refus dépassent la livraison', () => {
    expect(
      receiveServiceSchema.safeParse({
        serviceId: 'service-1',
        operationKey: '4f157506-289f-49fe-a50c-465b0d38448d',
        lines: [{ offerId: 'offer-1', deliveredQuantity: 2, rejectedQuantity: 3 }],
      }).success,
    ).toBe(false)
  })
})
