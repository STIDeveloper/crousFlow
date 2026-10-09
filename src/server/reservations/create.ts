import db from '../db'
import { AppError } from '../errors'
import { generateQrToken } from '../security/qr'
import { Prisma } from '@prisma/client'
import type { CreateReservationInput } from '@/lib/schemas/reservation'
import crypto from 'crypto'
import {
  formatUtcDate,
  getPickupWindow,
  getServiceKey,
  getUtcWeekRange,
  isReservationWindowOpen,
  isSameUtcDay,
} from './time'
import { rules } from '@/config/rules'
import { assertServiceReservable } from '@/server/services/service'
import { recalculateAllocations } from '@/server/stock/receive'

export async function createReservation(userId: string, input: CreateReservationInput) {
  const now = new Date()
  const peripheralMenuItemIds = [
    ...(input.peripheralMenuItemIds ?? []),
    ...(input.starterMenuItemId ? [input.starterMenuItemId] : []),
    ...(input.dessertMenuItemId ? [input.dessertMenuItemId] : []),
  ]
  const supplementMenuItemIds = input.supplementMenuItemIds ?? []
  if (!isReservationWindowOpen(now)) {
    throw new AppError('WINDOW_CLOSED', 'Fenêtre de réservation fermée', 409)
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.reservation.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { items: true },
      })
      if (existing) {
        if (existing.userId !== userId) {
          throw new AppError('IDEMPOTENCY_CONFLICT', 'Clé de réservation déjà utilisée', 409)
        }
        return { reservation: existing, qrToken: existing.qrToken }
      }

      const selectedMenuItemIds = [
        input.menuItemId,
        ...peripheralMenuItemIds,
        ...supplementMenuItemIds,
      ]
      const [user, slot, selectedMenuItems] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { role: true } }),
        tx.slot.findUnique({ where: { id: input.slotId } }),
        tx.menuItem.findMany({
          where: { id: { in: selectedMenuItemIds } },
          include: { meal: true },
        }),
      ])
      if (!user) throw new AppError('UNAUTHORIZED', 'Utilisateur introuvable', 401)
      if (user.role !== 'STUDENT') throw new AppError('FORBIDDEN', 'Réservé aux étudiants', 403)
      if (!slot) throw new AppError('NOT_FOUND', 'Créneau introuvable', 404)
      if (selectedMenuItems.length !== selectedMenuItemIds.length) {
        throw new AppError('VALIDATION_ERROR', 'Un produit sélectionné est introuvable', 422)
      }

      const selectedById = new Map(selectedMenuItems.map((item) => [item.id, item]))
      const mainMenuItem = selectedById.get(input.menuItemId)
      const peripheralMenuItems = peripheralMenuItemIds.map((id) => selectedById.get(id))
      const supplementMenuItems = supplementMenuItemIds.map((id) => selectedById.get(id))

      const service =
        input.serviceId || slot.serviceId
          ? await tx.serviceSession.findUnique({
              where: { id: input.serviceId ?? slot.serviceId! },
              include: { offers: true },
            })
          : null
      if (input.serviceId && !service) throw new AppError('NOT_FOUND', 'Service introuvable', 404)
      if (service) {
        if (service.restaurantId !== slot.restaurantId) {
          throw new AppError('FORBIDDEN', 'Service d’un autre restaurant', 403)
        }
        await assertServiceReservable(tx, service.id, now)
        if (service.serviceDate.getTime() !== slot.date.getTime()) {
          throw new AppError('VALIDATION_ERROR', 'Service et créneau incohérents', 422)
        }
      }

      if (
        !mainMenuItem ||
        !mainMenuItem.available ||
        mainMenuItem.meal.productType !== 'MAIN' ||
        !mainMenuItem.meal.socialEligible
      ) {
        throw new AppError('VALIDATION_ERROR', 'Plat non éligible à la formule sociale', 422)
      }

      const everyProductIsAvailableForSlot = selectedMenuItems.every(
        (item) =>
          item.available &&
          isSameUtcDay(item.date, slot.date) &&
          item.restaurantId === slot.restaurantId,
      )
      if (!everyProductIsAvailableForSlot) {
        throw new AppError('VALIDATION_ERROR', 'Produit indisponible pour ce créneau', 422)
      }

      if (
        peripheralMenuItems.some(
          (item) => !item || item.meal.productType !== 'SIDE' || !item.meal.socialEligible,
        )
      ) {
        throw new AppError('VALIDATION_ERROR', 'Périphérique non éligible à la formule', 422)
      }
      if (service) {
        const sideCategory = (item: (typeof peripheralMenuItems)[number]): string => {
          const value = item?.meal.sideCategory?.toUpperCase()
          if (value === 'STARTER' || value === 'DESSERT') return value
          const category = item?.meal.category.toLowerCase() ?? ''
          if (
            category.includes('dessert') ||
            category.includes('fruit') ||
            category.includes('compote')
          ) {
            return 'DESSERT'
          }
          return 'STARTER'
        }
        const categories = peripheralMenuItems.map(sideCategory)
        if (categories.filter((category) => category === 'STARTER').length !== 1) {
          throw new AppError('VALIDATION_ERROR', 'La formule exige une entrée', 422)
        }
        if (categories.filter((category) => category === 'DESSERT').length !== 1) {
          throw new AppError('VALIDATION_ERROR', 'La formule exige un dessert', 422)
        }
      }
      if (
        supplementMenuItems.some(
          (item) => !item || item.meal.productType !== 'SUPPLEMENT' || item.meal.priceCents < 0,
        )
      ) {
        throw new AppError('VALIDATION_ERROR', 'Supplément invalide', 422)
      }
      if (!rules.allowDuplicatePeripheralCategories) {
        const categories = peripheralMenuItems.map((item) => item?.meal.category)
        if (new Set(categories).size !== categories.length) {
          throw new AppError(
            'VALIDATION_ERROR',
            'Deux périphériques de la même catégorie ne sont pas autorisés',
            422,
          )
        }
      }
      if (slot.date.getTime() <= now.getTime()) {
        throw new AppError('WINDOW_CLOSED', 'Créneau de réservation fermé', 409)
      }

      const serviceKey = getServiceKey(slot.startTime)
      if (!serviceKey) {
        throw new AppError('VALIDATION_ERROR', 'Service non configuré pour ce créneau', 422)
      }
      const socialQuotaKey = `${userId}-${formatUtcDate(slot.date)}-${serviceKey}`
      const serviceDayStart = new Date(
        Date.UTC(slot.date.getUTCFullYear(), slot.date.getUTCMonth(), slot.date.getUTCDate()),
      )
      const serviceDayEnd = new Date(serviceDayStart)
      serviceDayEnd.setUTCDate(serviceDayEnd.getUTCDate() + 1)
      const activeKey = `${userId}-${input.slotId}-${input.menuItemId}`
      const [existingActiveReservation, existingSocialMeal, legacyReservationsForDay] =
        await Promise.all([
          tx.reservation.findUnique({ where: { activeKey }, select: { id: true } }),
          tx.reservation.findUnique({ where: { socialQuotaKey }, select: { id: true } }),
          tx.reservation.findMany({
            where: {
              userId,
              status: { in: ['PENDING', 'CONFIRMED', 'CONSUMED'] },
              socialQuotaKey: null,
              slot: { date: { gte: serviceDayStart, lt: serviceDayEnd } },
            },
            select: { slot: { select: { startTime: true } } },
          }),
        ])
      if (existingActiveReservation) {
        throw new AppError('DUPLICATE_RESERVATION', 'Réservation déjà existante (doublon)', 409)
      }
      if (
        existingSocialMeal ||
        legacyReservationsForDay.some(
          (reservation) => getServiceKey(reservation.slot.startTime) === serviceKey,
        )
      ) {
        throw new AppError(
          'SOCIAL_MEAL_LIMIT',
          'Un repas social est déjà réservé pour ce service dans CrousFlow',
          409,
        )
      }

      const dayStart = new Date(
        Date.UTC(slot.date.getUTCFullYear(), slot.date.getUTCMonth(), slot.date.getUTCDate()),
      )
      const dayEnd = new Date(dayStart)
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
      const week = getUtcWeekRange(slot.date)
      const [dailyCount, weeklyCount] = await Promise.all([
        tx.reservation.count({
          where: {
            userId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            slot: { date: { gte: dayStart, lt: dayEnd } },
          },
        }),
        tx.reservation.count({
          where: {
            userId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            slot: { date: { gte: week.start, lt: week.end } },
          },
        }),
      ])
      if (dailyCount >= rules.maxPerDay || weeklyCount >= rules.maxPerWeek) {
        throw new AppError('WINDOW_CLOSED', 'Plafond de réservation atteint', 409)
      }

      const serviceOffers = service
        ? service.offers.filter((offer) => selectedMenuItemIds.includes(offer.menuItemId))
        : []
      if (service && serviceOffers.length !== selectedMenuItemIds.length) {
        throw new AppError('VALIDATION_ERROR', 'Produit non publié pour ce service', 422)
      }
      const primaryOffer = serviceOffers.find((offer) => offer.menuItemId === input.menuItemId)
      if (service && !primaryOffer) {
        throw new AppError('VALIDATION_ERROR', 'Plat non publié pour ce service', 422)
      }
      for (const offer of serviceOffers) {
        const committed = await tx.serviceOffer.updateMany({
          where: {
            id: offer.id,
            available: true,
            committedQuantity: { lt: offer.plannedQuantity },
          },
          data: { committedQuantity: { increment: 1 } },
        })
        if (committed.count === 0) {
          throw new AppError('PRODUCT_QUOTA_EXHAUSTED', 'Produit épuisé pour ce service', 409, {
            offerId: offer.id,
          })
        }
      }

      const updatedSlot = await tx.slot.updateMany({
        where: {
          id: input.slotId,
          reservedCount: { lt: slot.capacity },
        },
        data: { reservedCount: { increment: 1 } },
      })

      if (updatedSlot.count === 0) {
        throw new AppError('SLOT_FULL', 'Le créneau est complet', 409)
      }

      const newId = crypto.randomUUID()
      const pickupWindow = getPickupWindow(slot)
      if (!pickupWindow) throw new AppError('VALIDATION_ERROR', 'Créneau de retrait invalide', 422)
      const tempToken = generateQrToken(newId, pickupWindow.expiresAt)
      const supplementPriceCents = supplementMenuItems.reduce(
        (total, item) => total + (item?.meal.priceCents ?? 0),
        0,
      )

      const reservation = await tx.reservation.create({
        data: {
          id: newId,
          userId,
          slotId: input.slotId,
          menuItemId: input.menuItemId,
          idempotencyKey: input.idempotencyKey,
          status: 'CONFIRMED',
          activeKey,
          qrToken: tempToken,
          restaurantId: slot.restaurantId,
          socialQuotaKey,
          priceCents: rules.socialMealPriceCents + supplementPriceCents,
          serviceId: service?.id,
          primaryOfferId: primaryOffer?.id,
          fulfillmentStatus: 'WAITING',
          items: {
            create: [
              ...peripheralMenuItems.map((item) => ({
                menuItemId: item!.id,
                kind: 'SIDE' as const,
                priceCentsSnapshot: 0,
                serviceOfferId: serviceOffers.find((offer) => offer.menuItemId === item!.id)?.id,
              })),
              ...supplementMenuItems.map((item) => ({
                menuItemId: item!.id,
                kind: 'SUPPLEMENT' as const,
                priceCentsSnapshot: item!.meal.priceCents,
                serviceOfferId: serviceOffers.find((offer) => offer.menuItemId === item!.id)?.id,
              })),
            ],
          },
        },
        include: { items: true },
      })

      // If the kitchen has already received physical stock, allocate the new
      // reservation immediately. Otherwise the reception workflow will perform
      // the same recalculation when stock arrives.
      if (service) await recalculateAllocations(tx, service.id)

      return { reservation, qrToken: tempToken }
    })

    return result
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      if (String(err.meta?.target).includes('socialQuotaKey')) {
        throw new AppError(
          'SOCIAL_MEAL_LIMIT',
          'Un repas social est déjà réservé pour ce service dans CrousFlow',
          409,
        )
      }
      throw new AppError('DUPLICATE_RESERVATION', 'Réservation déjà existante (doublon)', 409)
    }
    throw err
  }
}
