import { NextRequest, NextResponse } from 'next/server'
import { toHttpResponse, AppError } from '@/server/errors'
import { cancelReservation } from '@/server/reservations/cancel'
import { requireSessionUser } from '@/server/auth/session'
import crypto from 'crypto'

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    const { id } = await context.params
    if (!id) throw new AppError('VALIDATION_ERROR', 'ID manquant', 422)

    const result = await cancelReservation(user.id, id)
    return NextResponse.json(result)
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
