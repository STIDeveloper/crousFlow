import crypto from 'node:crypto'
import { ProductType, StockMovementKind } from '@prisma/client'
import db from '@/server/db'
import { AppError } from '@/server/errors'

type Actor = { id: string; role: string; restaurantId: string | null }

function assertKitchen(actor: Actor, restaurantId: string | null): void {
  if (!['KITCHEN', 'ADMIN'].includes(actor.role)) {
    throw new AppError('FORBIDDEN', 'Accès réservé au personnel', 403)
  }
  if (actor.restaurantId && restaurantId && actor.restaurantId !== restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
  }
}

export async function listStandaloneProducts(actor: Actor, dateStr: string) {
  const restaurantId =
    actor.restaurantId ?? (await db.restaurant.findFirst({ where: { active: true } }))?.id
  if (!restaurantId) return []
  assertKitchen(actor, restaurantId)

  const dateAtMidnight = new Date(`${dateStr}T00:00:00.000Z`)
  const nextDay = new Date(dateAtMidnight)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  // Produits configurés comme STANDALONE (froids, libre service)
  const products = await db.meal.findMany({
    where: {
      restaurantId,
      productType: ProductType.STANDALONE,
      active: true,
    },
    orderBy: { name: 'asc' },
  })

  // Récupérer les mouvements de vente comptoir de la journée
  const movements = await db.stockMovement.findMany({
    where: {
      restaurantId,
      kind: StockMovementKind.SERVED,
      reason: { startsWith: 'Vente comptoir libre-service' },
      createdAt: { gte: dateAtMidnight, lt: nextDay },
    },
  })

  // Compter par mealId (via référence ou reason)
  const salesCountByMeal = new Map<string, number>()
  for (const m of movements) {
    if (m.referenceId) {
      salesCountByMeal.set(m.referenceId, (salesCountByMeal.get(m.referenceId) ?? 0) + m.quantity)
    }
  }

  return products.map((prod) => ({
    id: prod.id,
    name: prod.name,
    category: prod.category,
    priceCents: prod.priceCents,
    allergens: prod.allergens,
    servedToday: salesCountByMeal.get(prod.id) ?? 0,
  }))
}

export async function recordStandaloneSale(
  actor: Actor,
  input: {
    mealId: string
    quantity?: number
  },
) {
  const restaurantId =
    actor.restaurantId ?? (await db.restaurant.findFirst({ where: { active: true } }))?.id
  if (!restaurantId) throw new AppError('NOT_FOUND', 'Restaurant non configuré', 404)
  assertKitchen(actor, restaurantId)

  const meal = await db.meal.findUnique({ where: { id: input.mealId } })
  if (!meal) throw new AppError('NOT_FOUND', 'Produit introuvable', 404)

  const qty = input.quantity ?? 1
  const todayAtMidnight = new Date()
  todayAtMidnight.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(todayAtMidnight)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  // Chercher un service actif du jour
  const service = await db.serviceSession.findFirst({
    where: {
      restaurantId,
      serviceDate: { gte: todayAtMidnight, lt: tomorrow },
      status: { in: ['PUBLISHED', 'CLOSED', 'DRAFT'] },
    },
    include: {
      offers: {
        include: { menuItem: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // S'il existe un service, trouver ou associer une offre pour ce meal
  let offerId: string | null = null
  let serviceId: string | null = service?.id ?? null

  if (service) {
    const matchingOffer = service.offers.find((o) => o.menuItem.mealId === meal.id)
    if (matchingOffer) {
      offerId = matchingOffer.id
    } else {
      // Vérifier si un MenuItem existe pour ce meal
      let menuItem = await db.menuItem.findFirst({
        where: { mealId: meal.id, restaurantId },
      })
      if (!menuItem) {
        menuItem = await db.menuItem.create({
          data: {
            id: crypto.randomUUID(),
            mealId: meal.id,
            restaurantId,
            date: todayAtMidnight,
            available: true,
          },
        })
      }
      const newOffer = await db.serviceOffer.create({
        data: {
          id: crypto.randomUUID(),
          serviceId: service.id,
          menuItemId: menuItem.id,
          plannedQuantity: 0,
          expectedQuantity: 0,
          physicalQuantity: 0,
          allocatedQuantity: 0,
        },
      })
      offerId = newOffer.id
    }
  }

  // Si aucun service n'existe aujourd'hui, on en crée un par défaut pour le comptoir libre-service
  if (!serviceId || !offerId) {
    const newService = await db.serviceSession.create({
      data: {
        id: crypto.randomUUID(),
        restaurantId,
        serviceDate: todayAtMidnight,
        serviceKey: 'LUNCH',
        status: 'PUBLISHED',
        reservationClosingAt: tomorrow,
        cancellationClosingAt: tomorrow,
      },
    })
    serviceId = newService.id
    let menuItem = await db.menuItem.findFirst({
      where: { mealId: meal.id, restaurantId },
    })
    if (!menuItem) {
      menuItem = await db.menuItem.create({
        data: {
          id: crypto.randomUUID(),
          mealId: meal.id,
          restaurantId,
          date: todayAtMidnight,
          available: true,
        },
      })
    }
    const newOffer = await db.serviceOffer.create({
      data: {
        id: crypto.randomUUID(),
        serviceId: newService.id,
        menuItemId: menuItem.id,
        plannedQuantity: 0,
        expectedQuantity: 0,
        physicalQuantity: 0,
        allocatedQuantity: 0,
      },
    })
    offerId = newOffer.id
  }

  const movement = await db.stockMovement.create({
    data: {
      id: crypto.randomUUID(),
      serviceId,
      offerId,
      restaurantId,
      actorId: actor.id,
      kind: StockMovementKind.SERVED,
      quantity: qty,
      referenceId: meal.id,
      reason: `Vente comptoir libre-service (${meal.name})`,
      operationKey: crypto.randomUUID(),
    },
  })

  return {
    success: true,
    movementId: movement.id,
    mealId: meal.id,
    servedQuantity: qty,
  }
}
