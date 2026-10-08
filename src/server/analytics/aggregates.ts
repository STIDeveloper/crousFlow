import db from '../db'

export async function countByMealAndSlot(date: Date) {
  const res = await db.reservation.groupBy({
    by: ['menuItemId', 'slotId'],
    where: {
      status: 'CONFIRMED',
      slot: { date },
    },
    _count: { _all: true },
  })
  return res
}

export async function countByDay(date: Date) {
  const res = await db.reservation.count({
    where: {
      status: 'CONFIRMED',
      slot: { date },
    },
  })
  return res
}

export async function affluenceBySlot(date: Date) {
  const slots = await db.slot.findMany({
    where: { date },
  })
  return slots.map((s) => ({
    slotId: s.id,
    capacity: s.capacity,
    reservedCount: s.reservedCount,
    fillRate: s.capacity > 0 ? s.reservedCount / s.capacity : 0,
  }))
}
