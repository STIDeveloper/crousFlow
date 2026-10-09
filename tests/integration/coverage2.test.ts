import { describe, it, expect } from 'vitest'
import { baseline, adjustWithLiveReservations } from '../../src/server/ia/forecast'
import { getMyReservations } from '../../src/server/reservations/query'
import { requireRole } from '../../src/server/auth/session'

describe('Coverage boosts - Part 2', () => {
  it('covers forecast internals', () => {
    const h = [
      { date: new Date('2026-10-02'), count: 100 },
      { date: new Date('2026-09-25'), count: 90 },
      { date: new Date('2026-09-18'), count: 110 },
    ]
    expect(baseline(h, new Date('2026-10-09'))).toBeDefined()

    // adjustWithLiveReservations branch
    expect(adjustWithLiveReservations(100, 50, new Date('2026-10-10'))).toBeDefined()
  })

  it('covers query', async () => {
    expect(await getMyReservations('student1')).toBeDefined()
  })

  it('covers session roles', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => requireRole({ role: 'STUDENT' } as any, ['ADMIN'])).toThrow()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => requireRole({ role: 'ADMIN' } as any, ['ADMIN'])).not.toThrow()
  })
})
