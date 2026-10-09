import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import db from '@/server/db'
import { getRestaurantSettings, updateRestaurantSettings } from '@/server/services/settings'
import { z } from 'zod'

const settingsSchema = z.object({
  socialMealPriceCents: z.number().int().min(0).max(5000).optional(),
  nonScholarPriceCents: z.number().int().min(0).max(5000).optional(),
  bookingClosingHour: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  cancellationClosingHour: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  maxPerDay: z.number().int().min(1).max(5).optional(),
  maxPerWeek: z.number().int().min(1).max(20).optional(),
  maxPeripherals: z.number().int().min(1).max(5).optional(),
})

export async function GET() {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const restaurantId =
      user.restaurantId ?? (await db.restaurant.findFirst({ where: { active: true } }))?.id
    const settings = await getRestaurantSettings(restaurantId)
    return NextResponse.json(settings)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}

export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const restaurantId =
      user.restaurantId ?? (await db.restaurant.findFirst({ where: { active: true } }))?.id
    if (!restaurantId) throw new AppError('NOT_FOUND', 'Aucun restaurant configuré', 404)

    const body = await readJsonBody(request)
    const parsed = settingsSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Paramètres invalides', 422, parsed.error.flatten())
    }

    const updated = await updateRestaurantSettings(restaurantId, parsed.data)
    return NextResponse.json(updated)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
