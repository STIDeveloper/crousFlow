import { NextRequest, NextResponse } from 'next/server'
import { toHttpResponse } from '@/server/errors'
import { requireSessionUser, requireRole } from '@/server/auth/session'
import db from '@/server/db'
import { parseDateQuery } from '@/server/http/query'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])

    const { searchParams } = new URL(req.url)
    const todayStr = (parseDateQuery(searchParams.get('date')) ?? new Date())
      .toISOString()
      .split('T')[0]

    const slots = await db.slot.findMany({
      where: {
        date: {
          gte: new Date(`${todayStr}T00:00:00.000Z`),
          lte: new Date(`${todayStr}T23:59:59.999Z`),
        },
      },
      orderBy: { startTime: 'asc' },
    })

    const reservations = await db.reservation.findMany({
      where: {
        slot: {
          date: {
            gte: new Date(`${todayStr}T00:00:00.000Z`),
            lte: new Date(`${todayStr}T23:59:59.999Z`),
          },
        },
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
      },
      include: {
        menuItem: {
          include: {
            meal: true,
          },
        },
        items: {
          include: {
            menuItem: {
              include: { meal: true },
            },
          },
        },
      },
    })

    const summary = slots.map((slot) => {
      const slotReservations = reservations.filter((r) => r.slotId === slot.id)
      const mealsMap = new Map<string, { id: string; name: string; count: number }>()
      const productsMap = new Map<
        string,
        { id: string; name: string; count: number; productType: string }
      >()

      for (const res of slotReservations) {
        const meal = res.menuItem.meal
        const existing = mealsMap.get(meal.id)
        if (existing) {
          existing.count++
        } else {
          mealsMap.set(meal.id, { id: meal.id, name: meal.name, count: 1 })
        }
        const selectedProducts = [meal, ...res.items.map((item) => item.menuItem.meal)]
        for (const product of selectedProducts) {
          const selected = productsMap.get(product.id)
          if (selected) selected.count++
          else {
            productsMap.set(product.id, {
              id: product.id,
              name: product.name,
              count: 1,
              productType: product.productType,
            })
          }
        }
      }

      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        meals: Array.from(mealsMap.values()).sort((a, b) => b.count - a.count),
        products: Array.from(productsMap.values()).sort((a, b) => b.count - a.count),
        totalCount: slotReservations.length,
      }
    })

    return NextResponse.json(summary)
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
