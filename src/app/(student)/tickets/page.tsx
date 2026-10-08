'use client'

import { useQuery } from '@tanstack/react-query'
import { TicketCard } from '@/components/features/TicketCard'
import { Loader2, Ticket as TicketIcon } from 'lucide-react'
import Link from 'next/link'

type TicketReservation = {
  id: string
  status: string
  qrToken?: string
  menuItem?: { meal?: { name: string } }
  slot?: { date: string; startTime: string; endTime: string }
}

export default function TicketsPage() {
  const {
    data: reservations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const res = await fetch('/api/me/reservations')
      if (!res.ok) throw new Error('Erreur de chargement')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-forest w-8 h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 text-center text-danger">
        <p>Impossible de charger les tickets.</p>
      </div>
    )
  }

  const hasTickets = reservations && reservations.length > 0

  return (
    <div className="min-h-screen bg-paper/50 py-12 px-4">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-display font-bold text-center mb-12">Mes tickets</h1>

        {!hasTickets ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-sage rounded-2xl">
            <TicketIcon className="w-16 h-16 text-sage mb-4" />
            <h2 className="text-xl font-bold mb-2">Aucun ticket</h2>
            <p className="text-ink/70 mb-6">Vous n&apos;avez pas encore de réservation active.</p>
            <Link
              href="/menu"
              className="px-6 py-3 bg-forest text-paper rounded-full font-bold hover:bg-forest/90"
            >
              Voir le menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reservations.map((res: TicketReservation) => (
              <TicketCard key={res.id} reservation={res} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
