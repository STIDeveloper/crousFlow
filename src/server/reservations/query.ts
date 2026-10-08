import db from '../db'
import { AppError } from '../errors'

export async function getMyReservations(userId: string) {
  return db.reservation.findMany({
    where: { userId },
    include: {
      slot: true,
      menuItem: { include: { meal: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getReservationById(userId: string, id: string) {
  const res = await db.reservation.findUnique({
    where: { id },
    include: { slot: true, menuItem: { include: { meal: true } } },
  })
  if (!res) throw new AppError('NOT_FOUND', 'Réservation introuvable', 404)
  if (res.userId !== userId) throw new AppError('FORBIDDEN', 'Non autorisé', 403)
  return res
}
