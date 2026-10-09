import db from '../db'
import { AppError } from '../errors'
import { cancellationDeadline } from './time'
import { recalculateAllocations } from '@/server/stock/receive'

export async function cancelReservation(userId: string, reservationId: string) {
  return db.$transaction(async (tx) => {
    const res = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: { slot: true, items: true },
    })

    if (!res) throw new AppError('NOT_FOUND', 'Réservation introuvable', 404)
    if (res.userId !== userId) throw new AppError('FORBIDDEN', 'Non autorisé', 403)

    // Idempotent
    if (res.status === 'CANCELLED') return res

    if (res.status !== 'CONFIRMED' && res.status !== 'PENDING') {
      throw new AppError('ALREADY_CONSUMED', "Impossible d'annuler cette réservation", 409)
    }

    if (Date.now() > cancellationDeadline(res.slot.date).getTime()) {
      throw new AppError('WINDOW_CLOSED', "Fenêtre d'annulation fermée", 409)
    }

    const cancelled = await tx.reservation.updateMany({
      where: {
        id: reservationId,
        userId,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      data: {
        status: 'CANCELLED',
        activeKey: null,
        socialQuotaKey: null,
      },
    })
    if (cancelled.count === 0) {
      throw new AppError('ALREADY_CONSUMED', "Impossible d'annuler cette réservation", 409)
    }

    await tx.slot.updateMany({
      where: { id: res.slotId, reservedCount: { gt: 0 } },
      data: { reservedCount: { decrement: 1 } },
    })

    if (res.serviceId) {
      const offerIds = [
        ...(res.primaryOfferId ? [res.primaryOfferId] : []),
        ...res.items.map((item) => item.serviceOfferId).filter((id): id is string => Boolean(id)),
      ]
      for (const offerId of new Set(offerIds)) {
        await tx.serviceOffer.updateMany({
          where: { id: offerId, committedQuantity: { gt: 0 } },
          data: { committedQuantity: { decrement: 1 } },
        })
      }
      await recalculateAllocations(tx, res.serviceId)
    }

    return tx.reservation.findUniqueOrThrow({ where: { id: reservationId } })
  })
}
