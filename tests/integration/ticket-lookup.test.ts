import { describe, it, expect, beforeEach } from 'vitest'
import db from '../../src/server/db'
import { inspectTicket } from '../../src/server/reservations/withdraw'
import { generateQrToken } from '../../src/server/security/qr'
import { ticketShortCode } from '../../src/lib/ticket-code'

const kitchen = { id: 'kitchen-lookup', role: 'KITCHEN', restaurantId: null }

async function createReservation(id: string, userId: string) {
  return db.reservation.create({
    data: {
      id,
      userId,
      menuItemId: 'mi-lookup',
      slotId: 'slot-lookup',
      status: 'CONFIRMED',
      qrToken: generateQrToken(id, new Date(Date.now() + 86_400_000)),
      idempotencyKey: `idem-${id}`,
    },
  })
}

describe('Guichet cuisine : recherche de ticket', () => {
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

    for (const id of ['student-a', 'student-b']) {
      await db.user.create({ data: { id, email: `${id}@test.com`, name: id, role: 'STUDENT' } })
    }
    const date = new Date(Date.now() + 86_400_000)
    await db.meal.create({
      data: {
        id: 'meal-lookup',
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
    await db.menuItem.create({
      data: { id: 'mi-lookup', mealId: 'meal-lookup', date, available: true },
    })
    await db.slot.create({
      data: {
        id: 'slot-lookup',
        date,
        startTime: '12:00',
        endTime: '12:15',
        capacity: 10,
        reservedCount: 2,
      },
    })
    await createReservation('cmresa00000000000aaa111', 'student-a')
    await createReservation('cmresa00000000000bbb222', 'student-b')
  })

  it('deux tickets ont des identifiants courts différents', async () => {
    const [a, b] = await db.reservation.findMany({ orderBy: { id: 'asc' } })
    expect(ticketShortCode(a.id)).not.toBe(ticketShortCode(b.id))
    expect(ticketShortCode(a.id)).toMatch(/^[A-Z2-9]{6}$/)
  })

  it("l'identifiant court affiché retrouve le bon ticket, quelle que soit la casse", async () => {
    const codeB = ticketShortCode('cmresa00000000000bbb222')
    const codeA = ticketShortCode('cmresa00000000000aaa111')
    expect((await inspectTicket(kitchen, codeB)).id).toBe('cmresa00000000000bbb222')
    expect((await inspectTicket(kitchen, ` ${codeA.toLowerCase()} `)).id).toBe(
      'cmresa00000000000aaa111',
    )
  })

  it('les codes courts sont distincts sur 5 000 identifiants', () => {
    const codes = new Set(
      Array.from({ length: 5000 }, (_, i) => ticketShortCode(`reservation-${i}`)),
    )
    expect(codes.size).toBe(5000)
  })

  it('le QR signé retrouve le bon ticket', async () => {
    const b = await db.reservation.findUniqueOrThrow({ where: { id: 'cmresa00000000000bbb222' } })
    expect((await inspectTicket(kitchen, b.qrToken)).id).toBe(b.id)
  })

  it.each([
    'eyJ',
    'EYJPZC',
    'abc',
    'cmresa',
    '000',
    'aaa',
    'bbb22',
    'aaa111',
    '%',
    '______',
    'ZZZZZZ',
  ])('refuse le fragment « %s » au lieu de valider un ticket au hasard', async (fragment) => {
    await expect(inspectTicket(kitchen, fragment)).rejects.toMatchObject({ code: 'QR_INVALID' })
  })

  it('refuse un QR signé falsifié', async () => {
    const b = await db.reservation.findUniqueOrThrow({ where: { id: 'cmresa00000000000bbb222' } })
    const forged = `${b.qrToken.slice(0, -2)}xx`
    await expect(inspectTicket(kitchen, forged)).rejects.toMatchObject({ code: 'QR_INVALID' })
  })
})
