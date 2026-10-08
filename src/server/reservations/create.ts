import db from '../db'
import { AppError } from '../errors'
import { generateQrToken } from '../security/qr'
import { Prisma } from '@prisma/client'
import type { CreateReservationInput } from '@/lib/schemas/reservation'
import crypto from 'crypto'

export async function createReservation(userId: string, input: CreateReservationInput) {
  const slot = await db.slot.findUnique({ where: { id: input.slotId } })
  if (!slot) throw new AppError('NOT_FOUND', 'Créneau introuvable', 404)

  // 1. Vérifier la fenêtre de réservation
  if (slot.date.getTime() < Date.now()) {
    throw new AppError('WINDOW_CLOSED', 'Fenêtre de réservation fermée', 409)
  }

  // Idéalement vérifier maxPerDay et maxPerWeek ici... (simplifié pour l'exercice selon l'énoncé de la tâche)

  try {
    const result = await db.$transaction(async (tx) => {
      // 2.c. Idempotence: vérification préalable
      const existing = await tx.reservation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      })
      if (existing) return { reservation: existing, qrToken: existing.qrToken }

      // 2.a. UPDATE conditionnel pour réserver la place (jamais "lire puis écrire")
      const updatedSlot = await tx.slot.updateMany({
        where: {
          id: input.slotId,
          reservedCount: { lt: slot.capacity },
        },
        data: { reservedCount: { increment: 1 } },
      })

      if (updatedSlot.count === 0) {
        throw new AppError('SLOT_FULL', 'Le créneau est complet', 409)
      }

      // 2.b. INSERT Reservation avec activeKey
      const activeKey = `${userId}-${input.slotId}-${input.menuItemId}`
      const newId = crypto.randomUUID()
      const expiration = new Date(slot.date.getTime() + 86400000) // 1 jour plus tard
      const tempToken = generateQrToken(newId, expiration)

      const reservation = await tx.reservation.create({
        data: {
          id: newId,
          userId,
          slotId: input.slotId,
          menuItemId: input.menuItemId,
          idempotencyKey: input.idempotencyKey,
          status: 'CONFIRMED',
          activeKey,
          qrToken: tempToken,
        },
      })

      return { reservation, qrToken: tempToken }
    })

    return result
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('DUPLICATE_RESERVATION', 'Réservation déjà existante (doublon)', 409)
    }
    throw err
  }
}
