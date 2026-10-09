import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import {
  cancelShortageReservation,
  getShortageReservations,
  substituteShortageItem,
} from '@/server/stock/shortage'
import { z } from 'zod'

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('substitute'),
    reservationId: z.string().min(1),
    substituteMealId: z.string().min(1),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal('cancel'),
    reservationId: z.string().min(1),
    reason: z.string().optional(),
  }),
])

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const date =
      new URL(request.url).searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
    const result = await getShortageReservations(user, date)
    return NextResponse.json(result)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const body = await readJsonBody(request)
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Action de traitement de rupture invalide',
        422,
        parsed.error.flatten(),
      )
    }

    if (parsed.data.action === 'substitute') {
      const res = await substituteShortageItem(user, {
        reservationId: parsed.data.reservationId,
        substituteMealId: parsed.data.substituteMealId,
        reason: parsed.data.reason,
      })
      return NextResponse.json(res)
    } else {
      const res = await cancelShortageReservation(user, {
        reservationId: parsed.data.reservationId,
        reason: parsed.data.reason,
      })
      return NextResponse.json(res)
    }
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
