import db from '@/server/db'
import { rules } from '@/config/rules'

type Affluence = 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL'

function startOfUtcWeek(date: Date): Date {
  const result = new Date(date)
  result.setUTCHours(0, 0, 0, 0)
  result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7))
  return result
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseAllergens(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every((allergen) => typeof allergen === 'string')
      ? parsed
      : []
  } catch {
    return []
  }
}

function getAffluence(capacity: number, reservedCount: number): Affluence {
  if (capacity <= 0 || reservedCount >= capacity) return 'FULL'
  const fillRate = reservedCount / capacity
  if (fillRate >= 0.75) return 'HIGH'
  if (fillRate >= 0.4) return 'MEDIUM'
  return 'LOW'
}

/**
 * Returns the service menu for Monday through Friday of the requested offset.
 * `week = 0` is the current UTC week; the client must send a non-negative offset.
 */
export async function getWeeklyMenu(week: number, now = new Date()) {
  const startsOn = startOfUtcWeek(now)
  startsOn.setUTCDate(startsOn.getUTCDate() + week * 7)
  const endsOn = new Date(startsOn)
  endsOn.setUTCDate(endsOn.getUTCDate() + 5)

  const [menuItems, slots, services] = await Promise.all([
    db.menuItem.findMany({
      where: { date: { gte: startsOn, lt: endsOn } },
      include: { meal: true },
      orderBy: [{ date: 'asc' }, { meal: { name: 'asc' } }],
    }),
    db.slot.findMany({
      where: { date: { gte: startsOn, lt: endsOn } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    db.serviceSession.findMany({
      where: { serviceDate: { gte: startsOn, lt: endsOn }, status: 'PUBLISHED' },
      include: { offers: true },
      orderBy: [{ serviceDate: 'asc' }, { serviceKey: 'asc' }],
    }),
  ])

  return {
    week,
    socialMealPriceCents: rules.socialMealPriceCents,
    startsOn: formatDate(startsOn),
    endsOn: formatDate(endsOn),
    days: Array.from({ length: 5 }, (_, offset) => {
      const date = new Date(startsOn)
      date.setUTCDate(date.getUTCDate() + offset)
      const dateValue = formatDate(date)
      const dateServices = services.filter(
        (service) => formatDate(service.serviceDate) === dateValue,
      )
      const publishedOfferByMenuItem = new Map(
        dateServices.flatMap((service) =>
          service.offers.map(
            (offer) => [offer.menuItemId, { serviceId: service.id, offer }] as const,
          ),
        ),
      )
      const hasPublishedService = dateServices.length > 0
      return {
        date: dateValue,
        menuItems: menuItems
          .filter(
            (menuItem) =>
              formatDate(menuItem.date) === dateValue &&
              (!hasPublishedService || publishedOfferByMenuItem.has(menuItem.id)),
          )
          .map((menuItem) => ({
            id: menuItem.id,
            date: dateValue,
            available:
              menuItem.available &&
              (!publishedOfferByMenuItem.has(menuItem.id) ||
                (publishedOfferByMenuItem.get(menuItem.id)?.offer.available ?? false)),
            serviceId: publishedOfferByMenuItem.get(menuItem.id)?.serviceId,
            offerId: publishedOfferByMenuItem.get(menuItem.id)?.offer.id,
            quota: publishedOfferByMenuItem.get(menuItem.id)
              ? {
                  planned: publishedOfferByMenuItem.get(menuItem.id)!.offer.plannedQuantity,
                  committed: publishedOfferByMenuItem.get(menuItem.id)!.offer.committedQuantity,
                  remaining: Math.max(
                    0,
                    publishedOfferByMenuItem.get(menuItem.id)!.offer.plannedQuantity -
                      publishedOfferByMenuItem.get(menuItem.id)!.offer.committedQuantity,
                  ),
                }
              : undefined,
            meal: {
              id: menuItem.meal.id,
              name: menuItem.meal.name,
              description: menuItem.meal.description,
              category: menuItem.meal.category,
              priceCents: menuItem.meal.priceCents,
              productType: menuItem.meal.productType,
              socialEligible: menuItem.meal.socialEligible,
              imageUrl: menuItem.meal.imageUrl,
              allergens: parseAllergens(menuItem.meal.allergens),
            },
          })),
        slots: slots
          .filter(
            (slot) =>
              formatDate(slot.date) === dateValue &&
              (!hasPublishedService ||
                dateServices.some((service) => service.id === slot.serviceId)),
          )
          .map((slot) => ({
            id: slot.id,
            date: dateValue,
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: slot.capacity,
            reservedCount: slot.reservedCount,
            availableSeats: Math.max(0, slot.capacity - slot.reservedCount),
            fillRate: slot.capacity > 0 ? slot.reservedCount / slot.capacity : 1,
            affluence: getAffluence(slot.capacity, slot.reservedCount),
          })),
      }
    }),
  }
}
