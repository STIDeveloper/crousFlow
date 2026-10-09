import crypto from 'crypto'
import { AppError } from '../errors'

type QrPayload = { id: string; exp: number }

function getQrSecret(): string {
  const secret = process.env.QR_SECRET
  if (!secret || secret.length < 32) {
    throw new AppError('SERVICE_UNAVAILABLE', 'La signature des tickets n’est pas configurée', 503)
  }
  return secret
}

export function generateQrToken(reservationId: string, expiresAt: Date): string {
  const secret = getQrSecret()
  const payloadObj = { id: reservationId, exp: expiresAt.getTime() }
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url')

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const sig = hmac.digest('base64url')

  return `${payload}.${sig}`
}

export function verifyQrToken(token: string): QrPayload | null {
  const secret = getQrSecret()
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [payload, sig] = parts

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSig = hmac.digest('base64url')

  if (expectedSig.length !== sig.length) return null

  const isValid = crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))
  if (!isValid) return null

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      typeof (decoded as QrPayload).id !== 'string' ||
      typeof (decoded as QrPayload).exp !== 'number'
    ) {
      return null
    }
    return decoded as QrPayload
  } catch {
    return null
  }
}
