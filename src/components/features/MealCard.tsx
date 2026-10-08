'use client'

import { motion } from 'framer-motion'
import { SlotGauge } from './SlotGauge'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type Meal = {
  id: string
  name: string
  category: string
  priceCents: number
  imageUrl: string
  allergens: string
}
type Slot = { id: string; startTime: string; capacity: number; reservedCount: number }
type MenuItem = { id: string; meal: Meal; date: string }

export function MealCard({
  menuItem,
  slot,
  isReserved,
}: {
  menuItem: MenuItem
  slot: Slot
  isReserved: boolean
}) {
  const isFull = slot.reservedCount >= slot.capacity
  const disabled = isFull || isReserved
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.id,
          menuItemId: menuItem.id,
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Erreur lors de la réservation')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] })
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      toast.success('Réservation confirmée !')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <motion.button
      layoutId={`meal-${menuItem.id}-${slot.id}`}
      onClick={() => !disabled && mutation.mutate()}
      disabled={disabled || mutation.isPending}
      className={cn(
        'flex flex-col w-full text-left bg-paper border border-sage p-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2',
        disabled
          ? 'opacity-50 cursor-not-allowed grayscale'
          : 'hover:border-forest hover:shadow-md cursor-pointer',
        isReserved && 'border-forest bg-sage/10 ring-2 ring-forest ring-offset-1',
      )}
    >
      <div className="flex justify-between items-start w-full mb-1">
        <span className="text-xs font-bold px-2 py-0.5 bg-sage/30 rounded-md">
          {slot.startTime}
        </span>
        <span className="text-xs font-medium text-forest">
          {(menuItem.meal.priceCents / 100).toFixed(2)} €
        </span>
      </div>

      <h4 className="font-display font-bold text-sm leading-tight mb-1 line-clamp-2">
        {menuItem.meal.name}
      </h4>
      <p className="text-xs text-ink/60 mb-2">{menuItem.meal.category}</p>

      {isFull && !isReserved && <span className="text-xs font-bold text-danger mb-2">Complet</span>}
      {isReserved && <span className="text-xs font-bold text-forest mb-2">Réservé</span>}

      <div className="mt-auto w-full">
        <SlotGauge capacity={slot.capacity} reservedCount={slot.reservedCount} />
      </div>
    </motion.button>
  )
}
