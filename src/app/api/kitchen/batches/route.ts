import { NextRequest, NextResponse } from 'next/server'
import { parseDateQuery } from '@/server/http/query'
import { toHttpResponse, AppError } from '@/server/errors'
import { requireSessionUser, requireRole } from '@/server/auth/session'
import { patchBatchSchema } from '@/lib/schemas/ia'
import db from '@/server/db'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])

    const { searchParams } = new URL(req.url)
    const date = parseDateQuery(searchParams.get('date')) ?? new Date()

    const batches = await db.kitchenBatch.findMany({
      where: { date },
      include: { meal: true },
    })

    return NextResponse.json(batches)
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])

    const body = await req.json().catch(() => null)
    if (!body) throw new AppError('BAD_JSON', 'JSON malformé', 400)

    const parsed = patchBatchSchema.safeParse(body)
    if (!parsed.success)
      throw new AppError('VALIDATION_ERROR', 'Données invalides', 422, parsed.error)

    const batch = await db.kitchenBatch.findUnique({ where: { id: parsed.data.id } })
    if (!batch) throw new AppError('NOT_FOUND', 'Batch introuvable', 404)

    const updated = await db.kitchenBatch.update({
      where: { id: batch.id },
      data: { preparedCount: parsed.data.preparedCount },
    })

    return NextResponse.json(updated)
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
