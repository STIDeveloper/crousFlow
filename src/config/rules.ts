export const rules = {
  reservationWindow: { startDay: 4, startHour: 0, endDay: 0, endHour: 23, endMinute: 59 },
  cancellationDeadline: { dayBefore: 1, hour: 18 },
  maxPerDay: 2,
  maxPerWeek: 10,
  socialMealPriceCents: 100,
  maxPeripheralProducts: 2,
  maxSupplementProducts: 10,
  allowDuplicatePeripheralCategories: true,
  // Paramètres locaux CrousFlow, à confirmer avec le CROUS de Créteil.
  services: [
    { key: 'LUNCH', startsAt: '11:00', endsAt: '15:00' },
    { key: 'DINNER', startsAt: '18:00', endsAt: '22:00' },
  ],
  slotDurationMinutes: 15,
  noShowGraceMinutes: 15,
  maxPayloadBytes: 1_048_576,
  defaultPriceCents: 100,
} as const

export type Rules = typeof rules
