import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { adjustStockSchema } from '@/lib/schemas/stock'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import { adjustStock } from '@/server/stock/receive'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const parsed = adjustStockSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Ajustement invalide', 422, parsed.error.flatten())
    }
    return NextResponse.json(await adjustStock(user, parsed.data))
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
