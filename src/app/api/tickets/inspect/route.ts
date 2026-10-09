import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { validateTicketSchema } from '@/lib/schemas/ticket'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import { inspectTicket } from '@/server/reservations/withdraw'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const parsed = validateTicketSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'QR invalide', 422, parsed.error.flatten())
    }
    return NextResponse.json(await inspectTicket(user, parsed.data.token))
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const token = new URL(request.url).searchParams.get('token')
    const parsed = validateTicketSchema.safeParse({ token })
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'QR invalide', 422, parsed.error.flatten())
    }
    return NextResponse.json(await inspectTicket(user, parsed.data.token))
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
