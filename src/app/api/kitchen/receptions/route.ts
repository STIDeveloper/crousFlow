import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { receiveServiceSchema } from '@/lib/schemas/stock'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import { getServiceStock, receiveService } from '@/server/stock/receive'
import { listServices } from '@/server/services/service'
import { z } from 'zod'

const uiReceptionSchema = z.object({
  serviceId: z.string().trim().min(1).optional(),
  serviceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  operationKey: z.string().uuid(),
  lines: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        receivedQuantity: z.number().int().min(0),
        rejectedQuantity: z.number().int().min(0).default(0),
        observation: z.string().trim().max(500).optional(),
        lotReference: z.string().trim().max(128).optional(),
        expiresAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .min(1),
})

function toReceptionLines(service: {
  id: string
  offers: Array<{
    id: string
    physicalQuantity: number
    expectedQuantity: number
    menuItem: { meal: { id: string; name: string; productType: string } }
  }>
}) {
  return {
    serviceId: service.id,
    lines: service.offers.map((offer) => ({
      id: offer.id,
      productId: offer.id,
      mealId: offer.menuItem.meal.id,
      productName: offer.menuItem.meal.name,
      productType: offer.menuItem.meal.productType,
      expectedQuantity: offer.expectedQuantity,
      // The form records the next delivery, while physicalQuantity is the
      // accumulated stock already received for this service.
      receivedQuantity: 0,
      rejectedQuantity: 0,
      acceptedQuantity: 0,
    })),
  }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])
    const params = new URL(request.url).searchParams
    const serviceId = params.get('serviceId')
    if (serviceId)
      return NextResponse.json(toReceptionLines(await getServiceStock(user, serviceId)))
    const date = params.get('date')
    if (!date) throw new AppError('VALIDATION_ERROR', 'serviceId ou date requis', 422)
    const from = new Date(`${date}T00:00:00.000Z`)
    const to = new Date(from)
    to.setUTCDate(to.getUTCDate() + 1)
    const services = await listServices(user, { from, to })
    const service = services.find((candidate) => candidate.status !== 'CLOSED') ?? services[0]
    if (!service) return NextResponse.json({ serviceId: null, lines: [] })
    return NextResponse.json(toReceptionLines(await getServiceStock(user, service.id)))
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
    const parsed = receiveServiceSchema.safeParse(body)
    if (parsed.success)
      return NextResponse.json(await receiveService(user, parsed.data), { status: 201 })

    const uiParsed = uiReceptionSchema.safeParse(body)
    if (!uiParsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Réception invalide', 422, uiParsed.error.flatten())
    }
    let serviceId = uiParsed.data.serviceId
    if (!serviceId && uiParsed.data.serviceDate) {
      const from = new Date(`${uiParsed.data.serviceDate}T00:00:00.000Z`)
      const to = new Date(from)
      to.setUTCDate(to.getUTCDate() + 1)
      const service = (await listServices(user, { from, to })).find(
        (candidate) => candidate.status !== 'CLOSED',
      )
      serviceId = service?.id
    }
    if (!serviceId) throw new AppError('NOT_FOUND', 'Service introuvable pour cette date', 404)
    const stock = await getServiceStock(user, serviceId)
    const lines = uiParsed.data.lines.map((line) => {
      const offer = stock.offers.find(
        (candidate) =>
          candidate.id === line.productId || candidate.menuItem.mealId === line.productId,
      )
      if (!offer) throw new AppError('NOT_FOUND', 'Produit de réception introuvable', 404)
      return {
        offerId: offer.id,
        deliveredQuantity: line.receivedQuantity,
        rejectedQuantity: line.rejectedQuantity,
        observation: line.observation,
        lot: line.lotReference,
        bestBefore: line.expiresAt,
      }
    })
    return NextResponse.json(
      await receiveService(user, { serviceId, operationKey: uiParsed.data.operationKey, lines }),
      { status: 201 },
    )
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
