'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRight,
  CalendarX2,
  Info,
  Plus,
  QrCode,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MealCard } from './MealCard'
import { cn } from '@/lib/utils'

type SlotDTO = {
  id: string
  date: string
  startTime: string
  endTime: string
  capacity: number
  reservedCount: number
}
type MenuItemDTO = {
  id: string
  date: string
  available: boolean
  meal: {
    description?: string
    id: string
    name: string
    category: string
    priceCents: number
    productType: 'MAIN' | 'SIDE' | 'SUPPLEMENT' | 'STANDALONE'
    sideCategory?: 'STARTER' | 'DESSERT' | string | null
    socialEligible: boolean
    imageUrl: string
    allergens: string[]
  }
}
type MenuDayDTO = { date: string; menuItems: MenuItemDTO[]; slots: SlotDTO[] }
type WeekDTO = {
  week: number
  startsOn: string
  endsOn: string
  socialMealPriceCents: number
  days: MenuDayDTO[]
}
type ReservationDTO = {
  id: string
  slotId: string
  status: string
  menuItemId?: string
  menuItem?: { id: string; meal?: { id: string; name: string } }
}

async function responseJson<T>(response: Response, message: string): Promise<T> {
  if (response.status === 401) throw new Error('401')
  if (!response.ok) throw new Error(message)
  return response.json() as Promise<T>
}

export function WeekPlanner({ canReserve = false }: { canReserve?: boolean }) {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(true)
  const [selectedDay, setSelectedDay] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(0)
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  const menuQuery = useQuery<WeekDTO>({
    queryKey: ['menu', 'week', 1],
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/menus?week=1', { cache: 'no-store' })
      return responseJson<WeekDTO>(response, 'Le menu de la semaine est indisponible.')
    },
  })
  const reservationsQuery = useQuery<ReservationDTO[]>({
    queryKey: ['reservations'],
    enabled: canReserve,
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/me/reservations')
      const data = await responseJson<ReservationDTO[]>(
        response,
        'Vos réservations sont indisponibles.',
      )
      return Array.isArray(data) ? data : []
    },
  })
  const error = menuQuery.error ?? (canReserve ? reservationsQuery.error : null)
  useEffect(() => {
    if (error?.message === '401') router.push('/connexion')
  }, [error, router])
  if (error?.message === '401') return null
  if (isOnline && (menuQuery.isLoading || (canReserve && reservationsQuery.isLoading)))
    return <PlannerSkeleton />
  if (!isOnline)
    return (
      <StatusCard
        icon={<WifiOff className="h-10 w-10" />}
        title="Vous êtes hors ligne"
        description="Reconnectez-vous pour consulter le menu et réserver un repas."
      />
    )
  if (error)
    return (
      <StatusCard
        icon={<AlertCircle className="h-10 w-10" />}
        title="Le menu ne peut pas être chargé"
        description="Réessayez dans quelques instants. Si le problème persiste, contactez votre restaurant universitaire."
        action={() => void Promise.all([menuQuery.refetch(), reservationsQuery.refetch()])}
      />
    )
  const week = menuQuery.data
  const activeReservations = (canReserve ? (reservationsQuery.data ?? []) : []).filter(
    (reservation) => reservation.status === 'CONFIRMED',
  )
  if (
    !week ||
    week.days.every(
      (day) =>
        day.menuItems.filter(
          (item) => item.available && item.meal.productType === 'MAIN' && item.meal.socialEligible,
        ).length === 0,
    )
  )
    return (
      <StatusCard
        icon={<CalendarX2 className="h-10 w-10" />}
        title="Le menu n’est pas encore publié"
        description="Revenez bientôt : les repas de cette semaine apparaîtront ici."
        action={() => void menuQuery.refetch()}
      />
    )
  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
  const socialPrice = formatPrice(week.socialMealPriceCents)
  const socialAmount = (week.socialMealPriceCents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
  })
  const reservedDayDates = new Set(
    week.days
      .filter((day) => {
        const slotIds = new Set(day.slots.map((slot) => slot.id))
        return activeReservations.some((reservation) => slotIds.has(reservation.slotId))
      })
      .map((day) => day.date),
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-6 sm:px-8 sm:py-10">
      <section className="sky-gradient relative overflow-hidden rounded-[2rem] px-6 py-7 sm:px-10 sm:py-10">
        <div
          aria-hidden="true"
          className="ripple pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full"
        />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="visual-kicker mb-3 text-ink/80">Restauration universitaire</p>
            <h1 className="max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Les menus de
              <br />
              <span className="text-brand-deep">la semaine prochaine.</span>
            </h1>
            <p className="mt-4 max-w-md text-base font-medium text-ink/85">
              Consultez les plats, les tarifs et les créneaux de retrait proposés.
            </p>
          </div>
          <div className="relative mx-auto grid size-44 shrink-0 place-items-center rounded-full bg-surface text-center shadow-float sm:size-56">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                Formule CROUS
              </p>
              <p className="mt-1 font-display text-[2.6rem] font-semibold leading-none tracking-tight text-ink sm:text-6xl">
                {socialAmount}
                <sup className="ml-0.5 text-xl font-bold">€</sup>
              </p>
              <p className="mt-1 text-xs font-semibold text-ink-soft">plat + entrée + dessert</p>
            </div>
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 grid size-11 place-items-center rounded-full bg-leaf text-surface shadow-md ring-4 ring-surface/60 sm:right-2 sm:top-2 sm:size-12"
            >
              <Plus className="size-6" strokeWidth={3} />
            </span>
          </div>
        </div>
      </section>

      <p className="flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink-soft shadow-card">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Formule CROUS à {socialPrice} avec compte Izly actif (1 plat principal + 1 entrée + 1
          dessert). Réservation recommandée la veille (J-1). Le paiement s’effectue sur place lors
          du retrait sur présentation de votre badge ou QR Izly : la réservation ne débite pas Izly
          en ligne.
        </span>
      </p>

      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
        aria-label="Choisir un jour"
      >
        {week.days.map((day, index) => {
          const date = new Date(day.date)
          const active = selectedDay === index
          const reserved = reservedDayDates.has(day.date)
          return (
            <button
              key={day.date}
              onClick={() => {
                setSelectedDay(index)
                setSelectedSlot(0)
              }}
              aria-pressed={active}
              className={cn(
                'relative flex min-h-18 min-w-20 flex-1 flex-col items-center justify-center rounded-2xl border px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                active
                  ? 'border-primary bg-primary text-primary-foreground shadow-md'
                  : 'border-line bg-surface text-ink hover:border-brand hover:bg-brand-soft/60',
              )}
            >
              <span className="text-xs font-bold uppercase tracking-wide opacity-90">
                {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </span>
              <span className="font-display text-2xl font-bold leading-tight">
                {' '}
                {date.toLocaleDateString('fr-FR', { day: 'numeric' })}
              </span>
              {reserved ? (
                <span className="absolute right-2 top-2 size-2.5 rounded-full bg-leaf ring-2 ring-surface">
                  <span className="sr-only">(repas réservé)</span>
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <span className="text-sm font-bold text-ink">Créneau de retrait</span>
        <div className="flex flex-wrap gap-3">
          {week.days[selectedDay]?.slots.map((slot, index) => {
            const active = selectedSlot === index
            const rate = slot.capacity > 0 ? slot.reservedCount / slot.capacity : 0
            const affluence = rate > 0.85 ? 'Très demandé' : rate > 0.6 ? 'Fréquenté' : 'Calme'
            return (
              <button
                key={slot.id}
                aria-pressed={active}
                aria-label={`${slot.startTime}, affluence ${affluence.toLowerCase()}`}
                onClick={() => setSelectedSlot(index)}
                className="group flex flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                <span
                  className={cn(
                    'grid size-16 place-items-center rounded-full border-2 text-sm font-extrabold transition-colors',
                    active
                      ? 'border-brand bg-brand text-ink shadow-md'
                      : 'border-brand/50 bg-surface text-ink group-hover:bg-brand-soft',
                  )}
                >
                  {slot.startTime}
                </span>
                <span
                  className={cn(
                    'text-[11px] font-semibold',
                    rate > 0.85 ? 'text-danger' : rate > 0.6 ? 'text-ink' : 'text-ink-soft',
                  )}
                >
                  {affluence}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pb-28 sm:pb-24">
        {week.days
          .filter((_, index) => index === selectedDay)
          .map((day) => {
            const date = new Date(day.date)
            const uniqueMainMealNames = new Set<string>()
            const dayItems = day.menuItems.filter((item) => {
              if (
                !item.available ||
                item.meal.productType !== 'MAIN' ||
                !item.meal.socialEligible
              ) {
                return false
              }
              const mealKey = item.meal.name.toLowerCase().trim()
              if (uniqueMainMealNames.has(mealKey)) return false
              uniqueMainMealNames.add(mealKey)
              return true
            })
            const peripheralOptions = day.menuItems.filter(
              (item) =>
                item.available && item.meal.productType === 'SIDE' && item.meal.socialEligible,
            )
            const supplementOptions = day.menuItems.filter(
              (item) => item.available && item.meal.productType === 'SUPPLEMENT',
            )
            const daySlotIds = new Set(day.slots.map((s) => s.id))
            const hasServiceReservation = activeReservations.some((r) => daySlotIds.has(r.slotId))
            return (
              <section
                key={day.date}
                className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                aria-label={`Menu du ${date.toLocaleDateString('fr-FR')}`}
              >
                <h2 className="sr-only">
                  {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}
                </h2>
                {dayItems.length === 0 || day.slots.length === 0 ? (
                  <p className="col-span-full rounded-2xl border border-dashed border-line bg-surface p-6 text-center text-sm text-ink-soft">
                    Aucun repas ou créneau disponible ce jour-là.
                  </p>
                ) : (
                  dayItems.flatMap((menuItem) =>
                    day.slots
                      .filter((_, index) => index === selectedSlot)
                      .map((slot) => {
                        const isReserved = activeReservations.some(
                          (reservation) =>
                            reservation.slotId === slot.id &&
                            (reservation.menuItemId === menuItem.id ||
                              reservation.menuItem?.meal?.id === menuItem.meal.id ||
                              reservation.menuItem?.meal?.name.toLowerCase().trim() ===
                                menuItem.meal.name.toLowerCase().trim()),
                        )
                        return (
                          <MealCard
                            key={`${menuItem.id}-${slot.id}`}
                            slot={slot}
                            menuItem={menuItem}
                            canReserve={canReserve}
                            peripheralOptions={peripheralOptions}
                            supplementOptions={supplementOptions}
                            socialMealPriceCents={week.socialMealPriceCents}
                            isReserved={isReserved}
                            hasServiceReservation={hasServiceReservation}
                          />
                        )
                      }),
                  )
                )}
              </section>
            )
          })}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 px-3 sm:bottom-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full border border-line bg-surface/95 py-2 pl-4 pr-2 shadow-float backdrop-blur sm:pl-5">
          <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink">
            {canReserve ? (
              <>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-primary">
                  <QrCode className="size-4" aria-hidden="true" />
                </span>
                {`${activeReservations.length} réservation${activeReservations.length > 1 ? 's' : ''}`}
              </>
            ) : (
              <span className="line-clamp-2 sm:truncate">
                Consultation libre · réservation réservée aux étudiants connectés
              </span>
            )}
          </p>
          <Link
            href={canReserve ? '/tickets' : '/connexion'}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {canReserve ? 'Voir mes tickets' : 'Se connecter'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function PlannerSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-6 sm:px-8 sm:py-10"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Chargement du menu</span>
      <div className="h-64 animate-pulse rounded-[2rem] bg-brand-soft motion-reduce:animate-none" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-18 flex-1 animate-pulse rounded-2xl bg-surface motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-96 animate-pulse rounded-[1.75rem] bg-surface motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  )
}

function StatusCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: () => void
}) {
  return (
    <div
      className="mx-auto my-10 flex min-h-72 max-w-lg flex-col items-center justify-center rounded-[2rem] border border-line bg-surface p-8 text-center shadow-card"
      role="status"
    >
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-brand-soft text-primary">
        {icon}
      </div>
      <h2 className="font-display text-2xl font-extrabold">{title}</h2>
      <p className="mt-2 text-ink-soft">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      ) : null}
    </div>
  )
}
