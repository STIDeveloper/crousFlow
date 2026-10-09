import crypto from 'node:crypto'
import { Prisma, ServiceStatus, StockMovementKind } from '@prisma/client'
import db from '@/server/db'
import { AppError } from '@/server/errors'
import type { AdjustStockInput, ReceiveServiceInput } from '@/lib/schemas/stock'

type Actor = { id: string; role: string; restaurantId: string | null }

function assertStaff(actor: Actor, restaurantId: string): void {
  if (!['KITCHEN', 'ADMIN'].includes(actor.role)) {
    throw new AppError('FORBIDDEN', 'Accès réservé au personnel', 403)
  }
  if (actor.restaurantId && actor.restaurantId !== restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
  }
}

function stableHash(value: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

type Tx = Prisma.TransactionClient

type Offer = Prisma.ServiceOfferGetPayload<{
  include: { menuItem: { include: { meal: true } } }
}>

async function recalculateAllocations(tx: Tx, serviceId: string): Promise<void> {
  const service = await tx.serviceSession.findUnique({
    where: { id: serviceId },
    include: {
      offers: { include: { menuItem: { include: { meal: true } } } },
      reservations: {
        where: { status: { in: ['CONFIRMED', 'PENDING'] } },
        include: { items: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
  })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)

  await tx.stockAllocation.deleteMany({ where: { serviceId } })
  await tx.serviceOffer.updateMany({ where: { serviceId }, data: { allocatedQuantity: 0 } })

  const offers = new Map(service.offers.map((offer) => [offer.id, offer]))
  const offerByMenuItem = new Map(service.offers.map((offer) => [offer.menuItemId, offer]))
  const hasReceivedPhysicalStock = service.offers.some((offer) => offer.physicalQuantity > 0)
  const allocatedByOffer = new Map<string, number>()

  for (const reservation of service.reservations) {
    const selectedIds = [
      ...(reservation.primaryOfferId ? [reservation.primaryOfferId] : []),
      ...reservation.items.map(
        (item) => item.serviceOfferId ?? offerByMenuItem.get(item.menuItemId)?.id,
      ),
    ].filter((id): id is string => Boolean(id))
    const uniqueIds = [...new Set(selectedIds)]
    const selectedOffers = uniqueIds
      .map((id) => offers.get(id))
      .filter((offer): offer is Offer => Boolean(offer))
    const complete =
      uniqueIds.length > 0 &&
      selectedOffers.length === uniqueIds.length &&
      selectedOffers.every((offer) => {
        if (!offer.available) return false
        const currentlyAllocated = allocatedByOffer.get(offer.id) ?? 0
        return offer.physicalQuantity - currentlyAllocated >= 1
      })

    if (!complete) {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { fulfillmentStatus: hasReceivedPhysicalStock ? 'BLOCKED' : 'WAITING' },
      })
      continue
    }

    await tx.stockAllocation.createMany({
      data: selectedOffers.map((offer) => ({
        id: crypto.randomUUID(),
        serviceId,
        restaurantId: service.restaurantId,
        reservationId: reservation.id,
        offerId: offer.id,
        quantity: 1,
      })),
    })
    for (const offer of selectedOffers) {
      const next = (allocatedByOffer.get(offer.id) ?? 0) + 1
      allocatedByOffer.set(offer.id, next)
      await tx.serviceOffer.update({
        where: { id: offer.id },
        data: { allocatedQuantity: next },
      })
    }
    await tx.reservation.update({
      where: { id: reservation.id },
      data: { fulfillmentStatus: 'READY' },
    })
  }
}

export async function receiveService(actor: Actor, input: ReceiveServiceInput) {
  const hash = stableHash(input)
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.reception.findUnique({
      where: { operationKey: input.operationKey },
      include: { lines: true },
    })
    if (existing) {
      if (existing.actorId !== actor.id || existing.payloadHash !== hash) {
        throw new AppError('IDEMPOTENCY_CONFLICT', 'Clé de réception déjà utilisée', 409)
      }
      return existing
    }

    const service = await tx.serviceSession.findUnique({
      where: { id: input.serviceId },
      include: { offers: true },
    })
    if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
    assertStaff(actor, service.restaurantId)
    if (service.status === ServiceStatus.CLOSED) {
      throw new AppError('SERVICE_CLOSED', 'Service clôturé', 409)
    }

    const offerMap = new Map(service.offers.map((offer) => [offer.id, offer]))
    if (new Set(input.lines.map((line) => line.offerId)).size !== input.lines.length) {
      throw new AppError('VALIDATION_ERROR', 'Une offre ne peut apparaître qu’une fois', 422)
    }
    for (const line of input.lines) {
      if (!offerMap.has(line.offerId)) {
        throw new AppError('FORBIDDEN', 'Offre d’un autre service', 403)
      }
    }

    const reception = await tx.reception.create({
      data: {
        id: crypto.randomUUID(),
        serviceId: service.id,
        restaurantId: service.restaurantId,
        actorId: actor.id,
        operationKey: input.operationKey,
        payloadHash: hash,
        observation: input.observation,
        lines: {
          create: input.lines.map((line) => ({
            id: crypto.randomUUID(),
            offerId: line.offerId,
            deliveredQuantity: line.deliveredQuantity,
            rejectedQuantity: line.rejectedQuantity,
            acceptedQuantity: line.deliveredQuantity - line.rejectedQuantity,
            lot: line.lot,
            bestBefore: line.bestBefore ? new Date(`${line.bestBefore}T00:00:00.000Z`) : undefined,
            observation: line.observation,
          })),
        },
      },
      include: { lines: true },
    })

    for (const line of input.lines) {
      const accepted = line.deliveredQuantity - line.rejectedQuantity
      if (accepted > 0) {
        await tx.serviceOffer.update({
          where: { id: line.offerId },
          data: { physicalQuantity: { increment: accepted } },
        })
        await tx.stockMovement.create({
          data: {
            id: crypto.randomUUID(),
            serviceId: service.id,
            restaurantId: service.restaurantId,
            offerId: line.offerId,
            actorId: actor.id,
            kind: StockMovementKind.RECEIPT,
            quantity: accepted,
            operationKey: input.operationKey,
            referenceId: reception.id,
            reason: 'Réception acceptée',
          },
        })
      }
    }
    await recalculateAllocations(tx, service.id)
    return reception
  })
  return result
}

export async function adjustStock(actor: Actor, input: AdjustStockInput) {
  return db.$transaction(async (tx) => {
    const duplicate = await tx.stockMovement.findFirst({
      where: { operationKey: input.operationKey, kind: StockMovementKind.ADJUSTMENT },
    })
    if (duplicate) {
      if (duplicate.actorId !== actor.id) {
        throw new AppError('IDEMPOTENCY_CONFLICT', 'Clé d’ajustement déjà utilisée', 409)
      }
      return duplicate
    }
    const offer = await tx.serviceOffer.findUnique({
      where: { id: input.offerId },
      include: { service: true },
    })
    if (!offer) throw new AppError('NOT_FOUND', 'Offre introuvable', 404)
    assertStaff(actor, offer.service.restaurantId)
    if (offer.service.status === ServiceStatus.CLOSED) {
      throw new AppError('SERVICE_CLOSED', 'Service clôturé', 409)
    }
    const nextPhysical = offer.physicalQuantity + input.quantityDelta
    if (nextPhysical < offer.allocatedQuantity || nextPhysical < 0) {
      throw new AppError('STOCK_SHORTAGE', 'Ajustement incompatible avec les allocations', 409)
    }
    const movement = await tx.stockMovement.create({
      data: {
        id: crypto.randomUUID(),
        serviceId: offer.serviceId,
        restaurantId: offer.service.restaurantId,
        offerId: offer.id,
        actorId: actor.id,
        kind: StockMovementKind.ADJUSTMENT,
        quantity: input.quantityDelta,
        operationKey: input.operationKey,
        reason: input.reason,
      },
    })
    await tx.serviceOffer.update({
      where: { id: offer.id },
      data: { physicalQuantity: nextPhysical },
    })
    await recalculateAllocations(tx, offer.serviceId)
    return movement
  })
}

export async function getServiceStock(actor: Actor, serviceId: string) {
  const service = await db.serviceSession.findUnique({
    where: { id: serviceId },
    include: {
      offers: { include: { menuItem: { include: { meal: true } } }, orderBy: { createdAt: 'asc' } },
      receptions: { include: { lines: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
  assertStaff(actor, service.restaurantId)
  return service
}

export { recalculateAllocations }
