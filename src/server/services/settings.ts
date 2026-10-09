import db from '@/server/db'
import { rules } from '@/config/rules'

export type RestaurantSettingsDto = {
  socialMealPriceCents: number
  nonScholarPriceCents: number
  bookingClosingHour: string
  cancellationClosingHour: string
  maxPerDay: number
  maxPerWeek: number
  maxPeripherals: number
}

export async function getRestaurantSettings(
  restaurantId?: string | null,
): Promise<RestaurantSettingsDto> {
  const targetId =
    restaurantId ??
    (await db.restaurant.findFirst({ where: { active: true }, select: { id: true } }))?.id
  if (!targetId) {
    return {
      socialMealPriceCents: rules.socialMealPriceCents,
      nonScholarPriceCents: 330,
      bookingClosingHour: '11:00',
      cancellationClosingHour: '10:30',
      maxPerDay: rules.maxPerDay,
      maxPerWeek: rules.maxPerWeek,
      maxPeripherals: rules.maxPeripheralProducts,
    }
  }

  const setting = await db.restaurantSetting.findUnique({
    where: { restaurantId: targetId },
  })

  if (!setting) {
    return {
      socialMealPriceCents: rules.socialMealPriceCents,
      nonScholarPriceCents: 330,
      bookingClosingHour: '11:00',
      cancellationClosingHour: '10:30',
      maxPerDay: rules.maxPerDay,
      maxPerWeek: rules.maxPerWeek,
      maxPeripherals: rules.maxPeripheralProducts,
    }
  }

  return {
    socialMealPriceCents: setting.socialMealPriceCents,
    nonScholarPriceCents: setting.nonScholarPriceCents,
    bookingClosingHour: setting.bookingClosingHour,
    cancellationClosingHour: setting.cancellationClosingHour,
    maxPerDay: setting.maxPerDay,
    maxPerWeek: setting.maxPerWeek,
    maxPeripherals: setting.maxPeripherals,
  }
}

export async function updateRestaurantSettings(
  restaurantId: string,
  input: Partial<RestaurantSettingsDto>,
): Promise<RestaurantSettingsDto> {
  const updated = await db.restaurantSetting.upsert({
    where: { restaurantId },
    create: {
      restaurantId,
      socialMealPriceCents: input.socialMealPriceCents ?? rules.socialMealPriceCents,
      nonScholarPriceCents: input.nonScholarPriceCents ?? 330,
      bookingClosingHour: input.bookingClosingHour ?? '11:00',
      cancellationClosingHour: input.cancellationClosingHour ?? '10:30',
      maxPerDay: input.maxPerDay ?? rules.maxPerDay,
      maxPerWeek: input.maxPerWeek ?? rules.maxPerWeek,
      maxPeripherals: input.maxPeripherals ?? rules.maxPeripheralProducts,
    },
    update: {
      socialMealPriceCents: input.socialMealPriceCents,
      nonScholarPriceCents: input.nonScholarPriceCents,
      bookingClosingHour: input.bookingClosingHour,
      cancellationClosingHour: input.cancellationClosingHour,
      maxPerDay: input.maxPerDay,
      maxPerWeek: input.maxPerWeek,
      maxPeripherals: input.maxPeripherals,
    },
  })

  return {
    socialMealPriceCents: updated.socialMealPriceCents,
    nonScholarPriceCents: updated.nonScholarPriceCents,
    bookingClosingHour: updated.bookingClosingHour,
    cancellationClosingHour: updated.cancellationClosingHour,
    maxPerDay: updated.maxPerDay,
    maxPerWeek: updated.maxPerWeek,
    maxPeripherals: updated.maxPeripherals,
  }
}
