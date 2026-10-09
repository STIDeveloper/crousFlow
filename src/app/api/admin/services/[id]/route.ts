import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import db from '@/server/db'
import { readJsonBody } from '@/server/http/body'
import { z } from 'zod'
import { publishService } from '@/server/services/service'

const serviceStatusPatchSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']),
  reason: z.string().trim().max(500).optional(),
})

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const { id } = await context.params
    const service = await db.serviceSession.findUnique({
      where: { id },
      include: {
        offers: { include: { menuItem: { include: { meal: true } } } },
        slots: { orderBy: { startTime: 'asc' } },
      },
    })
    if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
    if (user.restaurantId && service.restaurantId !== user.restaurantId) {
      throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
    }
    return NextResponse.json(service)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const { id } = await context.params
    const parsed = serviceStatusPatchSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Statut de service invalide',
        422,
        parsed.error.flatten(),
      )
    }
    const service = await db.serviceSession.findUnique({
      where: { id },
      include: { offers: { include: { menuItem: true } } },
    })
    if (!service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
    if (user.restaurantId && service.restaurantId !== user.restaurantId) {
      throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
    }
    if (parsed.data.status === 'PUBLISHED' && service.offers.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Publiez au moins une offre', 422)
    }
    if (parsed.data.status === 'PUBLISHED') {
      const published = await publishService(user, {
        serviceId: service.id,
        offers: service.offers.map((offer) => ({
          mealId: offer.menuItem.mealId,
          plannedQuantity: offer.plannedQuantity,
          expectedQuantity: offer.expectedQuantity,
          available: offer.available,
        })),
      })
      return NextResponse.json(published)
    }
    if (parsed.data.status === 'DRAFT') {
      const { unpublishService } = await import('@/server/services/service')
      const draft = await unpublishService(user, service.id)
      return NextResponse.json(draft)
    }
    const updated = await db.serviceSession.update({
      where: { id },
      data: {
        status: parsed.data.status,
        closeReason: parsed.data.status === 'CLOSED' ? parsed.data.reason : null,
        closedAt: parsed.data.status === 'CLOSED' ? new Date() : null,
      },
      include: {
        offers: { include: { menuItem: { include: { meal: true } } } },
        slots: { orderBy: { startTime: 'asc' } },
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const { id } = await context.params
    const body: unknown = await readJsonBody(request)
    const updateSchema = z.object({
      reservationClosingAt: z.string().datetime().optional().or(z.string().optional()),
      offers: z
        .array(
          z.object({
            mealId: z.string().min(1),
            plannedQuantity: z.number().int().min(0),
            expectedQuantity: z.number().int().min(0).optional(),
            available: z.boolean().optional(),
          }),
        )
        .optional(),
    })
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Mise à jour invalide', 422, parsed.error.flatten())
    }
    const { updateServiceDetails } = await import('@/server/services/service')
    const updated = await updateServiceDetails(user, id, {
      reservationClosingAt: parsed.data.reservationClosingAt
        ? new Date(parsed.data.reservationClosingAt)
        : undefined,
      offers: parsed.data.offers,
    })
    return NextResponse.json(updated)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const { id } = await context.params
    const { deleteDraftService } = await import('@/server/services/service')
    await deleteDraftService(user, id)
    return NextResponse.json({ success: true, message: 'Brouillon supprimé' })
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
