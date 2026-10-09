'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TicketCard } from '@/components/features/TicketCard'
import { AlertCircle, Loader2, RefreshCw, Ticket as TicketIcon, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type TicketReservation = {
  id: string
  status: string
  priceCents?: number
  qrToken?: string
  fulfillmentStatus?: string | null
  incidentReason?: string | null
  menuItem?: { meal?: { name: string } }
  items?: Array<{ kind: string; menuItem?: { meal?: { name: string } } }>
  slot?: { date: string; startTime: string; endTime: string }
}

export default function TicketsPage() {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(true)
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
      <div className="flex min-h-80 flex-col items-center justify-center gap-4 p-12" role="status">
        <Loader2 className="animate-spin motion-reduce:animate-none text-forest w-8 h-8" />
        <p className="font-display text-2xl text-[#245642]">Chargement de vos tickets…</p>
      </div>
    )
  }

  if (!isOnline) {
    return (
      <TicketState
        icon={<WifiOff className="h-12 w-12" />}
        title="Vous êtes hors ligne"
        description="Reconnectez-vous pour actualiser vos tickets."
      />
    )
  }

  if (error) {
    return (
      <TicketState
        icon={<AlertCircle className="h-12 w-12" />}
        title="Impossible de charger les tickets"
        description="Réessayez dans quelques instants."
        action={() => void refetch()}
      />
    )
  }

  const hasTickets = reservations && reservations.length > 0

  return (
    <div className="min-h-screen bg-[#fff7e7] py-10 px-5 sm:py-14">
      <div className="max-w-6xl mx-auto w-full">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-tomato">
              Suivi des réservations
            </p>
            <h1 className="text-5xl sm:text-6xl font-display font-bold text-forest">Mes tickets</h1>
            <p className="mt-4 text-forest/75">
              Présentez le QR code de votre réservation au personnel lors du retrait.
            </p>
          </div>
          <Link
            href="/menu"
            className="w-fit rounded-full bg-tomato px-6 py-3 font-bold text-white"
          >
            Réserver un repas ↗
          </Link>
        </div>

        {!hasTickets ? (
          <div className="flex flex-col items-center justify-center p-10 text-center border border-dashed border-[#245642]/25 bg-white/50 rounded-[2rem]">
            <TicketIcon className="w-16 h-16 text-sage mb-4" />
            <h2 className="font-display text-3xl text-[#245642] mb-2">
              Vous n’avez pas encore de réservation.
            </h2>
            <p className="text-ink/70 mb-6">Vous n&apos;avez pas encore de réservation.</p>
            <Link
              href="/menu"
              className="px-6 py-3 bg-forest text-paper rounded-full font-bold hover:bg-forest/90"
            >
              Voir le menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 items-start">
            {reservations.map((res: TicketReservation) => (
              <TicketCard
                key={res.id}
                reservation={res}
                onCancel={
                  res.status === 'CONFIRMED' ? () => cancelMutation.mutate(res.id) : undefined
                }
                isCancelling={cancelMutation.isPending && cancelMutation.variables === res.id}
              />
            ))}
          </div>
        )}
      </div>
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
      className="mx-auto my-12 flex min-h-80 max-w-lg flex-col items-center justify-center rounded-[2rem] border border-[#245642]/10 bg-white p-8 text-center"
      role="status"
    >
      <div className="mb-4 text-forest">{icon}</div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-ink/70">{description}</p>
      {action ? (
        <button
          type="button"
          onClick={action}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 py-2 font-bold text-paper"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      ) : null}
    </div>
  )
}
