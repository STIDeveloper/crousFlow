import db from '../db'
import { AppError } from '../errors'
import { verifyQrToken } from '../security/qr'

export async function validateTicket(kitchenUserId: string, token: string) {
  const decoded = verifyQrToken(token)
  if (!decoded) {
    throw new AppError('QR_INVALID', 'QR Code invalide', 400)
  }

  if (decoded.exp < Date.now()) {
    throw new AppError('QR_INVALID', 'QR Code expiré', 400)
  }

  const res = await db.reservation.findUnique({ where: { id: decoded.id } })
  if (!res) throw new AppError('NOT_FOUND', 'Réservation introuvable', 404)

  if (res.status === 'CONSUMED') {
    throw new AppError('ALREADY_CONSUMED', 'Ce ticket a déjà été consommé', 409)
  }

  if (res.status !== 'CONFIRMED') {
    throw new AppError('NOT_FOUND', 'Ticket invalide ou non confirmé', 404)
  }

  return db.reservation.update({
    where: { id: res.id },
    data: {
      status: 'CONSUMED',
      consumedAt: new Date(),
      activeKey: null,
    },
  })
}
