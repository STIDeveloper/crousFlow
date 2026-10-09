import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as headers from 'next/headers'
import crypto from 'node:crypto'
import { NextRequest } from 'next/server'
import db from '../../src/server/db'
import { GET } from '../../src/app/api/menus/route'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

describe('GET /api/menus', () => {
  const userId = 'menu-student'

  beforeEach(async () => {
    await db.balanceLedger.deleteMany({})
    await db.reservationItem.deleteMany({})
    await db.reservation.deleteMany({})
    await db.menuItem.deleteMany({})
    await db.slot.deleteMany({})
    await db.meal.deleteMany({})
    await db.session.deleteMany({})
    await db.account.deleteMany({})
    await db.invitation.deleteMany({})
    await db.user.deleteMany({})

    await db.user.create({
      data: { id: userId, email: 'menu@student.test', name: 'Menu', role: 'STUDENT' },
    })
    const meal = await db.meal.create({
      data: {
        id: 'menu-meal',
        name: 'Curry végétal',
        description: 'Riz et légumes',
        category: 'Végétarien',
        priceCents: 330,
        productType: 'MAIN',
        socialEligible: true,
        imageUrl: '',
        allergens: '["Gluten"]',
      },
    })
    const monday = new Date()
    monday.setUTCHours(0, 0, 0, 0)
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
    await db.menuItem.create({ data: { mealId: meal.id, date: monday, available: true } })
    await db.slot.create({
      data: {
        date: monday,
        startTime: '12:00',
        endTime: '12:15',
        capacity: 40,
        reservedCount: 10,
      },
    })
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  function mockSession(): void {
    const payload = Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, sub: userId }),
    ).toString('base64url')
    const signature = crypto
      .createHmac('sha256', process.env.SESSION_SECRET ?? '')
      .update(payload)
      .digest('base64url')
    vi.mocked(headers.cookies).mockReturnValue(
      Promise.resolve({
        get: (name: string) =>
          name === 'demo_user' ? { value: `${payload}.${signature}` } : undefined,
      }) as unknown as ReturnType<typeof headers.cookies>,
    )
  }

  it('retourne cinq jours, les vrais plats, créneaux et l’affluence sans cache', async () => {
    mockSession()

    const response = await GET(new NextRequest('http://localhost/api/menus?week=0'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    const body = await response.json()
    expect(body.week).toBe(0)
    expect(body.socialMealPriceCents).toBe(100)
    expect(body.days).toHaveLength(5)
    expect(body.days[0]).toMatchObject({
      menuItems: [
        {
          meal: {
            name: 'Curry végétal',
            allergens: ['Gluten'],
            productType: 'MAIN',
            socialEligible: true,
          },
        },
      ],
      slots: [
        { capacity: 40, reservedCount: 10, availableSeats: 30, fillRate: 0.25, affluence: 'LOW' },
      ],
    })
  })

  it('refuse les semaines absentes ou hors plage', async () => {
    mockSession()

    const response = await GET(new NextRequest('http://localhost/api/menus?week=53'))

    expect(response.status).toBe(422)
    expect((await response.json()).code).toBe('VALIDATION_ERROR')
  })

  it('autorise la consultation sans session authentifiée', async () => {
    vi.mocked(headers.cookies).mockReturnValue(
      Promise.resolve({ get: () => undefined }) as unknown as ReturnType<typeof headers.cookies>,
    )

    const response = await GET(new NextRequest('http://localhost/api/menus?week=0'))

    expect(response.status).toBe(200)
  })
})
