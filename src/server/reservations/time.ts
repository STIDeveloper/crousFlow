import { rules } from '@/config/rules'

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function isSameUtcDay(left: Date, right: Date): boolean {
  return startOfUtcDay(left).getTime() === startOfUtcDay(right).getTime()
}

export function getUtcWeekRange(date: Date): { start: Date; end: Date } {
  const start = startOfUtcDay(date)
  const day = start.getUTCDay()
  const daysSinceMonday = day === 0 ? 6 : day - 1
  start.setUTCDate(start.getUTCDate() - daysSinceMonday)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  return { start, end }
}

function dateAtTime(date: Date, time: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes),
  )
}

export function getPickupWindow(slot: { date: Date; startTime: string; endTime: string }): {
  startsAt: Date
  expiresAt: Date
} | null {
  const startsAt = dateAtTime(slot.date, slot.startTime)
  const endsAt = dateAtTime(slot.date, slot.endTime)
  if (!startsAt || !endsAt || endsAt <= startsAt) return null
  return {
    startsAt,
    expiresAt: new Date(endsAt.getTime() + rules.noShowGraceMinutes * 60_000),
  }
}

export type ServiceKey = (typeof rules.services)[number]['key']

export function getServiceKey(startTime: string): ServiceKey | null {
  const service = rules.services.find(
    ({ startsAt, endsAt }) => startTime >= startsAt && startTime < endsAt,
  )
  return service?.key ?? null
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function isReservationWindowOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  const dayByWeekday: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const day = weekday ? dayByWeekday[weekday] : undefined
  if (day === undefined || !Number.isFinite(hour) || !Number.isFinite(minute)) return false

  if (day === rules.reservationWindow.startDay) return hour >= rules.reservationWindow.startHour
  if (day === rules.reservationWindow.endDay) {
    return (
      hour < rules.reservationWindow.endHour ||
      (hour === rules.reservationWindow.endHour && minute <= rules.reservationWindow.endMinute)
    )
  }
  return day === 5 || day === 6
}

export function cancellationDeadline(slotDate: Date): Date {
  return new Date(
    Date.UTC(
      slotDate.getUTCFullYear(),
      slotDate.getUTCMonth(),
      slotDate.getUTCDate() - rules.cancellationDeadline.dayBefore,
      rules.cancellationDeadline.hour,
    ),
  )
}
