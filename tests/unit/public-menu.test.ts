import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/menus/route'

vi.mock('@/server/menus/query', () => ({
  getWeeklyMenu: vi.fn(async (week: number) => ({ week, days: [] })),
}))
vi.mock('@/server/auth/session', () => ({
  requireSessionUser: vi.fn(async () => {
    throw new Error('No session')
  }),
}))

describe('Consultation publique des menus', () => {
  it('autorise la lecture sans session', async () => {
    const response = await GET(new NextRequest('http://localhost/api/menus?week=1'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ week: 1, days: [] })
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('continue de valider la semaine', async () => {
    const response = await GET(new NextRequest('http://localhost/api/menus?week=53'))
    expect(response.status).toBe(422)
  })
})
