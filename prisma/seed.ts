import prisma from '../src/server/db'
import crypto from 'crypto'

async function main() {
  await prisma.reservation.deleteMany({})
  await prisma.kitchenBatch.deleteMany({})
  await prisma.forecast.deleteMany({})
  await prisma.menuItem.deleteMany({})
  await prisma.slot.deleteMany({})
  await prisma.meal.deleteMany({})
  await prisma.user.deleteMany({})

  // 1. Users
  await prisma.user.create({
    data: { id: 'admin1', email: 'admin@crousflow.test', name: 'Admin', role: 'ADMIN' },
  })
  await prisma.user.create({
    data: { id: 'kitchen1', email: 'cuisine@crousflow.test', name: 'Cuisine', role: 'KITCHEN' },
  })

  const studentIds = []
  for (let i = 1; i <= 20; i++) {
    const id = `student${i}`
    studentIds.push(id)
    await prisma.user.create({
      data: { id, email: `etudiant${i}@crousflow.test`, name: `Etudiant ${i}`, role: 'STUDENT' },
    })
  }

  // 2. Meals
  const meals = []
  for (let i = 1; i <= 15; i++) {
    const meal = await prisma.meal.create({
      data: {
        id: `meal${i}`,
        name: `Plat varié ${i}`,
        description: `Un plat délicieux ${i}`,
        category: i % 3 === 0 ? 'Végétarien' : 'Viande',
        priceCents: i % 2 === 0 ? 330 : 450,
        imageUrl: '/placeholder.png',
        allergens: JSON.stringify(['Gluten']),
      },
    })
    meals.push(meal)
  }

  // 3. Menus & Slots (8 weeks future, 12 weeks past)
  // Generating for a total of 20 weeks (-12 to +8)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const days = []
  for (let w = -12; w <= 8; w++) {
    for (let d = 1; d <= 5; d++) {
      // Mon-Fri
      const date = new Date(today)
      date.setUTCDate(today.getUTCDate() + w * 7 + (d - today.getUTCDay()))
      days.push(date)
    }
  }

  for (const date of days) {
    // 3 meals per day
    const dayMeals = [meals[0], meals[1], meals[2]]
    for (const meal of dayMeals) {
      await prisma.menuItem.create({
        data: {
          id: `menu-${date.toISOString().split('T')[0]}-${meal.id}`,
          mealId: meal.id,
          date,
          available: true,
        },
      })
    }

    // 3 slots per day
    const times = ['12:00', '12:15', '12:30']
    for (const time of times) {
      await prisma.slot.create({
        data: {
          id: `slot-${date.toISOString().split('T')[0]}-${time}`,
          date,
          startTime: time,
          endTime: time
            .replace('12:', '12:')
            .replace('00', '15')
            .replace('15', '30')
            .replace('30', '45'),
          capacity: 40,
          reservedCount: 0,
        },
      })
    }
  }

  // 4. History + Active reservations (simplistic seed for demo)
  // For each day, apply a pattern to simulate history
  // pattern: Tue/Thu higher, Fri lower, exams weeks (-6, -7) +30%, noise +/- 15%

  // To keep the script execution within reasonable limits, we won't seed all 12 weeks with thousands of reservations
  // one by one, but rather we can just seed a few for the demo.
  // We'll create a few active reservations for the current week.

  // active reservation for student1 today/tomorrow
  const upcomingSlots = await prisma.slot.findMany({ where: { date: { gte: today } }, take: 5 })
  const upcomingMenuItems = await prisma.menuItem.findMany({
    where: { date: { gte: today } },
    take: 5,
  })

  if (upcomingSlots.length > 0 && upcomingMenuItems.length > 0) {
    const s = upcomingSlots[0]
    const m = upcomingMenuItems[0]
    const newId = crypto.randomUUID()
    await prisma.reservation.create({
      data: {
        id: newId,
        userId: 'student1',
        slotId: s.id,
        menuItemId: m.id,
        idempotencyKey: crypto.randomUUID(),
        status: 'CONFIRMED',
        activeKey: `student1-${s.id}-${m.id}`,
        qrToken: 'dummy-qr', // Normally generated properly
      },
    })
    await prisma.slot.update({ where: { id: s.id }, data: { reservedCount: { increment: 1 } } })
  }

  console.log('Seed terminé.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
