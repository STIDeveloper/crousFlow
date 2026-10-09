import { Prisma, ServiceKey, ServiceStatus } from '@prisma/client'
import crypto from 'node:crypto'
import db from '@/server/db'
import { AppError } from '@/server/errors'
import { getReservationClosingInstant, isBeforeReservationClosing } from './service-date'
import type {
  CloseServiceInput,
  PublishServiceInput,
  ServiceDraftInput,
  ServiceOfferInput,
} from '@/lib/schemas/service'

function serviceDateAtUtcMidnight(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function assertAdminRestaurant(
  actor: { role: string; restaurantId: string | null },
  restaurantId: string,
): void {
  if (actor.role !== 'ADMIN') throw new AppError('FORBIDDEN', 'Réservé aux administrateurs', 403)
  if (actor.restaurantId && actor.restaurantId !== restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
  }
}

function defaultSlots(serviceKey: ServiceKey): Array<{ startTime: string; endTime: string }> {
  return serviceKey === ServiceKey.LUNCH
    ? [
        { startTime: '12:00', endTime: '12:15' },
        { startTime: '12:15', endTime: '12:30' },
        { startTime: '12:30', endTime: '12:45' },
      ]
    : [
        { startTime: '18:00', endTime: '18:15' },
        { startTime: '18:15', endTime: '18:30' },
        { startTime: '18:30', endTime: '18:45' },
      ]
}

function serviceInclude() {
  return {
    restaurant: { select: { id: true, name: true, slug: true } },
    offers: {
      include: {
        menuItem: { include: { meal: true } },
      },
      orderBy: { createdAt: 'asc' as const },
    },
    slots: { orderBy: { startTime: 'asc' as const } },
  }
}

export async function createServiceDraft(
  actor: { role: string; restaurantId: string | null },
  input: ServiceDraftInput,
) {
  assertAdminRestaurant(actor, input.restaurantId)
  const restaurant = await db.restaurant.findUnique({ where: { id: input.restaurantId } })
  if (!restaurant || !restaurant.active) {
    throw new AppError('NOT_FOUND', 'Restaurant introuvable ou inactif', 404)
  }

  const serviceDate = serviceDateAtUtcMidnight(input.serviceDate)
  const existing = await db.serviceSession.findUnique({
    where: {
      restaurantId_serviceDate_serviceKey: {
        restaurantId: input.restaurantId,
        serviceDate,
        serviceKey: input.serviceKey,
      },
    },
  })
  if (existing)
    return db.serviceSession.findUniqueOrThrow({
      where: { id: existing.id },
      include: serviceInclude(),
    })

  const reservationClosingAt = getReservationClosingInstant(
    input.serviceDate,
    input.reservationClosingTime,
    input.reservationDaysBefore,
  )
  const cancellationClosingAt = getReservationClosingInstant(
    input.serviceDate,
    input.cancellationClosingTime,
    input.cancellationDaysBefore,
  )

  return db.serviceSession.create({
    data: {
      id: crypto.randomUUID(),
      restaurantId: input.restaurantId,
      serviceDate,
      serviceKey: input.serviceKey,
      status: ServiceStatus.DRAFT,
      reservationClosingAt,
      cancellationClosingAt,
    },
    include: serviceInclude(),
  })
}

/**
 * Stores the catalogue lines attached to a draft without publishing it.
 * The admin screen uses this to make preparation and publication two visible
 * actions while keeping all menu writes in one server-side transaction.
 */
export async function saveServiceDraftOffers(
  actor: { role: string; restaurantId: string | null },
  serviceId: string,
  inputs: ServiceOfferInput[],
) {
  const service = await db.serviceSession.findUnique({ where: { id: serviceId } })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertAdminRestaurant(actor, service.restaurantId)
  if (service.status !== ServiceStatus.DRAFT) {
    throw new AppError('SERVICE_CLOSED', 'Seul un brouillon peut être modifié', 409)
  }
  if (inputs.length === 0) throw new AppError('VALIDATION_ERROR', 'Offres manquantes', 422)
  if (new Set(inputs.map((input) => input.mealId)).size !== inputs.length) {
    throw new AppError('VALIDATION_ERROR', 'Un produit ne peut être publié qu’une fois', 422)
  }

  return db.$transaction(async (tx) => {
    const meals = await tx.meal.findMany({
      where: { id: { in: inputs.map((input) => input.mealId) }, active: true },
    })
    if (meals.length !== inputs.length) {
      throw new AppError('NOT_FOUND', 'Un produit est introuvable ou désactivé', 404)
    }
    if (meals.some((meal) => meal.restaurantId !== service.restaurantId)) {
      throw new AppError('FORBIDDEN', 'Produit d’un autre restaurant', 403)
    }

    for (const input of inputs) {
      const menuItem = await tx.menuItem.upsert({
        where: { mealId_date: { mealId: input.mealId, date: service.serviceDate } },
        create: {
          id: crypto.randomUUID(),
          mealId: input.mealId,
          date: service.serviceDate,
          available: input.available,
          restaurantId: service.restaurantId,
        },
        update: { available: input.available, restaurantId: service.restaurantId },
      })
      const existing = await tx.serviceOffer.findUnique({
        where: { serviceId_menuItemId: { serviceId: service.id, menuItemId: menuItem.id } },
      })
      if (existing && existing.committedQuantity > input.plannedQuantity) {
        throw new AppError(
          'PRODUCT_QUOTA_EXHAUSTED',
          'Le nouveau quota est inférieur aux réservations',
          409,
        )
      }
      await tx.serviceOffer.upsert({
        where: { serviceId_menuItemId: { serviceId: service.id, menuItemId: menuItem.id } },
        create: {
          id: crypto.randomUUID(),
          serviceId: service.id,
          menuItemId: menuItem.id,
          plannedQuantity: input.plannedQuantity,
          expectedQuantity: input.expectedQuantity,
          available: input.available,
        },
        update: {
          plannedQuantity: input.plannedQuantity,
          expectedQuantity: input.expectedQuantity,
          available: input.available,
        },
      })
    }

    return tx.serviceSession.findUniqueOrThrow({
      where: { id: service.id },
      include: serviceInclude(),
    })
  })
}

export async function listServices(
  actor: { role: string; restaurantId: string | null },
  filters: { restaurantId?: string; from?: Date; to?: Date } = {},
) {
  if (!['ADMIN', 'KITCHEN'].includes(actor.role)) {
    throw new AppError('FORBIDDEN', 'Accès refusé', 403)
  }
  const restaurantId = filters.restaurantId ?? actor.restaurantId ?? undefined
  if (filters.restaurantId && actor.restaurantId && filters.restaurantId !== actor.restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
  }
  return db.serviceSession.findMany({
    where: {
      restaurantId,
      serviceDate: filters.from || filters.to ? { gte: filters.from, lt: filters.to } : undefined,
    },
    include: serviceInclude(),
    orderBy: [{ serviceDate: 'asc' }, { serviceKey: 'asc' }],
  })
}

export async function publishService(
  actor: { role: string; restaurantId: string | null },
  input: PublishServiceInput,
) {
  const service = await db.serviceSession.findUnique({ where: { id: input.serviceId } })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertAdminRestaurant(actor, service.restaurantId)
  if (service.status === ServiceStatus.CLOSED) {
    throw new AppError('SERVICE_CLOSED', 'Service clôturé', 409)
  }
  if (input.offers.length === 0) throw new AppError('VALIDATION_ERROR', 'Offres manquantes', 422)
  if (new Set(input.offers.map((offer) => offer.mealId)).size !== input.offers.length) {
    throw new AppError('VALIDATION_ERROR', 'Un produit ne peut être publié qu’une fois', 422)
  }

  const result = await db.$transaction(async (tx) => {
    const meals = await tx.meal.findMany({
      where: { id: { in: input.offers.map((offer) => offer.mealId) }, active: true },
    })
    if (meals.length !== input.offers.length) {
      throw new AppError('NOT_FOUND', 'Un produit est introuvable ou désactivé', 404)
    }
    if (meals.some((meal) => meal.restaurantId !== service.restaurantId)) {
      throw new AppError('FORBIDDEN', 'Produit d’un autre restaurant', 403)
    }

    const offers: Array<{ id: string }> = []
    for (const offer of input.offers) {
      const menuItem = await tx.menuItem.upsert({
        where: { mealId_date: { mealId: offer.mealId, date: service.serviceDate } },
        create: {
          id: crypto.randomUUID(),
          mealId: offer.mealId,
          date: service.serviceDate,
          available: offer.available,
          restaurantId: service.restaurantId,
        },
        update: { available: offer.available, restaurantId: service.restaurantId },
      })
      const existing = await tx.serviceOffer.findUnique({
        where: { serviceId_menuItemId: { serviceId: service.id, menuItemId: menuItem.id } },
      })
      if (existing && existing.committedQuantity > offer.plannedQuantity) {
        throw new AppError(
          'PRODUCT_QUOTA_EXHAUSTED',
          'Le nouveau quota est inférieur aux réservations',
          409,
        )
      }
      const saved = existing
        ? await tx.serviceOffer.update({
            where: { id: existing.id },
            data: {
              plannedQuantity: offer.plannedQuantity,
              expectedQuantity: offer.expectedQuantity,
              available: offer.available,
            },
          })
        : await tx.serviceOffer.create({
            data: {
              id: crypto.randomUUID(),
              serviceId: service.id,
              menuItemId: menuItem.id,
              plannedQuantity: offer.plannedQuantity,
              expectedQuantity: offer.expectedQuantity,
              available: offer.available,
            },
          })
      offers.push({ id: saved.id })
    }

    const existingSlots = await tx.slot.findMany({
      where: { restaurantId: service.restaurantId, date: service.serviceDate },
    })
    if (existingSlots.length > 0) {
      await Promise.all(
        existingSlots
          .filter((slot) => !slot.serviceId)
          .map((slot) =>
            tx.slot.update({ where: { id: slot.id }, data: { serviceId: service.id } }),
          ),
      )
    } else {
      await tx.slot.createMany({
        data: defaultSlots(service.serviceKey).map((slot) => ({
          id: crypto.randomUUID(),
          date: service.serviceDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: 40,
          restaurantId: service.restaurantId,
          serviceId: service.id,
        })),
      })
    }

    return tx.serviceSession.update({
      where: { id: service.id },
      data: { status: ServiceStatus.PUBLISHED, bookingClosedAt: null },
      include: serviceInclude(),
    })
  })
  return result
}

/** Saves the offer selection on a draft without making it visible to students. */
export async function attachDraftOffers(
  actor: { role: string; restaurantId: string | null },
  serviceId: string,
  offers: Array<{
    mealId: string
    plannedQuantity: number
    expectedQuantity: number
    available?: boolean
  }>,
) {
  const service = await db.serviceSession.findUnique({ where: { id: serviceId } })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertAdminRestaurant(actor, service.restaurantId)
  if (service.status === ServiceStatus.CLOSED)
    throw new AppError('SERVICE_CLOSED', 'Service clôturé', 409)
  return db.$transaction(async (tx) => {
    const mealIds = offers.map((offer) => offer.mealId)
    if (new Set(mealIds).size !== mealIds.length) {
      throw new AppError('VALIDATION_ERROR', 'Un produit ne peut être publié qu’une fois', 422)
    }
    const meals = await tx.meal.findMany({ where: { id: { in: mealIds }, active: true } })
    if (meals.length !== mealIds.length) throw new AppError('NOT_FOUND', 'Produit introuvable', 404)
    if (meals.some((meal) => meal.restaurantId !== service.restaurantId)) {
      throw new AppError('FORBIDDEN', 'Produit d’un autre restaurant', 403)
    }
    for (const offer of offers) {
      const menuItem = await tx.menuItem.upsert({
        where: { mealId_date: { mealId: offer.mealId, date: service.serviceDate } },
        create: {
          id: crypto.randomUUID(),
          mealId: offer.mealId,
          date: service.serviceDate,
          available: offer.available ?? true,
          restaurantId: service.restaurantId,
        },
        update: { available: offer.available ?? true, restaurantId: service.restaurantId },
      })
      await tx.serviceOffer.upsert({
        where: { serviceId_menuItemId: { serviceId, menuItemId: menuItem.id } },
        create: {
          id: crypto.randomUUID(),
          serviceId,
          menuItemId: menuItem.id,
          plannedQuantity: offer.plannedQuantity,
          expectedQuantity: offer.expectedQuantity,
          available: offer.available ?? true,
        },
        update: {
          plannedQuantity: offer.plannedQuantity,
          expectedQuantity: offer.expectedQuantity,
          available: offer.available ?? true,
        },
      })
    }
    return tx.serviceSession.findUniqueOrThrow({
      where: { id: serviceId },
      include: serviceInclude(),
    })
  })
}

export async function closeService(
  actor: { role: string; restaurantId: string | null },
  input: CloseServiceInput,
) {
  const service = await db.serviceSession.findUnique({ where: { id: input.serviceId } })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertAdminRestaurant(actor, service.restaurantId)
  if (service.status === ServiceStatus.CLOSED) return service
  return db.serviceSession.update({
    where: { id: service.id },
    data: { status: ServiceStatus.CLOSED, closedAt: new Date(), closeReason: input.reason },
    include: serviceInclude(),
  })
}

export async function closeBookings(
  actor: { role: string; restaurantId: string | null },
  serviceId: string,
) {
  const service = await db.serviceSession.findUnique({ where: { id: serviceId } })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertAdminRestaurant(actor, service.restaurantId)
  if (service.status !== ServiceStatus.PUBLISHED) {
    throw new AppError('SERVICE_CLOSED', 'Service non publiable', 409)
  }
  return db.serviceSession.update({
    where: { id: service.id },
    data: { bookingClosedAt: new Date() },
    include: serviceInclude(),
  })
}

export async function assertServiceReservable(
  tx: Prisma.TransactionClient,
  serviceId: string,
  now = new Date(),
) {
  const service = await tx.serviceSession.findUnique({ where: { id: serviceId } })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  if (service.status !== ServiceStatus.PUBLISHED || service.bookingClosedAt) {
    throw new AppError('SERVICE_CLOSED', 'Les réservations de ce service sont fermées', 409)
  }
  if (!isBeforeReservationClosing(now, serviceDateString(service.serviceDate), '18:00', 1)) {
    if (service.reservationClosingAt <= now) {
      throw new AppError('WINDOW_CLOSED', 'Fenêtre de réservation fermée', 409)
    }
  }
  if (service.reservationClosingAt <= now) {
    throw new AppError('WINDOW_CLOSED', 'Fenêtre de réservation fermée', 409)
  }
  return service
}

function serviceDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function unpublishService(
  actor: { role: string; restaurantId: string | null },
  serviceId: string,
) {
  const service = await db.serviceSession.findUnique({
    where: { id: serviceId },
    include: { reservations: { where: { status: { in: ['CONFIRMED', 'PENDING'] } } } },
  })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertAdminRestaurant(actor, service.restaurantId)
  if (service.status !== ServiceStatus.PUBLISHED) {
    throw new AppError('SERVICE_CLOSED', 'Seul un service publié peut être dépublié', 409)
  }
  if (service.reservations.length > 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Impossible de dépublier un service ayant déjà des réservations actives',
      409,
    )
  }
  return db.serviceSession.update({
    where: { id: service.id },
    data: { status: ServiceStatus.DRAFT },
    include: serviceInclude(),
  })
}

export async function deleteDraftService(
  actor: { role: string; restaurantId: string | null },
  serviceId: string,
) {
  const service = await db.serviceSession.findUnique({
    where: { id: serviceId },
    include: { reservations: true },
  })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertAdminRestaurant(actor, service.restaurantId)
  if (service.status !== ServiceStatus.DRAFT) {
    throw new AppError('SERVICE_CLOSED', 'Seul un brouillon peut être supprimé', 409)
  }
  if (service.reservations.length > 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Impossible de supprimer un service contenant des réservations',
      409,
    )
  }
  return db.serviceSession.delete({
    where: { id: service.id },
  })
}

export async function updateServiceDetails(
  actor: { role: string; restaurantId: string | null },
  serviceId: string,
  input: {
    reservationClosingAt?: Date
    offers?: Array<{
      mealId: string
      plannedQuantity: number
      expectedQuantity?: number
      available?: boolean
    }>
  },
) {
  const service = await db.serviceSession.findUnique({
    where: { id: serviceId },
    include: { offers: true },
  })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertAdminRestaurant(actor, service.restaurantId)
  if (service.status === ServiceStatus.CLOSED) {
    throw new AppError('SERVICE_CLOSED', 'Impossible de modifier un service clôturé', 409)
  }

  return db.$transaction(async (tx) => {
    if (input.reservationClosingAt) {
      await tx.serviceSession.update({
        where: { id: serviceId },
        data: { reservationClosingAt: input.reservationClosingAt },
      })
    }

    if (input.offers && input.offers.length > 0) {
      for (const offerInput of input.offers) {
        const menuItem = await tx.menuItem.upsert({
          where: { mealId_date: { mealId: offerInput.mealId, date: service.serviceDate } },
          create: {
            id: crypto.randomUUID(),
            mealId: offerInput.mealId,
            date: service.serviceDate,
            available: offerInput.available ?? true,
            restaurantId: service.restaurantId,
          },
          update: { available: offerInput.available ?? true, restaurantId: service.restaurantId },
        })

        const existing = await tx.serviceOffer.findUnique({
          where: { serviceId_menuItemId: { serviceId, menuItemId: menuItem.id } },
        })

        if (existing && existing.committedQuantity > offerInput.plannedQuantity) {
          throw new AppError(
            'PRODUCT_QUOTA_EXHAUSTED',
            `Le quota (${offerInput.plannedQuantity}) ne peut être inférieur aux réservations déjà engagées (${existing.committedQuantity})`,
            409,
          )
        }

        await tx.serviceOffer.upsert({
          where: { serviceId_menuItemId: { serviceId, menuItemId: menuItem.id } },
          create: {
            id: crypto.randomUUID(),
            serviceId,
            menuItemId: menuItem.id,
            plannedQuantity: offerInput.plannedQuantity,
            expectedQuantity: offerInput.expectedQuantity ?? offerInput.plannedQuantity,
            available: offerInput.available ?? true,
          },
          update: {
            plannedQuantity: offerInput.plannedQuantity,
            expectedQuantity: offerInput.expectedQuantity ?? offerInput.plannedQuantity,
            available: offerInput.available ?? true,
          },
        })
      }
    }

    return tx.serviceSession.findUniqueOrThrow({
      where: { id: serviceId },
      include: serviceInclude(),
    })
  })
}

export async function getServiceOrders(
  actor: { role: string; restaurantId: string | null },
  serviceId: string,
) {
  const service = await db.serviceSession.findUnique({ where: { id: serviceId } })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  if (!['ADMIN', 'KITCHEN'].includes(actor.role)) {
    throw new AppError('FORBIDDEN', 'Accès réservé au personnel', 403)
  }
  if (actor.restaurantId && actor.restaurantId !== service.restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
  }

  return db.reservation.findMany({
    where: { serviceId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      slot: { select: { id: true, startTime: true, endTime: true } },
      menuItem: { include: { meal: true } },
      items: { include: { menuItem: { include: { meal: true } } } },
      allocations: true,
    },
    orderBy: [{ slot: { startTime: 'asc' } }, { createdAt: 'desc' }],
  })
}

export type ServiceOfferWithMeal = Prisma.ServiceOfferGetPayload<{
  include: { menuItem: { include: { meal: true } } }
}>

export function offerForMenuItem(
  offers: ServiceOfferWithMeal[],
  menuItemId: string,
): ServiceOfferWithMeal | undefined {
  return offers.find((offer) => offer.menuItemId === menuItemId)
}

export function selectedOfferInputs(
  main: ServiceOfferInput,
  sides: ServiceOfferInput[],
): ServiceOfferInput[] {
  return [main, ...sides]
}
