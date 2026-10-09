import { NextRequest, NextResponse } from 'next/server'
import { toHttpResponse, AppError } from '@/server/errors'
import { createReservation } from '@/server/reservations/create'
import { createReservationSchema } from '@/lib/schemas/reservation'
import { requireSessionUser } from '@/server/auth/session'
import { checkRateLimit } from '@/server/rate-limit'
import { readJsonBody } from '@/server/http/body'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    if (user.role !== 'STUDENT') throw new AppError('FORBIDDEN', 'Réservé aux étudiants', 403)
    checkRateLimit(`create_res_${user.id}`, 10, 60000)

    const body = await readJsonBody(req)

    const parsed = createReservationSchema.safeParse(body)
    if (!parsed.success)
      throw new AppError('VALIDATION_ERROR', 'Données invalides', 422, parsed.error)

    const result = await createReservation(user.id, parsed.data)
    return NextResponse.json(result)
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
