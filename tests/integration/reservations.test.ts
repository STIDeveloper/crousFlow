import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import db from '../../src/server/db'
import { POST as CreateRes } from '../../src/app/api/reservations/route'
import { POST as ValidateTicket } from '../../src/app/api/tickets/validate/route'
import { DELETE as CancelRes } from '../../src/app/api/reservations/[id]/route'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import * as headers from 'next/headers'

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('Reservations API', () => {
  const userId = 'student-test'
  const adminId = 'admin-test'
  let slotId = ''
  let menuItemId = ''

  beforeEach(async () => {
    // Nettoyer la base (attention à l'ordre des contraintes)
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

    // Créer des données de base
    await db.user.create({ data: { id: userId, email: 's@test.com', name: 'S', role: 'STUDENT' } })
    await db.user.create({ data: { id: adminId, email: 'a@test.com', name: 'A', role: 'ADMIN' } })

    const meal = await db.meal.create({
      data: {
        id: 'm1',
        name: 'Meal',
        category: 'Cat',
        description: 'Desc',
        priceCents: 100,
        productType: 'MAIN',
        socialEligible: true,
        imageUrl: '',
        allergens: '[]',
      },
    })
    // J+3 : reste dans la fenêtre d’annulation (veille 18 h UTC) quelle que soit l’heure du test.
    const date = new Date(Date.now() + 3 * 86_400_000)
    const menuItem = await db.menuItem.create({
      data: { id: 'mi1', mealId: meal.id, date, available: true },
    })
    menuItemId = menuItem.id

    const slot = await db.slot.create({
      data: { id: 's1', date, startTime: '12:00', endTime: '12:15', capacity: 1, reservedCount: 0 },
    })
    slotId = slot.id
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  const mockSession = (id: string) => {
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

  it('POST /api/reservations : succès, création + reservedCount +1', async () => {
    mockSession(userId)
    const body = { slotId, menuItemId, idempotencyKey: crypto.randomUUID() }
    const req = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const res = await CreateRes(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.reservation).toBeDefined()
    expect(data.qrToken).toBeDefined()

    const slot = await db.slot.findUnique({ where: { id: slotId } })
    expect(slot?.reservedCount).toBe(1)
  })

  it('POST /api/reservations : idempotence', async () => {
    mockSession(userId)
    const idempotencyKey = crypto.randomUUID()
    const body = { slotId, menuItemId, idempotencyKey }

    const req1 = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const res1 = await CreateRes(req1)
    expect(res1.status).toBe(200)

    const req2 = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const res2 = await CreateRes(req2)
    expect(res2.status).toBe(200)

    const count = await db.reservation.count()
    expect(count).toBe(1)
  })

  it('enregistre deux périphériques gratuits et un supplément payant', async () => {
    const date = (await db.menuItem.findUniqueOrThrow({ where: { id: menuItemId } })).date
    const sideMeals = await Promise.all(
      ['Fruit', 'Yaourt'].map((name, index) =>
        db.meal.create({
          data: {
            name,
            description: name,
            category: index === 0 ? 'Fruit' : 'Produit laitier',
            priceCents: 80,
            productType: 'SIDE',
            socialEligible: true,
            imageUrl: '',
            allergens: '[]',
          },
        }),
      ),
    )
    const supplementMeal = await db.meal.create({
      data: {
        name: 'Boisson',
        description: 'Boisson en supplément',
        category: 'Boisson',
        priceCents: 150,
        productType: 'SUPPLEMENT',
        socialEligible: false,
        imageUrl: '',
        allergens: '[]',
      },
    })
    const sideItems = await Promise.all(
      sideMeals.map((meal) =>
        db.menuItem.create({ data: { mealId: meal.id, date, available: true } }),
      ),
    )
    const supplementItem = await db.menuItem.create({
      data: { mealId: supplementMeal.id, date, available: true },
    })

    const { createReservation } = await import('../../src/server/reservations/create')
    const { reservation } = await createReservation(userId, {
      slotId,
      menuItemId,
      peripheralMenuItemIds: sideItems.map((item) => item.id),
      supplementMenuItemIds: [supplementItem.id],
      idempotencyKey: crypto.randomUUID(),
    })

    expect(reservation.priceCents).toBe(250)
    expect(reservation.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'SIDE', priceCentsSnapshot: 0 }),
        expect.objectContaining({ kind: 'SUPPLEMENT', priceCentsSnapshot: 150 }),
      ]),
    )
    expect(reservation.items).toHaveLength(3)
  })

  it('limite CrousFlow à un repas social par service et libère le quota après annulation', async () => {
    const { createReservation } = await import('../../src/server/reservations/create')
    const first = await createReservation(userId, {
      slotId,
      menuItemId,
      idempotencyKey: crypto.randomUUID(),
    })
    const date = (await db.slot.findUniqueOrThrow({ where: { id: slotId } })).date
    const secondSlot = await db.slot.create({
      data: {
        date,
        startTime: '12:30',
        endTime: '12:45',
        capacity: 5,
        reservedCount: 0,
      },
    })

    await expect(
      createReservation(userId, {
        slotId: secondSlot.id,
        menuItemId,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'SOCIAL_MEAL_LIMIT', status: 409 })

    const { cancelReservation } = await import('../../src/server/reservations/cancel')
    await cancelReservation(userId, first.reservation.id)
    await expect(
      createReservation(userId, {
        slotId: secondSlot.id,
        menuItemId,
        idempotencyKey: crypto.randomUUID(),
      }),
    ).resolves.toBeDefined()
  })

  it('POST /api/reservations : slot plein -> 409 SLOT_FULL', async () => {
    mockSession(userId)
    await db.slot.update({ where: { id: slotId }, data: { reservedCount: 1 } })

    const body = { slotId, menuItemId, idempotencyKey: crypto.randomUUID() }
    const req = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const res = await CreateRes(req)

    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.code).toBe('SLOT_FULL')
  })

  it('POST /api/reservations : doublon -> 409 DUPLICATE_RESERVATION', async () => {
    mockSession(userId)
    await db.slot.update({ where: { id: slotId }, data: { capacity: 5 } })

    const body1 = { slotId, menuItemId, idempotencyKey: crypto.randomUUID() }
    const req1 = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify(body1),
    })
    await CreateRes(req1)

    const body2 = { slotId, menuItemId, idempotencyKey: crypto.randomUUID() }
    const req2 = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify(body2),
    })
    const res2 = await CreateRes(req2)

    expect(res2.status).toBe(409)
    const data = await res2.json()
    expect(data.code).toBe('DUPLICATE_RESERVATION')
  })

  it('Test de concurrence C-08 : 50 requêtes simultanées sur 1 place', async () => {
    const users = []
    for (let i = 0; i < 50; i++) {
      const u = await db.user.create({
        data: { id: `u${i}`, email: `u${i}@t.com`, name: `U${i}`, role: 'STUDENT' },
      })
      users.push(u.id)
    }

    const { createReservation } = await import('../../src/server/reservations/create')
    const reqs = users.map(async (uid) => {
      try {
        await createReservation(uid, { slotId, menuItemId, idempotencyKey: crypto.randomUUID() })
        return { status: 200 }
      } catch (e) {
        return {
          status: (e as { status?: number }).status || 500,
          code: (e as { code?: string }).code,
        }
      }
    })

    const results = await Promise.all(reqs)
    const successes = results.filter((r) => r.status === 200)
    const fullErrors = results.filter((r) => r.code === 'SLOT_FULL')

    expect(successes.length).toBe(1)
    expect(fullErrors.length).toBe(49)

    const slot = await db.slot.findUnique({ where: { id: slotId } })
    expect(slot?.reservedCount).toBe(1)
  })

  it('DELETE : annulation OK, reservedCount -1', async () => {
    mockSession(userId)
    const { createReservation } = await import('../../src/server/reservations/create')
    const { reservation } = await createReservation(userId, {
      slotId,
      menuItemId,
      idempotencyKey: crypto.randomUUID(),
    })

    const req = new NextRequest('http://localhost/api/reservations/' + reservation.id, {
      method: 'DELETE',
    })
    const res = await CancelRes(req, { params: Promise.resolve({ id: reservation.id }) })

    expect(res.status).toBe(200)

    const slot = await db.slot.findUnique({ where: { id: slotId } })
    expect(slot?.reservedCount).toBe(0)
  })

  it('POST /api/tickets/validate : OK, puis 2e appel -> 409 ALREADY_CONSUMED', async () => {
    mockSession(userId)
    const { createReservation } = await import('../../src/server/reservations/create')
    const { qrToken } = await createReservation(userId, {
      slotId,
      menuItemId,
      idempotencyKey: crypto.randomUUID(),
    })

    const slot = await db.slot.findUniqueOrThrow({ where: { id: slotId } })
    vi.useFakeTimers()
    vi.setSystemTime(
      new Date(
        Date.UTC(
          slot.date.getUTCFullYear(),
          slot.date.getUTCMonth(),
          slot.date.getUTCDate(),
          12,
          5,
        ),
      ),
    )

    mockSession(adminId)
    const body = { token: qrToken }

    const req1 = new NextRequest('http://localhost/api/tickets/validate', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const res1 = await ValidateTicket(req1)
    expect(res1.status).toBe(200)

    const req2 = new NextRequest('http://localhost/api/tickets/validate', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const res2 = await ValidateTicket(req2)
    expect(res2.status).toBe(409)
    const data2 = await res2.json()
    expect(data2.code).toBe('ALREADY_CONSUMED')
    vi.useRealTimers()
  })

  it('POST /api/tickets/validate : QR falsifié -> 400 QR_INVALID', async () => {
    mockSession(adminId)

    const body = { token: 'fake.token' }
    const req = new NextRequest('http://localhost/api/tickets/validate', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const res = await ValidateTicket(req)

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.code).toBe('QR_INVALID')
  })
})
