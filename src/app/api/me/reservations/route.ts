import { NextResponse } from 'next/server'
import { toHttpResponse } from '@/server/errors'
import { getMyReservations } from '@/server/reservations/query'
import { requireSessionUser } from '@/server/auth/session'
import crypto from 'crypto'

export async function GET() {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    const result = await getMyReservations(user.id)
    return NextResponse.json(result)
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
