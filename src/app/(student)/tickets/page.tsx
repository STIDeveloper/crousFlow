'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  TicketCard,
  TicketHistoryRow,
  type TicketReservation,
} from '@/components/features/TicketCard'
import { AlertCircle, ArrowRight, QrCode, RefreshCw, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const HISTORY_PREVIEW = 8

function slotTime(reservation: TicketReservation): number {
  return reservation.slot?.date ? new Date(reservation.slot.date).getTime() : 0
}

export default function TicketsPage() {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(true)
  const [showAllHistory, setShowAllHistory] = useState(false)
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
  const {
    data: reservations,
    isLoading,
    error,
    refetch,
  } = useQuery<TicketReservation[]>({
    queryKey: ['reservations'],
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/me/reservations')
      if (!res.ok) throw new Error('Erreur de chargement')
      const data: unknown = await res.json()
      return Array.isArray(data) ? (data as TicketReservation[]) : []
    },
  })
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/reservations/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const body: { message?: string } = await response.json().catch(() => ({}))
        throw new Error(body.message ?? 'L’annulation a échoué.')
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] })
      void queryClient.invalidateQueries({ queryKey: ['menu'] })
      toast.success('Réservation annulée.')
    },
    onError: (mutationError) => toast.error(mutationError.message),
  })

  if (isOnline && isLoading) {
    return (
      <div
        className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-10 sm:px-8 md:grid-cols-2 lg:grid-cols-3"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Chargement de vos tickets…</span>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-[34rem] animate-pulse rounded-[2rem] bg-surface motion-reduce:animate-none"
          />
        ))}
      </div>
    )
  }

  if (!isOnline) {
    return (
      <TicketState
        icon={<WifiOff className="h-10 w-10" />}
        title="Vous êtes hors ligne"
        description="Reconnectez-vous pour actualiser vos tickets."
      />
    )
  }

  if (error) {
    return (
      <TicketState
        icon={<AlertCircle className="h-10 w-10" />}
        title="Impossible de charger les tickets"
        description="Réessayez dans quelques instants."
        action={() => void refetch()}
      />
    )
  }

  const all = reservations ?? []
  const active = all
    .filter((reservation) => reservation.status === 'CONFIRMED')
    .sort((a, b) => slotTime(a) - slotTime(b))
  const history = all
    .filter((reservation) => reservation.status !== 'CONFIRMED')
    .sort((a, b) => slotTime(b) - slotTime(a))
  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW)
  const consumedCount = history.filter((reservation) => reservation.status === 'CONSUMED').length
  const noShowCount = history.filter((reservation) => reservation.status === 'NO_SHOW').length
  const cancelledCount = history.filter((reservation) => reservation.status === 'CANCELLED').length

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="visual-kicker mb-3 text-primary">Suivi des réservations</p>
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">
              Mes tickets
            </h1>
            <p className="mt-3 text-ink-soft">
              Présentez le QR code de votre réservation au personnel lors du retrait.
            </p>
          </div>
          <Link
            href="/menu"
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground shadow-sm transition-colors hover:bg-brand-deep"
          >
            Réserver un repas
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {all.length === 0 ? (
          <EmptyTickets />
        ) : (
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-14">
            <section aria-labelledby="tickets-actifs">
              <h2
                id="tickets-actifs"
                className="mb-5 flex items-center gap-3 font-display text-2xl font-extrabold text-ink"
              >
                À retirer
                <span className="grid min-w-8 place-items-center rounded-full bg-brand px-2 py-0.5 text-sm font-extrabold text-ink">
                  {active.length}
                </span>
              </h2>
              {active.length === 0 ? (
                <div className="flex flex-col items-start gap-4 rounded-[2rem] border border-dashed border-line bg-surface p-6">
                  <p className="text-ink-soft">Aucun repas à retirer pour le moment.</p>
                  <Link
                    href="/menu"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary px-5 font-bold text-primary hover:bg-brand-soft"
                  >
                    Voir le menu
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-2 lg:grid-cols-1">
                  {active.map((reservation) => (
                    <TicketCard
                      key={reservation.id}
                      reservation={reservation}
                      onCancel={() => cancelMutation.mutate(reservation.id)}
                      isCancelling={
                        cancelMutation.isPending && cancelMutation.variables === reservation.id
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {history.length > 0 ? (
              <section aria-labelledby="tickets-historique">
                <h2
                  id="tickets-historique"
                  className="mb-5 font-display text-2xl font-extrabold text-ink"
                >
                  Historique
                </h2>
                <dl className="mb-5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Repas retirés', value: consumedCount, tone: 'text-ok' },
                    { label: 'Non retirés', value: noShowCount, tone: 'text-ink' },
                    { label: 'Annulés', value: cancelledCount, tone: 'text-ink-soft' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-line/70 bg-surface px-4 py-3 shadow-card"
                    >
                      <dt className="text-xs font-semibold text-ink-soft">{stat.label}</dt>
                      <dd className={`font-display text-2xl font-extrabold ${stat.tone}`}>
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <ul className="divide-y divide-line overflow-hidden rounded-[1.75rem] border border-line/70 bg-surface shadow-card">
                  {visibleHistory.map((reservation) => (
                    <TicketHistoryRow key={reservation.id} reservation={reservation} />
                  ))}
                </ul>
                {history.length > HISTORY_PREVIEW ? (
                  <button
                    type="button"
                    onClick={() => setShowAllHistory((value) => !value)}
                    aria-expanded={showAllHistory}
                    className="mx-auto mt-5 flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-bold text-ink shadow-sm hover:border-brand hover:bg-brand-soft"
                  >
                    {showAllHistory
                      ? 'Réduire l’historique'
                      : `Afficher tout l’historique (${history.length})`}
                  </button>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyTickets() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[2rem] border border-line/70 bg-surface px-6 py-14 text-center shadow-card">
      <div className="sky-gradient relative mb-6 grid size-28 place-items-center overflow-hidden rounded-full">
        <span className="grid size-20 place-items-center rounded-full bg-surface text-primary shadow-card">
          <QrCode className="size-9" aria-hidden="true" />
        </span>
      </div>
      <h2 className="mb-2 font-display text-3xl font-extrabold text-ink">
        Vous n’avez pas encore de réservation.
      </h2>
      <p className="mb-7 max-w-md text-ink-soft">
        Choisissez un plat et un créneau : votre ticket QR apparaîtra ici, prêt à être scanné au
        comptoir.
      </p>
      <Link
        href="/menu"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground hover:bg-brand-deep"
      >
        Voir le menu
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

function TicketState({
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
      className="mx-auto my-12 flex min-h-80 max-w-lg flex-col items-center justify-center rounded-[2rem] border border-line/70 bg-surface p-8 text-center shadow-card"
      role="status"
    >
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-brand-soft text-primary">
        {icon}
      </div>
      <h1 className="font-display text-2xl font-extrabold">{title}</h1>
      <p className="mt-2 text-ink-soft">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground hover:bg-brand-deep"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      ) : null}
    </div>
  )
}
