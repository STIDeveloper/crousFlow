'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarX2, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MealCard } from './MealCard'

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
    return (
      <div
        className="flex min-h-72 items-center justify-center p-12"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-forest motion-reduce:animate-none" />
        <span className="sr-only">Chargement du menu</span>
      </div>
    )
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
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#f9d77e] p-7 sm:p-10">
        <p className="visual-kicker mb-3 text-forest">Restauration universitaire</p>
        <h1 className="max-w-xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Les menus de
          <br />
          <span className="text-tomato">la semaine prochaine.</span>
        </h1>
        <p className="mt-4 max-w-md text-base text-ink/80">
          Consultez les plats, les tarifs et les créneaux de retrait proposés.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-ink/75">
          Formule CROUS à 1,00 € avec compte Izly actif (1 plat principal + 1 entrée + 1 dessert).
          Réservation recommandée la veille (J-1). Le paiement s’effectue sur place lors du retrait
          sur présentation de votre badge ou QR Izly : la réservation ne débite pas Izly en ligne.
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Choisir un jour">
        {week.days.map((day, index) => (
          <button
            key={day.date}
            onClick={() => {
              setSelectedDay(index)
              setSelectedSlot(0)
            }}
            aria-pressed={selectedDay === index}
            className={`min-h-16 min-w-24 flex-1 rounded-2xl border px-4 py-3 text-sm font-bold capitalize transition-colors ${selectedDay === index ? 'border-forest bg-forest text-paper' : 'border-forest/15 bg-[#fffdf7] text-forest hover:bg-sage'}`}
          >
            {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-2 text-sm font-semibold">Créneau de retrait</span>
        {week.days[selectedDay]?.slots.map((slot, index) => (
          <button
            key={slot.id}
            aria-pressed={selectedSlot === index}
            onClick={() => setSelectedSlot(index)}
            className={`min-h-11 rounded-full border px-5 text-sm font-bold ${selectedSlot === index ? 'border-tomato bg-tomato text-paper' : 'border-forest/15 bg-[#fffdf7] text-ink'}`}
          >
            {slot.startTime}
          </button>
        ))}
      </div>
      <div className="pb-24">
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
                  <p className="rounded-xl border border-dashed border-sage p-3 text-sm text-ink/70">
                    Aucun repas ou créneau disponible.
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
      <div className="fixed inset-x-0 bottom-16 z-40 flex items-center justify-between border-t border-forest/10 bg-paper p-4 shadow-lg sm:bottom-0 sm:px-12">
        <p className="font-bold">
          {canReserve
            ? `${activeReservations.length} réservation${activeReservations.length > 1 ? 's' : ''}`
            : 'Consultation libre · réservation réservée aux étudiants connectés'}
        </p>
        <Link
          href={canReserve ? '/tickets' : '/connexion'}
          className="min-h-11 rounded-full bg-forest px-6 py-2 font-bold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          {canReserve ? 'Voir mes tickets' : 'Se connecter'}
        </Link>
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
      className="mx-auto flex min-h-72 max-w-lg flex-col items-center justify-center p-8 text-center"
      role="status"
    >
      <div className="mb-4 text-forest">{icon}</div>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-ink/70">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 py-2 font-bold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      ) : null}
    </div>
  )
}
