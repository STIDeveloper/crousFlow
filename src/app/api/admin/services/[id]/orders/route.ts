import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { toHttpResponse } from '@/server/errors'
import { getServiceOrders } from '@/server/services/service'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN', 'KITCHEN'])
    const { id } = await context.params
    const orders = await getServiceOrders(user, id)
    return NextResponse.json(orders)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
