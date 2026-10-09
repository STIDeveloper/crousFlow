import { describe, expect, it } from 'vitest'
import {
  addServiceDays,
  getReservationClosingInstant,
  isBeforeReservationClosing,
  parseServiceDate,
  formatServiceDate,
} from '@/server/services/service-date'

describe('dates métier CrousFlow', () => {
  it('valide une date civile et ajoute des jours sans dépendre du fuseau local', () => {
    expect(parseServiceDate('2026-03-30')).toBe('2026-03-30')
    expect(addServiceDays('2026-03-30', -1)).toBe('2026-03-29')
    expect(addServiceDays('2026-03-30', 1)).toBe('2026-03-31')
  })

  it('rejette les dates civiles impossibles', () => {
    expect(() => parseServiceDate('2026-02-30')).toThrow('Date de service invalide')
    expect(() => parseServiceDate('30-03-2026')).toThrow('Date de service invalide')
  })

  it('calcule J-1 à 18h dans Europe/Paris avant le changement d’heure', () => {
    expect(getReservationClosingInstant('2026-03-30').toISOString()).toBe(
      '2026-03-29T16:00:00.000Z',
    )
  })

  it('conserve le bon décalage après le passage à l’heure d’hiver', () => {
    expect(getReservationClosingInstant('2026-10-26').toISOString()).toBe(
      '2026-10-25T17:00:00.000Z',
    )
  })

  it('ferme exactement à la limite et expose la date Paris', () => {
    const closing = getReservationClosingInstant('2026-03-30')
    expect(isBeforeReservationClosing(new Date(closing.getTime() - 1), '2026-03-30')).toBe(true)
    expect(isBeforeReservationClosing(closing, '2026-03-30')).toBe(false)
    expect(formatServiceDate(new Date('2026-03-29T23:30:00.000Z'))).toBe('2026-03-30')
  })
})
