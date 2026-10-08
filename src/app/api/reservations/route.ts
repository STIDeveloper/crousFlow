import { NextRequest, NextResponse } from 'next/server'
import { toHttpResponse, AppError } from '@/server/errors'
import { createReservation } from '@/server/reservations/create'
import { createReservationSchema } from '@/lib/schemas/reservation'
import { requireSessionUser } from '@/server/auth/session'
import { checkRateLimit } from '@/server/rate-limit'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    checkRateLimit(`create_res_${user.id}`, 10, 60000)

    const body = await req.json().catch(() => null)
    if (!body) throw new AppError('BAD_JSON', 'JSON malformé', 400)

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
