const PARIS_TIME_ZONE = 'Europe/Paris'
const SERVICE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const CLOCK_PATTERN = /^(\d{2}):(\d{2})$/

export type ServiceDate = string

type DateParts = {
  year: number
  month: number
  day: number
}

type DateTimeParts = DateParts & {
  hour: number
  minute: number
  second: number
}

function invalidDate(): Error {
  return new Error('Date de service invalide')
}

function partsFromServiceDate(value: string): DateParts {
  const match = SERVICE_DATE_PATTERN.exec(value)
  if (!match) throw invalidDate()

  const parts: DateParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
  const normalized = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  if (
    normalized.getUTCFullYear() !== parts.year ||
    normalized.getUTCMonth() !== parts.month - 1 ||
    normalized.getUTCDate() !== parts.day
  ) {
    throw invalidDate()
  }
  return parts
}

export function parseServiceDate(value: string): ServiceDate {
  partsFromServiceDate(value)
  return value
}

function formatDateParts(parts: DateParts): ServiceDate {
  return [parts.year, parts.month, parts.day]
    .map((part, index) =>
      index === 0 ? String(part).padStart(4, '0') : String(part).padStart(2, '0'),
    )
    .join('-')
}

export function addServiceDays(value: ServiceDate, days: number): ServiceDate {
  if (!Number.isInteger(days)) throw new Error('Le nombre de jours doit être entier')
  const parts = partsFromServiceDate(value)
  const result = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  result.setUTCDate(result.getUTCDate() + days)
  return formatDateParts({
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  })
}

function formatterParts(instant: Date): DateTimeParts {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = values.find((part) => part.type === type)?.value
    const number = value === undefined ? Number.NaN : Number(value)
    if (!Number.isInteger(number)) throw new Error('Impossible de lire la date Europe/Paris')
    return number
  }
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  }
}

export function formatServiceDate(instant: Date): ServiceDate {
  const parts = formatterParts(instant)
  return formatDateParts(parts)
}

function parseClock(value: string): { hour: number; minute: number } {
  const match = CLOCK_PATTERN.exec(value)
  const hour = match ? Number(match[1]) : Number.NaN
  const minute = match ? Number(match[2]) : Number.NaN
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) {
    throw new Error('Heure de fermeture invalide')
  }
  return { hour, minute }
}

function parisOffsetAt(utcMillis: number): number {
  const parts = formatterParts(new Date(utcMillis))
  const displayedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return displayedAsUtc - utcMillis
}

function parisWallTimeToUtc(value: ServiceDate, clock: string): Date {
  const dateParts = partsFromServiceDate(value)
  const clockParts = parseClock(clock)
  const wallTimeAsUtc = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    clockParts.hour,
    clockParts.minute,
  )

  let candidate = wallTimeAsUtc
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const next = wallTimeAsUtc - parisOffsetAt(candidate)
    if (next === candidate) break
    candidate = next
  }
  return new Date(candidate)
}

export function getReservationClosingInstant(
  serviceDate: ServiceDate,
  closingTime = '18:00',
  daysBefore = 1,
): Date {
  if (!Number.isInteger(daysBefore) || daysBefore < 0) {
    throw new Error('Le délai de fermeture doit être un nombre de jours positif')
  }
  const closingDate = addServiceDays(serviceDate, -daysBefore)
  return parisWallTimeToUtc(closingDate, closingTime)
}

export function isBeforeReservationClosing(
  now: Date,
  serviceDate: ServiceDate,
  closingTime = '18:00',
  daysBefore = 1,
): boolean {
  return (
    now.getTime() < getReservationClosingInstant(serviceDate, closingTime, daysBefore).getTime()
  )
}
