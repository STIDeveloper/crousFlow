export const rules = {
  reservationWindow: { startDay: 4, startHour: 0, endDay: 0, endHour: 23, endMinute: 59 },
  cancellationDeadline: { dayBefore: 1, hour: 18 },
  maxPerDay: 2,
  maxPerWeek: 10,
  slotDurationMinutes: 15,
  noShowGraceMinutes: 15,
  maxPayloadBytes: 1_048_576,
  defaultPriceCents: 330,
} as const

export type Rules = typeof rules
