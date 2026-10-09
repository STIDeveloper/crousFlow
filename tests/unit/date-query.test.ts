import { describe, it, expect } from 'vitest'
import { parseDateQuery } from '../../src/server/http/query'
import { AppError } from '../../src/server/errors'

describe('parseDateQuery', () => {
  it('accepte une date AAAA-MM-JJ valide', () => {
    expect(parseDateQuery('2026-10-12')?.toISOString()).toBe('2026-10-12T00:00:00.000Z')
  })

  it('renvoie null si le paramètre est absent', () => {
    expect(parseDateQuery(null)).toBeNull()
  })

  it.each([
    'zzz',
    '31-02-9999',
    '2026-02-31',
    '2026-13-01',
    '',
    ' ',
    '2026-10-12T00:00:00Z',
    'x'.repeat(5000),
  ])('refuse « %s » avec une erreur 422', (value) => {
    try {
      parseDateQuery(value)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).status).toBe(422)
    }
  })
})
