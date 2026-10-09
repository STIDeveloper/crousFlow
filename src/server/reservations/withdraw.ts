import crypto from 'node:crypto'
import { ReservationStatus, ServiceStatus, StockMovementKind } from '@prisma/client'
import db from '@/server/db'
import { AppError } from '@/server/errors'
import { verifyQrToken } from '@/server/security/qr'
import { getPickupWindow } from './time'
import { isTicketShortCode, ticketShortCode } from '@/lib/ticket-code'

type Actor = { id: string; role: string; restaurantId: string | null }

async function resolveReservation(txOrDb: { reservation: typeof db.reservation }, code: string) {
  const clean = code.trim()
  if (!clean) throw new AppError('QR_INVALID', 'Code de ticket vide', 400)

  // 1. Décodage du QR token signé (HMAC)
  const decoded = verifyQrToken(clean)
  if (decoded && decoded.id) {
    if (decoded.exp < Date.now()) {
      throw new AppError('QR_INVALID', 'QR Code expiré', 400)
    }
    const found = await txOrDb.reservation.findUnique({
      where: { id: decoded.id },
      include: {
        slot: true,
        service: {
          include: {
            offers: { include: { menuItem: { include: { meal: true } } } },
          },
        },
        menuItem: { include: { meal: true } },
        items: { include: { menuItem: { include: { meal: true } } } },
        allocations: { include: { offer: { include: { menuItem: { include: { meal: true } } } } } },
      },
    })
    if (!found) throw new AppError('NOT_FOUND', 'Réservation introuvable', 404)
    return found
  }

  // 2. Recherche directe par qrToken exact ou identifiant (tolérant casse)
  const cleanLower = clean.toLowerCase()
  const cleanUpper = clean.toUpperCase()

  const found = await txOrDb.reservation.findFirst({
    where: {
      OR: [{ qrToken: clean }, { qrToken: cleanLower }, { id: clean }, { id: cleanLower }],
    },
    include: {
      slot: true,
      service: {
        include: {
          offers: { include: { menuItem: { include: { meal: true } } } },
        },
      },
      menuItem: { include: { meal: true } },
      items: { include: { menuItem: { include: { meal: true } } } },
      allocations: { include: { offer: { include: { menuItem: { include: { meal: true } } } } } },
    },
  })
  if (found) return found

  // 3. Code court affiché sous le QR (6 caractères). Aucun fragment partiel n'est accepté.
  if (isTicketShortCode(clean)) {
    const candidates = await txOrDb.reservation.findMany({
      where: { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CONSUMED] } },
      select: { id: true },
    })
    const matches = candidates.filter((r) => ticketShortCode(r.id) === cleanUpper)
    if (matches.length > 1) {
      throw new AppError('QR_INVALID', 'Code ambigu : scannez le QR code du ticket', 400)
    }
    if (matches.length === 1) {
      return txOrDb.reservation.findUniqueOrThrow({
        where: { id: matches[0].id },
        include: {
          slot: true,
          service: {
            include: {
              offers: { include: { menuItem: { include: { meal: true } } } },
            },
          },
          menuItem: { include: { meal: true } },
          items: { include: { menuItem: { include: { meal: true } } } },
          allocations: {
            include: { offer: { include: { menuItem: { include: { meal: true } } } } },
          },
        },
      })
    }
  }

  // Rejette les QR falsifiés ou références inexistantes
  throw new AppError('QR_INVALID', 'QR Code ou code ticket introuvable', 400)
}

function assertKitchen(actor: Actor, restaurantId: string | null): void {
  if (!['KITCHEN', 'ADMIN'].includes(actor.role)) {
    throw new AppError('FORBIDDEN', 'Accès réservé au personnel', 403)
  }
  // Tolère un restaurantId non renseigné ou vérifie la concordance si les deux sont définis
  if (actor.restaurantId && restaurantId && actor.restaurantId !== restaurantId) {
    throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
  }
}

export async function inspectTicket(actor: Actor, token: string) {
  const reservation = await resolveReservation(db, token)
  assertKitchen(actor, reservation.restaurantId)
  const pickupWindow = getPickupWindow(reservation.slot)
  return {
    id: reservation.id,
    status: reservation.status,
    fulfillmentStatus: reservation.fulfillmentStatus,
    paymentStatus: reservation.paymentStatus,
    priceCents: reservation.priceCents,
    serviceId: reservation.serviceId,
    slot: reservation.slot,
    // Keep the nested shape used by the kitchen screen while exposing the
    // compact `main`/`items` fields for API consumers that only need labels.
    menuItem: { meal: reservation.menuItem.meal },
    main: reservation.menuItem.meal,
    items: reservation.items.map((item) => ({
      kind: item.kind,
      meal: item.menuItem.meal,
      menuItem: { meal: item.menuItem.meal },
    })),
    allocatedProducts: reservation.allocations.map((allocation) => allocation.offer.menuItem.meal),
    canWithdraw:
      reservation.status === ReservationStatus.CONFIRMED &&
      (!reservation.service || reservation.fulfillmentStatus === 'READY') &&
      Boolean(pickupWindow),
  }
}

export async function withdrawTicket(actor: Actor, token: string, operationKey: string) {
  return db.$transaction(async (tx) => {
    const reservation = await resolveReservation(tx, token)
    assertKitchen(actor, reservation.restaurantId)

    if (reservation.status === ReservationStatus.CONSUMED) {
      if (reservation.withdrawalOperationKey === operationKey) return reservation
      throw new AppError('ALREADY_CONSUMED', 'Ce ticket a déjà été consommé', 409)
    }
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new AppError('NOT_FOUND', 'Ticket invalide ou non confirmé', 404)
    }
    const pickupWindow = getPickupWindow(reservation.slot)
    const now = new Date()
    // En production stricte et hors démo, refuser uniquement si le créneau est dépassé avec le délai de grâce
    if (
      pickupWindow &&
      process.env.NODE_ENV === 'production' &&
      !process.env.CROUSFLOW_DEMO &&
      now > pickupWindow.expiresAt
    ) {
      throw new AppError('WINDOW_CLOSED', 'Ticket hors créneau de retrait', 409)
    }

    if (reservation.serviceId) {
      if (!reservation.service || reservation.service.status === ServiceStatus.CLOSED) {
        throw new AppError('SERVICE_CLOSED', 'Service clôturé', 409)
      }
      if (reservation.fulfillmentStatus !== 'READY' || reservation.allocations.length === 0) {
        throw new AppError('STOCK_SHORTAGE', 'Commande non disponible en totalité', 409)
      }
      for (const allocation of reservation.allocations) {
        const updated = await tx.serviceOffer.updateMany({
          where: {
            id: allocation.offerId,
            physicalQuantity: { gte: allocation.quantity },
            allocatedQuantity: { gte: allocation.quantity },
          },
          data: {
            physicalQuantity: { decrement: allocation.quantity },
            allocatedQuantity: { decrement: allocation.quantity },
          },
        })
        if (updated.count === 0) {
          throw new AppError('STOCK_SHORTAGE', 'Stock disponible incohérent', 409)
        }
        await tx.stockMovement.create({
          data: {
            id: crypto.randomUUID(),
            serviceId: reservation.serviceId,
            restaurantId: reservation.restaurantId ?? reservation.service.restaurantId,
            offerId: allocation.offerId,
            actorId: actor.id,
            kind: StockMovementKind.SERVED,
            quantity: -allocation.quantity,
            operationKey,
            referenceId: reservation.id,
            reason: 'Remise après paiement Izly constaté sur place',
          },
        })
      }
      await tx.stockAllocation.deleteMany({ where: { reservationId: reservation.id } })
    }

    const updated = await tx.reservation.updateMany({
      where: { id: reservation.id, status: ReservationStatus.CONFIRMED },
      data: {
        status: ReservationStatus.CONSUMED,
        consumedAt: now,
        activeKey: null,
        paymentStatus: 'OBSERVED_ON_SITE',
        paymentObservedAt: now,
        paymentObservedById: actor.id,
        withdrawalOperationKey: operationKey,
        withdrawnAt: now,
        withdrawnById: actor.id,
        fulfillmentStatus: 'READY',
      },
    })
    if (updated.count === 0)
      throw new AppError('ALREADY_CONSUMED', 'Ce ticket a déjà été consommé', 409)
    return tx.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
      include: { items: true },
    })
  })
}

export async function validateTicket(
  actor: Actor,
  token: string,
  operationKey: string = crypto.randomUUID(),
) {
  return withdrawTicket(actor, token, operationKey)
}
