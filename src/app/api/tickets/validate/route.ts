import { NextRequest, NextResponse } from 'next/server'
import { toHttpResponse, AppError } from '@/server/errors'
import { validateTicket } from '@/server/reservations/validate'
import { validateTicketSchema } from '@/lib/schemas/ticket'
import { requireSessionUser, requireRole } from '@/server/auth/session'
import { checkRateLimit } from '@/server/rate-limit'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    checkRateLimit(`validate_ticket_${user.id}`, 30, 60000)

    const body = await req.json().catch(() => null)
    if (!body) throw new AppError('BAD_JSON', 'JSON malformé', 400)

    const parsed = validateTicketSchema.safeParse(body)
    if (!parsed.success)
      throw new AppError('VALIDATION_ERROR', 'Données invalides', 422, parsed.error)

    const result = await validateTicket(user.id, parsed.data.token)
    return NextResponse.json(result)
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
