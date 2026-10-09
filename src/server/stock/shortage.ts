import { ReservationFulfillmentStatus, ReservationStatus } from '@prisma/client'
import db from '@/server/db'
import { AppError } from '@/server/errors'
import { recalculateAllocations } from './receive'

type Actor = { id: string; role: string; restaurantId: string | null }

function assertKitchen(actor: Actor, restaurantId: string | null): void {
  if (!['KITCHEN', 'ADMIN'].includes(actor.role)) {
    throw new AppError('FORBIDDEN', 'Accès réservé au personnel', 403)
  }
  if (actor.restaurantId && restaurantId && actor.restaurantId !== restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
  }
}

export async function getShortageReservations(actor: Actor, serviceDate: string) {
  const dateAtMidnight = new Date(`${serviceDate}T00:00:00.000Z`)
  const service = await db.serviceSession.findFirst({
    where: {
      serviceDate: dateAtMidnight,
      restaurantId: actor.restaurantId ?? undefined,
    },
    include: {
      offers: {
        include: { menuItem: { include: { meal: true } } },
      },
    },
  })

  if (!service) return []
  assertKitchen(actor, service.restaurantId)

  // Réservations bloquées par manque de stock physique
  const blockedReservations = await db.reservation.findMany({
    where: {
      serviceId: service.id,
      status: ReservationStatus.CONFIRMED,
      fulfillmentStatus: ReservationFulfillmentStatus.BLOCKED,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      slot: { select: { startTime: true, endTime: true } },
      menuItem: { include: { meal: true } },
      items: { include: { menuItem: { include: { meal: true } } } },
      allocations: { include: { offer: { include: { menuItem: { include: { meal: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Identifier pour chaque réservation quel produit manque
  const offersMap = new Map(service.offers.map((o) => [o.id, o]))
  const menuItemToOffer = new Map(service.offers.map((o) => [o.menuItemId, o]))

  return blockedReservations.map((reservation) => {
    const missingItems: Array<{ id: string; name: string; type: string }> = []

    // Vérifier le plat principal
    const primaryOffer = reservation.primaryOfferId
      ? offersMap.get(reservation.primaryOfferId)
      : menuItemToOffer.get(reservation.menuItemId)

    if (primaryOffer && primaryOffer.physicalQuantity < primaryOffer.allocatedQuantity + 1) {
      missingItems.push({
        id: primaryOffer.menuItem.meal.id,
        name: primaryOffer.menuItem.meal.name,
        type: 'Plat principal',
      })
    }

    // Vérifier les accompagnements
    for (const item of reservation.items) {
      const offer = item.serviceOfferId
        ? offersMap.get(item.serviceOfferId)
        : menuItemToOffer.get(item.menuItemId)
      if (offer && offer.physicalQuantity < offer.allocatedQuantity + 1) {
        missingItems.push({
          id: offer.menuItem.meal.id,
          name: offer.menuItem.meal.name,
          type: item.kind === 'SIDE' ? 'Périphérique' : 'Supplément',
        })
      }
    }

    return {
      reservationId: reservation.id,
      studentName: reservation.user.name,
      studentEmail: reservation.user.email,
      slotTime: `${reservation.slot.startTime}–${reservation.slot.endTime}`,
      missingItems: missingItems.length
        ? missingItems
        : [{ id: 'unknown', name: 'Produit non livré', type: 'Repas' }],
      mainMealName: reservation.menuItem.meal.name,
      availableReplacements: service.offers
        .filter((o) => o.available && o.physicalQuantity > o.allocatedQuantity)
        .map((o) => ({
          offerId: o.id,
          mealId: o.menuItem.meal.id,
          name: o.menuItem.meal.name,
          productType: o.menuItem.meal.productType,
          sideCategory: o.menuItem.meal.sideCategory,
          availableStock: o.physicalQuantity - o.allocatedQuantity,
        })),
    }
  })
}

export async function substituteShortageItem(
  actor: Actor,
  input: {
    reservationId: string
    substituteMealId: string
    reason?: string
  },
) {
  return db.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: input.reservationId },
      include: {
        service: {
          include: {
            offers: { include: { menuItem: true } },
          },
        },
        items: true,
      },
    })

    if (!reservation) throw new AppError('NOT_FOUND', 'Réservation introuvable', 404)
    assertKitchen(actor, reservation.restaurantId)

    if (!reservation.service) {
      throw new AppError('VALIDATION_ERROR', 'Réservation sans service associé', 400)
    }

    // Trouver l'offre de remplacement
    const targetOffer = reservation.service.offers.find(
      (o) => o.menuItem.mealId === input.substituteMealId,
    )
    if (!targetOffer) {
      throw new AppError('NOT_FOUND', 'Produit de remplacement non disponible dans ce service', 404)
    }

    if (targetOffer.physicalQuantity <= targetOffer.allocatedQuantity) {
      throw new AppError(
        'STOCK_SHORTAGE',
        'Le produit de remplacement n’a plus de stock disponible',
        409,
      )
    }

    // Si c'est le plat principal à remplacer
    const newMenuItem = targetOffer.menuItem
    await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        menuItemId: newMenuItem.id,
        primaryOfferId: targetOffer.id,
        incidentReason: `Substitué par le personnel suite à rupture: ${input.reason || 'Livraison CROUS incomplète'}`,
      },
    })

    await recalculateAllocations(tx, reservation.service.id)

    return {
      success: true,
      message: 'Substitution appliquée et stock réalloué.',
    }
  })
}

export async function cancelShortageReservation(
  actor: Actor,
  input: {
    reservationId: string
    reason?: string
  },
) {
  return db.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: input.reservationId },
      include: { service: true },
    })

    if (!reservation) throw new AppError('NOT_FOUND', 'Réservation introuvable', 404)
    assertKitchen(actor, reservation.restaurantId)

    await tx.stockAllocation.deleteMany({
      where: { reservationId: reservation.id },
    })

    const updated = await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.CANCELLED,
        fulfillmentStatus: ReservationFulfillmentStatus.BLOCKED,
        incidentReason: input.reason || 'Annulé par le restaurant pour rupture de livraison',
        activeKey: null,
        socialQuotaKey: null,
      },
    })

    if (reservation.serviceId) {
      await recalculateAllocations(tx, reservation.serviceId)
    }

    return updated
  })
}
