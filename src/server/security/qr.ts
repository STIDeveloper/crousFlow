import crypto from 'crypto'

export function generateQrToken(reservationId: string, expiresAt: Date): string {
  const secret = process.env.QR_SECRET || 'secret_for_qr'
  const payloadObj = { id: reservationId, exp: expiresAt.getTime() }
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url')

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const sig = hmac.digest('base64url')

  return `${payload}.${sig}`
}

export function verifyQrToken(token: string): { id: string; exp: number } | null {
  const secret = process.env.QR_SECRET || 'secret_for_qr'
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
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}
