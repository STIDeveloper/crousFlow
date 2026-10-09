import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { productInputSchema } from '@/lib/schemas/product'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import db from '@/server/db'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'

function parseAllergens(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : []
  } catch {
    return []
  }
}

function serializeProduct<T extends { allergens: string }>(product: T) {
  return { ...product, allergens: parseAllergens(product.allergens) }
}

async function resolveRestaurantId(requested: string | undefined, userRestaurantId: string | null) {
  if (requested) return requested
  if (userRestaurantId) return userRestaurantId
  const restaurant = await db.restaurant.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!restaurant) throw new AppError('NOT_FOUND', 'Aucun restaurant configuré', 404)
  return restaurant.id
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const restaurantId = new URL(request.url).searchParams.get('restaurantId') ?? user.restaurantId
    if (user.restaurantId && restaurantId && user.restaurantId !== restaurantId) {
      throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
    }
    const products = await db.meal.findMany({
      where: { restaurantId: restaurantId ?? undefined },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json(products.map(serializeProduct))
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
    const parsed = productInputSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Produit invalide', 422, parsed.error.flatten())
    }
    const restaurantId = await resolveRestaurantId(parsed.data.restaurantId, user.restaurantId)
    if (user.restaurantId && user.restaurantId !== restaurantId) {
      throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
    }
    const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) throw new AppError('NOT_FOUND', 'Restaurant introuvable', 404)
    let sideCategory = parsed.data.sideCategory
    if (parsed.data.productType === 'SIDE' && !sideCategory) {
      const cat = `${parsed.data.category} ${parsed.data.name}`.toLowerCase()
      if (
        cat.includes('dessert') ||
        cat.includes('fruit') ||
        cat.includes('compote') ||
        cat.includes('yaourt') ||
        cat.includes('gateau') ||
        cat.includes('mousse') ||
        cat.includes('tarte')
      ) {
        sideCategory = 'DESSERT'
      } else {
        sideCategory = 'STARTER'
      }
    }
    const product = await db.meal.create({
      data: {
        id: crypto.randomUUID(),
        restaurantId,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        productType: parsed.data.productType,
        sideCategory,
        priceCents: parsed.data.priceCents,
        socialEligible: parsed.data.socialEligible,
        imageUrl: parsed.data.imageUrl,
        allergens: JSON.stringify(parsed.data.allergens),
        active: parsed.data.active,
      },
    })
    return NextResponse.json(serializeProduct(product), { status: 201 })
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
