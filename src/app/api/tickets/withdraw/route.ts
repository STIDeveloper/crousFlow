import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { withdrawTicketSchema } from '@/lib/schemas/ticket'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import { withdrawTicket } from '@/server/reservations/withdraw'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const parsed = withdrawTicketSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Retrait invalide', 422, parsed.error.flatten())
    }
    return NextResponse.json(
      await withdrawTicket(user, parsed.data.token, parsed.data.operationKey),
    )
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
