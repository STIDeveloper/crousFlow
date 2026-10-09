import prisma from '../src/server/db'
import seedrandom from 'seedrandom'
import { generateQrToken } from '../src/server/security/qr'
import { existsSync, readFileSync } from 'node:fs'

const HISTORY_WEEKS = 12
const FUTURE_WEEKS = 8
const SLOT_TIMES = [
  { startTime: '12:00', endTime: '12:15' },
  { startTime: '12:15', endTime: '12:30' },
  { startTime: '12:30', endTime: '12:45' },
]

const MEAL_DEFINITIONS = [
  {
    id: 'meal1',
    name: 'Poulet rôti et pommes de terre',
    category: 'Viande',
    productType: 'MAIN',
    socialEligible: true,
    priceCents: 100,
  },
  {
    id: 'meal2',
    name: 'Curry de légumes et riz',
    category: 'Végétarien',
    productType: 'MAIN',
    socialEligible: true,
    priceCents: 100,
  },
  {
    id: 'meal3',
    name: 'Poisson sauce citron',
    category: 'Poisson',
    productType: 'MAIN',
    socialEligible: true,
    priceCents: 100,
  },
  {
    id: 'meal4',
    name: 'Salade de crudités',
    category: 'Entrée',
    productType: 'SIDE',
    socialEligible: true,
    priceCents: 80,
  },
  {
    id: 'meal5',
    name: 'Compote de pommes',
    category: 'Dessert',
    productType: 'SIDE',
    socialEligible: true,
    priceCents: 80,
  },
  {
    id: 'meal6',
    name: 'Fruit de saison',
    category: 'Fruit',
    productType: 'SIDE',
    socialEligible: true,
    priceCents: 80,
  },
  {
    id: 'meal7',
    name: 'Yaourt nature',
    category: 'Produit laitier',
    productType: 'SIDE',
    socialEligible: true,
    priceCents: 80,
  },
  {
    id: 'meal8',
    name: 'Portion de fromage',
    category: 'Fromage',
    productType: 'SIDE',
    socialEligible: true,
    priceCents: 80,
  },
  {
    id: 'meal9',
    name: 'Biscuit',
    category: 'Biscuit',
    productType: 'SIDE',
    socialEligible: true,
    priceCents: 80,
  },
  {
    id: 'meal10',
    name: 'Eau pétillante',
    category: 'Boisson',
    productType: 'SUPPLEMENT',
    socialEligible: false,
    priceCents: 120,
  },
  {
    id: 'meal11',
    name: 'Jus de fruit',
    category: 'Boisson',
    productType: 'SUPPLEMENT',
    socialEligible: false,
    priceCents: 150,
  },
  {
    id: 'meal12',
    name: 'Dessert supplémentaire',
    category: 'Dessert',
    productType: 'SUPPLEMENT',
    socialEligible: false,
    priceCents: 100,
  },
  {
    id: 'meal13',
    name: 'Sandwich',
    category: 'Vente individuelle',
    productType: 'STANDALONE',
    socialEligible: false,
    priceCents: 350,
  },
  {
    id: 'meal14',
    name: 'Salade complète',
    category: 'Vente individuelle',
    productType: 'STANDALONE',
    socialEligible: false,
    priceCents: 420,
  },
  {
    id: 'meal15',
    name: 'Boisson seule',
    category: 'Vente individuelle',
    productType: 'STANDALONE',
    socialEligible: false,
    priceCents: 180,
  },
] as const

function loadLocalEnv(): void {
  const envPath = new URL('../.env', import.meta.url)
  if (!existsSync(envPath)) return

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(?:"(.*)"|(.*))$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2] ?? match[3] ?? ''
  }
}

loadLocalEnv()

function atUtcMidnight(value: Date): Date {
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function nextServiceDate(today: Date): Date {
  const date = new Date(today)
  date.setUTCDate(date.getUTCDate() + 1)
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return date
}

function reservationCount(date: Date, mealIndex: number, random: () => number): number {
  const weekdayDemand = [0, 26, 31, 28, 30, 20, 0][date.getUTCDay()]
  const mealShare = [0.42, 0.34, 0.24][mealIndex]
  const weeksBeforeToday = Math.max(0, Math.round((Date.now() - date.getTime()) / 604_800_000))
  const examMultiplier = weeksBeforeToday === 6 || weeksBeforeToday === 7 ? 1.3 : 1
  const noise = 0.9 + random() * 0.2
  return Math.max(1, Math.round(weekdayDemand * mealShare * examMultiplier * noise))
}

async function main() {
  const random = seedrandom('crousflow-production-seed-v1')
  const today = atUtcMidnight(new Date())

  await prisma.stockAllocation.deleteMany({})
  await prisma.stockMovement.deleteMany({})
  await prisma.receptionLine.deleteMany({})
  await prisma.reception.deleteMany({})
  await prisma.serviceOffer.deleteMany({})
  await prisma.serviceSession.deleteMany({})
  await prisma.balanceLedger.deleteMany({})
  await prisma.reservationItem.deleteMany({})
  await prisma.reservation.deleteMany({})
  await prisma.kitchenBatch.deleteMany({})
  await prisma.forecast.deleteMany({})
  await prisma.menuItem.deleteMany({})
  await prisma.slot.deleteMany({})
  await prisma.meal.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.restaurantSetting.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.restaurant.deleteMany({})
  await prisma.campus.deleteMany({})

  const campus = await prisma.campus.create({
    data: { id: 'campus-montreuil', name: 'IUT de Montreuil', slug: 'iut-montreuil' },
  })
  const restaurant = await prisma.restaurant.create({
    data: {
      id: 'restaurant-crous-montreuil',
      campusId: campus.id,
      name: 'Restaurant universitaire Montreuil',
      slug: 'ru-montreuil',
    },
  })

  await prisma.restaurantSetting.create({
    data: {
      restaurantId: restaurant.id,
      socialMealPriceCents: 100,
      nonScholarPriceCents: 330,
      bookingClosingHour: '11:00',
      cancellationClosingHour: '10:30',
      maxPerDay: 1,
      maxPerWeek: 5,
      maxPeripherals: 2,
    },
  })

  await prisma.user.createMany({
    data: [
      { id: 'admin1', email: 'admin@crousflow.test', name: 'Admin', role: 'ADMIN' },
      {
        id: 'kitchen1',
        email: 'cuisine@crousflow.test',
        name: 'Cuisine',
        role: 'KITCHEN',
        restaurantId: restaurant.id,
      },
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `student${index + 1}`,
        email: `etudiant${index + 1}@crousflow.test`,
        name: `Etudiant ${index + 1}`,
        role: 'STUDENT' as const,
      })),
    ],
  })

  const meals = await Promise.all(
    MEAL_DEFINITIONS.map((definition) =>
      prisma.meal.create({
        data: {
          ...definition,
          description: `${definition.name}, proposé selon les disponibilités du jour.`,
          imageUrl: '/placeholder.png',
          allergens: JSON.stringify(['Gluten']),
          restaurantId: restaurant.id,
        },
      }),
    ),
  )

  const serviceDays: Date[] = []
  for (let week = -HISTORY_WEEKS; week <= FUTURE_WEEKS; week += 1) {
    for (let weekday = 1; weekday <= 5; weekday += 1) {
      const date = new Date(today)
      date.setUTCDate(today.getUTCDate() + week * 7 + weekday - today.getUTCDay())
      serviceDays.push(date)
    }
  }

  await prisma.menuItem.createMany({
    data: serviceDays.flatMap((date) =>
      meals.map((meal) => ({
        id: `menu-${isoDate(date)}-${meal.id}`,
        mealId: meal.id,
        date,
        available: true,
        restaurantId: restaurant.id,
      })),
    ),
  })
  await prisma.slot.createMany({
    data: serviceDays.flatMap((date) =>
      SLOT_TIMES.map(({ startTime, endTime }) => ({
        id: `slot-${isoDate(date)}-${startTime}`,
        date,
        startTime,
        endTime,
        capacity: 40,
        reservedCount: 0,
        restaurantId: restaurant.id,
      })),
    ),
  })

  const historicalReservations = [] as Array<{
    id: string
    userId: string
    menuItemId: string
    slotId: string
    status: 'CONFIRMED' | 'CONSUMED' | 'CANCELLED' | 'NO_SHOW'
    qrToken: string
    idempotencyKey: string
    createdAt: Date
    consumedAt: Date | null
    activeKey: null
    restaurantId: string
  }>
  const slotCounts = new Map<string, number>()
  let reservationIndex = 0

  for (const date of serviceDays.filter((day) => day < today)) {
    for (let mealIndex = 0; mealIndex < 3; mealIndex += 1) {
      const count = reservationCount(date, mealIndex, random)
      for (let countIndex = 0; countIndex < count; countIndex += 1) {
        const slot = SLOT_TIMES[(countIndex + mealIndex) % SLOT_TIMES.length]
        const slotId = `slot-${isoDate(date)}-${slot.startTime}`
        const roll = random()
        const status =
          roll < 0.76
            ? 'CONSUMED'
            : roll < 0.88
              ? 'CONFIRMED'
              : roll < 0.95
                ? 'NO_SHOW'
                : 'CANCELLED'
        const id = `history-reservation-${reservationIndex}`
        historicalReservations.push({
          id,
          userId: `student${(reservationIndex % 20) + 1}`,
          menuItemId: `menu-${isoDate(date)}-meal${mealIndex + 1}`,
          slotId,
          status,
          qrToken: `archived-${id}`,
          idempotencyKey: `history-idempotency-${reservationIndex}`,
          createdAt: new Date(date.getTime() - 86_400_000),
          consumedAt: status === 'CONSUMED' ? new Date(date.getTime() + 43_200_000) : null,
          activeKey: null,
          restaurantId: restaurant.id,
        })
        slotCounts.set(slotId, (slotCounts.get(slotId) ?? 0) + 1)
        reservationIndex += 1
      }
    }
  }
  await prisma.reservation.createMany({ data: historicalReservations })
  await prisma.$transaction(
    [...slotCounts.entries()].map(([id, reservedCount]) =>
      prisma.slot.update({ where: { id }, data: { reservedCount } }),
    ),
  )

  const upcomingDate = nextServiceDate(today)
  const qrExpiry = new Date(upcomingDate)
  qrExpiry.setUTCDate(qrExpiry.getUTCDate() + 1)
  for (let mealIndex = 0; mealIndex < 3; mealIndex += 1) {
    const slot = SLOT_TIMES[mealIndex]
    const id = `active-reservation-${mealIndex + 1}`
    const slotId = `slot-${isoDate(upcomingDate)}-${slot.startTime}`
    const menuItemId = `menu-${isoDate(upcomingDate)}-meal${mealIndex + 1}`
    await prisma.reservation.create({
      data: {
        id,
        userId: `student${mealIndex + 1}`,
        menuItemId,
        slotId,
        status: 'CONFIRMED',
        qrToken: generateQrToken(id, qrExpiry),
        idempotencyKey: `active-idempotency-${mealIndex + 1}`,
        activeKey: `student${mealIndex + 1}-${slotId}-${menuItemId}`,
        restaurantId: restaurant.id,
      },
    })
    await prisma.slot.update({ where: { id: slotId }, data: { reservedCount: { increment: 1 } } })
  }

  console.log(
    `Seed terminé : ${historicalReservations.length} réservations historiques, 3 tickets actifs.`,
  )
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
