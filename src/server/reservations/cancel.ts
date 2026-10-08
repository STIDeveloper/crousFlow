import db from '../db'
import { AppError } from '../errors'

export async function cancelReservation(userId: string, reservationId: string) {
  return db.$transaction(async (tx) => {
    const res = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: { slot: true },
    })

    if (!res) throw new AppError('NOT_FOUND', 'Réservation introuvable', 404)
    if (res.userId !== userId) throw new AppError('FORBIDDEN', 'Non autorisé', 403)

    // Idempotent
    if (res.status === 'CANCELLED') return res

    if (res.status !== 'CONFIRMED' && res.status !== 'PENDING') {
      throw new AppError('ALREADY_CONSUMED', "Impossible d'annuler cette réservation", 409)
    }

    // Vérifier la fenêtre d'annulation (simplifié: vérifier qu'il est dans le futur)
    if (res.slot.date.getTime() < Date.now()) {
      throw new AppError('WINDOW_CLOSED', "Fenêtre d'annulation fermée", 409)
    }

    const updatedRes = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: 'CANCELLED',
        activeKey: null,
      },
    })

    await tx.slot.update({
      where: { id: res.slotId },
      data: { reservedCount: { decrement: 1 } },
    })

    return updatedRes
  })
}
