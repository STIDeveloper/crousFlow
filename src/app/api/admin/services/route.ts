import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { serviceDraftSchema } from '@/lib/schemas/service'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import db from '@/server/db'
import { attachDraftOffers, createServiceDraft, listServices } from '@/server/services/service'
import { serviceDateSchema, serviceKeySchema } from '@/lib/schemas/service'
import { z } from 'zod'

const adminServiceOfferSchema = z
  .object({
    productId: z.string().trim().min(1).max(128).optional(),
    mealId: z.string().trim().min(1).max(128).optional(),
    plannedQuantity: z.number().int().min(0).max(100_000),
    expectedQuantity: z.number().int().min(0).max(100_000),
    available: z.boolean().default(true),
  })
  .refine((offer) => Boolean(offer.productId ?? offer.mealId), 'Produit requis')

const adminServiceCreateSchema = z.object({
  restaurantId: z.string().trim().min(1).max(128).optional(),
  serviceDate: serviceDateSchema,
  serviceKey: serviceKeySchema,
  reservationClosingTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  reservationClosesAt: z.string().optional(),
  reservationDaysBefore: z.number().int().min(0).max(7).default(1),
  cancellationClosingTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default('18:00'),
  cancellationDaysBefore: z.number().int().min(0).max(7).default(1),
  offers: z.array(adminServiceOfferSchema).min(1).max(500),
})

function toServiceDto<
  T extends {
    reservationClosingAt: Date
    offers: Array<{ menuItem: { meal: { id: string; name: string } }; menuItemId: string }>
  },
>(service: T) {
  return {
    ...service,
    reservationClosesAt: service.reservationClosingAt.toISOString(),
    offers: service.offers.map((offer) => ({
      ...offer,
      productId: offer.menuItem.meal.id,
      productName: offer.menuItem.meal.name,
      meal: offer.menuItem.meal,
    })),
  }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const params = new URL(request.url).searchParams
    const date = params.get('date')
    const from = date ?? params.get('from')
    const to = date
      ? new Date(`${date}T00:00:00.000Z`)
      : params.get('to')
        ? new Date(`${params.get('to')}T00:00:00.000Z`)
        : undefined
    if (date && to instanceof Date) to.setUTCDate(to.getUTCDate() + 1)
    const services = await listServices(user, {
      restaurantId: params.get('restaurantId') ?? undefined,
      from: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      to: to instanceof Date ? to : undefined,
    })
    return NextResponse.json(services.map(toServiceDto))
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const raw = adminServiceCreateSchema.safeParse(await readJsonBody(request))
    if (!raw.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Brouillon de service invalide',
        422,
        raw.error.flatten(),
      )
    }
    const restaurantId =
      raw.data.restaurantId ??
      user.restaurantId ??
      (await db.restaurant.findFirst({ where: { active: true }, orderBy: { createdAt: 'asc' } }))
        ?.id
    if (!restaurantId) throw new AppError('NOT_FOUND', 'Aucun restaurant configuré', 404)
    const closingFromPayload = raw.data.reservationClosesAt?.match(/T(\d{2}:\d{2})/i)?.[1]
    const normalized = serviceDraftSchema.parse({
      restaurantId,
      serviceDate: raw.data.serviceDate,
      serviceKey: raw.data.serviceKey,
      reservationClosingTime: raw.data.reservationClosingTime ?? closingFromPayload ?? '18:00',
      reservationDaysBefore: raw.data.reservationDaysBefore,
      cancellationClosingTime: raw.data.cancellationClosingTime,
      cancellationDaysBefore: raw.data.cancellationDaysBefore,
    })
    const draft = await createServiceDraft(user, normalized)
    const service = await attachDraftOffers(
      user,
      draft.id,
      raw.data.offers.map((offer) => ({
        mealId: offer.mealId ?? offer.productId!,
        plannedQuantity: offer.plannedQuantity,
        expectedQuantity: offer.expectedQuantity,
        available: offer.available,
      })),
    )
    return NextResponse.json(toServiceDto(service), { status: 201 })
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
