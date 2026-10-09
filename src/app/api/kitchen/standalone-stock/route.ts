import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import { listStandaloneProducts, recordStandaloneSale } from '@/server/stock/standalone'
import { z } from 'zod'

const saleSchema = z.object({
  mealId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
})

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const date =
      new URL(request.url).searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
    const products = await listStandaloneProducts(user, date)
    return NextResponse.json(products)
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
    const parsed = saleSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Saisie de vente directe invalide',
        422,
        parsed.error.flatten(),
      )
    }
    const result = await recordStandaloneSale(user, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
