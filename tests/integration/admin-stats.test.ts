import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import crypto from 'crypto'
import * as headers from 'next/headers'
import db from '../../src/server/db'
import { GET as GetStats } from '../../src/app/api/admin/stats/route'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

function mockSession(id: string) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60, sub: id }),
  ).toString('base64url')
  const signature = crypto
    .createHmac('sha256', process.env.SESSION_SECRET ?? '')
    .update(payload)
    .digest('base64url')
  vi.mocked(headers.cookies).mockReturnValue(
    Promise.resolve({
      get: (name: string) =>
        name === 'demo_user' ? { value: `${payload}.${signature}` } : undefined,
      set: vi.fn(),
    }) as unknown as ReturnType<typeof headers.cookies>,
  )
}

function utcDay(daysAgo: number): Date {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date
}

describe('GET /api/admin/stats', () => {
  beforeEach(async () => {
    await db.balanceLedger.deleteMany({})
    await db.reservationItem.deleteMany({})
    await db.reservation.deleteMany({})
    await db.kitchenBatch.deleteMany({})
    await db.forecast.deleteMany({})
    await db.menuItem.deleteMany({})
    await db.slot.deleteMany({})
    await db.meal.deleteMany({})
    await db.session.deleteMany({})
    await db.account.deleteMany({})
    await db.invitation.deleteMany({})
    await db.user.deleteMany({})

    await db.user.create({
      data: { id: 'admin-stats', email: 'a@stats.test', name: 'A', role: 'ADMIN' },
    })
    await db.user.create({
      data: { id: 'student-stats', email: 's@stats.test', name: 'S', role: 'STUDENT' },
    })
    await db.meal.create({
      data: {
        id: 'meal-stats',
        name: 'Curry',
        category: 'Cat',
        description: 'Desc',
        priceCents: 100,
        productType: 'MAIN',
        socialEligible: true,
        imageUrl: '',
        allergens: '[]',
      },
    })
    for (const daysAgo of [1, 2]) {
      const date = utcDay(daysAgo)
      await db.menuItem.create({
        data: { id: `mi-stats-${daysAgo}`, mealId: 'meal-stats', date, available: true },
      })
      await db.slot.create({
        data: {
          id: `slot-stats-${daysAgo}`,
          date,
          startTime: '12:00',
          endTime: '12:15',
          capacity: 10,
          reservedCount: 0,
        },
      })
    }
    const reservations: Array<{ day: number; status: 'NO_SHOW' | 'CONSUMED' }> = [
      { day: 1, status: 'NO_SHOW' },
      { day: 1, status: 'NO_SHOW' },
      { day: 1, status: 'CONSUMED' },
      { day: 2, status: 'NO_SHOW' },
    ]
    for (const [index, reservation] of reservations.entries()) {
      await db.reservation.create({
        data: {
          id: `res-stats-${index}`,
          userId: 'student-stats',
          menuItemId: `mi-stats-${reservation.day}`,
          slotId: `slot-stats-${reservation.day}`,
          status: reservation.status,
          qrToken: `token-${index}`,
          idempotencyKey: `idem-stats-${index}`,
        },
      })
    }
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('refuse un étudiant', async () => {
    mockSession('student-stats')
    const res = await GetStats()
    expect(res.status).toBe(403)
  })

  it('renvoie les non-retraits par jour de service sur 14 jours', async () => {
    mockSession('admin-stats')
    const res = await GetStats()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      chartData: { date: string; reservations: number; noShows: number }[]
      noShowRate: number
    }
    expect(body.chartData).toHaveLength(14)
    expect(body.chartData.every((day) => typeof day.noShows === 'number')).toBe(true)
    const noShows = body.chartData.map((day) => day.noShows)
    expect(noShows.at(-2)).toBe(2) // hier
    expect(noShows.at(-3)).toBe(1) // avant-hier
    expect(noShows.reduce((sum, value) => sum + value, 0)).toBe(3)
    expect(body.noShowRate).toBeCloseTo(75, 5)
  })
})
