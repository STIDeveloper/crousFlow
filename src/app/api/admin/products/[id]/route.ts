import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { productPatchSchema } from '@/lib/schemas/product'
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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const { id } = await context.params
    const product = await db.meal.findUnique({ where: { id } })
    if (!product) throw new AppError('NOT_FOUND', 'Produit introuvable', 404)
    if (user.restaurantId && product.restaurantId !== user.restaurantId) {
      throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
    }
    const parsed = productPatchSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Produit invalide', 422, parsed.error.flatten())
    }
    const finalProductType = parsed.data.productType ?? product.productType
    let finalSideCategory = parsed.data.sideCategory ?? product.sideCategory
    if (finalProductType === 'SIDE' && !finalSideCategory) {
      const cat =
        `${parsed.data.category ?? product.category} ${parsed.data.name ?? product.name}`.toLowerCase()
      if (
        cat.includes('dessert') ||
        cat.includes('fruit') ||
        cat.includes('compote') ||
        cat.includes('yaourt') ||
        cat.includes('gateau') ||
        cat.includes('mousse') ||
        cat.includes('tarte')
      ) {
        finalSideCategory = 'DESSERT'
      } else {
        finalSideCategory = 'STARTER'
      }
    }
    const data = {
      ...parsed.data,
      sideCategory: finalSideCategory,
      allergens: parsed.data.allergens ? JSON.stringify(parsed.data.allergens) : undefined,
    }
    const updated = await db.meal.update({ where: { id }, data })
    return NextResponse.json(serializeProduct(updated))
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
    const product = await db.meal.findUnique({ where: { id } })
    if (!product) throw new AppError('NOT_FOUND', 'Produit introuvable', 404)
    if (user.restaurantId && product.restaurantId !== user.restaurantId) {
      throw new AppError('FORBIDDEN', 'Restaurant non autorisé', 403)
    }
    const updated = await db.meal.update({ where: { id }, data: { active: false } })
    return NextResponse.json(serializeProduct(updated))
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
