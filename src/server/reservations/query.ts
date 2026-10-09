import db from '../db'
import { AppError } from '../errors'
import { getPickupWindow } from './time'

export async function getMyReservations(userId: string) {
  const now = new Date()
  const activeReservations = await db.reservation.findMany({
    where: { userId, status: 'CONFIRMED' },
    select: {
      id: true,
      slot: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  })

  const expiredReservationIds = activeReservations
    .filter((reservation) => {
      const pickupWindow = getPickupWindow(reservation.slot)
      return pickupWindow !== null && pickupWindow.expiresAt < now
    })
    .map((reservation) => reservation.id)

  if (expiredReservationIds.length > 0) {
    await db.reservation.updateMany({
      where: {
        id: { in: expiredReservationIds },
        userId,
        status: 'CONFIRMED',
      },
      data: {
        status: 'NO_SHOW',
        activeKey: null,
      },
    })
  }

  return db.reservation.findMany({
    where: { userId },
    include: {
      slot: true,
      menuItem: { include: { meal: true } },
      items: { include: { menuItem: { include: { meal: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getReservationById(userId: string, id: string) {
  const res = await db.reservation.findUnique({
    where: { id },
    include: {
      slot: true,
      menuItem: { include: { meal: true } },
      items: { include: { menuItem: { include: { meal: true } } } },
    },
  })
  if (!res) throw new AppError('NOT_FOUND', 'Réservation introuvable', 404)
  if (res.userId !== userId) throw new AppError('FORBIDDEN', 'Non autorisé', 403)
  return res
}
