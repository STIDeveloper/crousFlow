import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { toHttpResponse } from '@/server/errors'
import { listServices } from '@/server/services/service'

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const params = new URL(request.url).searchParams
    const date = params.get('date')
    const from = date ? new Date(`${date}T00:00:00.000Z`) : undefined
    const to = date ? new Date(`${date}T00:00:00.000Z`) : undefined
    if (to) to.setUTCDate(to.getUTCDate() + 1)
    return NextResponse.json(
      await listServices(user, { restaurantId: params.get('restaurantId') ?? undefined, from, to }),
    )
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
