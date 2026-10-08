'use client'

import { useQuery } from '@tanstack/react-query'
import { MealCard } from './MealCard'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type SlotDTO = {
  id: string
  date: string
  startTime: string
  endTime: string
  capacity: number
  reservedCount: number
}
type ReservationDTO = { id: string; slotId: string }

export function WeekPlanner() {
  const router = useRouter()

  const {
    data: slots,
    isLoading: slotsLoading,
    error: slotsError,
  } = useQuery<SlotDTO[]>({
    queryKey: ['slots'],
    queryFn: async () => {
      const res = await fetch('/api/slots?date=' + new Date().toISOString())
      if (res.status === 401) throw new Error('401')
      if (!res.ok) throw new Error('Failed to fetch slots')
      const data = await res.json()
      return Array.isArray(data) ? data : data.slots || []
    },
  })

  const {
    data: reservations,
    isLoading: resLoading,
    error: resError,
  } = useQuery<ReservationDTO[]>({
    queryKey: ['reservations'],
    queryFn: async () => {
      const res = await fetch('/api/me/reservations')
      if (res.status === 401) throw new Error('401')
      if (!res.ok) throw new Error('Failed to fetch reservations')
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
  })

  useEffect(() => {
    if (slotsError?.message === '401' || resError?.message === '401') {
      router.push('/connexion')
    }
  }, [slotsError, resError, router])

  if (slotsError?.message === '401' || resError?.message === '401') return null

  if (slotsLoading || resLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-forest w-8 h-8" />
      </div>
    )
  }

  const safeSlots = Array.isArray(slots) ? slots : []
  const safeRes = Array.isArray(reservations) ? reservations : []

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full px-4 pt-8">
      <h2 className="text-3xl font-display font-bold">Semaine en cours</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-20">
        {safeSlots.map((slot: SlotDTO) => (
          <div key={slot.id} className="flex flex-col gap-3">
            <div className="font-bold border-b border-sage pb-2 mb-2">
              {new Date(slot.date).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
              })}
            </div>
            <MealCard
              slot={slot}
              menuItem={{
                id: 'dummy',
                date: slot.date,
                meal: {
                  id: 'm1',
                  name: 'Poulet frites',
                  category: 'Viande',
                  priceCents: 330,
                  imageUrl: '',
                  allergens: '[]',
                },
              }}
              isReserved={safeRes.some((r: ReservationDTO) => r.slotId === slot.id)}
            />
          </div>
        ))}
      </div>

      <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 p-4 bg-paper/90 backdrop-blur border-t border-sage shadow-lg flex justify-between items-center z-40">
        <div>
          <p className="font-bold">{safeRes.length} réservations</p>
        </div>
        <Link
          href="/tickets"
          className="px-6 py-2 bg-forest text-paper rounded-full font-bold hover:bg-forest/90 focus:ring-2 focus:ring-forest focus:ring-offset-2"
        >
          Voir mes tickets
        </Link>
      </div>
    </div>
  )
}
