'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useState } from 'react'
import { SlotGauge } from './SlotGauge'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MealArtwork } from './MealArtwork'

type Meal = {
  id: string
  name: string
  category: string
  priceCents: number
  productType: 'MAIN' | 'SIDE' | 'SUPPLEMENT' | 'STANDALONE'
  sideCategory?: 'STARTER' | 'DESSERT' | string | null
  socialEligible: boolean
  imageUrl: string
  allergens: string[]
  description?: string
}
type Slot = { id: string; startTime: string; capacity: number; reservedCount: number }
type MenuItem = { id: string; meal: Meal; date: string }

function normaliseCategory(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .trim()
}

function isStarter(item: MenuItem): boolean {
  if (item.meal.sideCategory === 'STARTER') return true
  const category = normaliseCategory(item.meal.category)
  return category === 'entree' || category.startsWith('entree ')
}

function isDessert(item: MenuItem): boolean {
  if (item.meal.sideCategory === 'DESSERT') return true
  const category = normaliseCategory(item.meal.category)
  return category === 'dessert' || category.startsWith('dessert ')
}

function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    priceCents / 100,
  )
}

export function MealCard({
  menuItem,
  slot,
  isReserved,
  hasServiceReservation = false,
  canReserve = false,
  peripheralOptions = [],
  supplementOptions = [],
  socialMealPriceCents,
}: {
  menuItem: MenuItem
  slot: Slot
  isReserved: boolean
  hasServiceReservation?: boolean
  canReserve?: boolean
  peripheralOptions?: MenuItem[]
  supplementOptions?: MenuItem[]
  socialMealPriceCents: number
}) {
  const isFull = slot.reservedCount >= slot.capacity
  const disabled = !canReserve || isFull || isReserved || (hasServiceReservation && !isReserved)
  const queryClient = useQueryClient()
  const [isComposerOpen, setComposerOpen] = useState(false)
  const [peripheralIds, setPeripheralIds] = useState<string[]>(() =>
    [peripheralOptions.filter(isStarter)[0]?.id, peripheralOptions.filter(isDessert)[0]?.id].filter(
      (id): id is string => Boolean(id),
    ),
  )
  const [supplementIds, setSupplementIds] = useState<string[]>([])

  const starterOptions = peripheralOptions.filter(isStarter)
  const dessertOptions = peripheralOptions.filter(isDessert)
  const otherPeripheralOptions = peripheralOptions.filter(
    (option) => !isStarter(option) && !isDessert(option),
  )
  const hasRequiredComposition = starterOptions.length > 0 || dessertOptions.length > 0
  const compositionIsReady =
    (!starterOptions.length ||
      starterOptions.some((option) => peripheralIds.includes(option.id))) &&
    (!dessertOptions.length || dessertOptions.some((option) => peripheralIds.includes(option.id)))

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.id,
          menuItemId: menuItem.id,
          peripheralMenuItemIds: peripheralIds,
          supplementMenuItemIds: supplementIds,
          idempotencyKey: crypto.randomUUID(),
        }),
      })
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}))
        const code =
          typeof data === 'object' && data !== null && 'code' in data ? String(data.code) : ''
        const rawMessage =
          typeof data === 'object' && data !== null && 'message' in data ? String(data.message) : ''

        let message = rawMessage || 'Erreur lors de la réservation'
        if (code === 'SLOT_FULL') {
          message = 'Ce créneau horaire est désormais complet. Veuillez en sélectionner un autre.'
        } else if (code === 'PRODUCT_QUOTA_EXHAUSTED') {
          message = 'Le quota réservable pour ce plat est atteint pour ce service.'
        } else if (code === 'SOCIAL_MEAL_LIMIT') {
          message =
            'Vous avez déjà réservé un repas pour ce service (limite d’un repas par service).'
        } else if (code === 'DUPLICATE_RESERVATION') {
          message = 'Vous avez déjà une réservation identique en cours.'
        } else if (code === 'WINDOW_CLOSED') {
          message = 'La fenêtre horaire de réservation est fermée pour ce service.'
        } else if (code === 'STOCK_SHORTAGE') {
          message = 'Rupture de stock signalée pour l’un des composants choisis.'
        }

        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      setComposerOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['menu'] })
      void queryClient.invalidateQueries({ queryKey: ['reservations'] })
      toast.success('Votre réservation est confirmée. Paiement à effectuer sur place.')
    },
    onError: (error) => toast.error(error.message),
  })

  const actionLabel = !canReserve
    ? `${menuItem.meal.name} — consultation uniquement`
    : isReserved
      ? 'Déjà réservé sur ce créneau'
      : hasServiceReservation
        ? '1 repas maximum par service'
        : isFull
          ? 'Créneau complet'
          : `Réserver ${menuItem.meal.name} à ${slot.startTime}`
  const supplementTotal = supplementOptions
    .filter((option) => supplementIds.includes(option.id))
    .reduce((total, option) => total + option.meal.priceCents, 0)

  function startReservation(): void {
    if (disabled) return
    if (hasRequiredComposition || supplementOptions.length > 0) {
      setComposerOpen(true)
      return
    }
    mutation.mutate()
  }

  function toggleSelection(id: string, current: string[], setCurrent: (ids: string[]) => void) {
    setCurrent(current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  function selectPeripheral(option: MenuItem, group: MenuItem[]): void {
    const groupIds = new Set(group.map((item) => item.id))
    setPeripheralIds((current) => [...current.filter((id) => !groupIds.has(id)), option.id])
  }

  return (
    <>
      <motion.article
        layoutId={`meal-${menuItem.id}-${slot.id}`}
        className={cn(
          'food-card group flex w-full flex-col overflow-hidden rounded-[2rem] border border-forest/10 bg-[#fffdf7] text-left transition-all',
          !disabled && 'hover:border-forest hover:shadow-md',
          isReserved && 'border-forest bg-sage/10 ring-2 ring-forest ring-offset-1',
        )}
      >
        <div
          className="meal-art relative h-48 w-full"
          style={{ background: menuItem.meal.category === 'Végétarien' ? '#dae6b9' : '#f8c467' }}
        >
          <MealArtwork vegetarian={menuItem.meal.category === 'Végétarien'} />
          <span className="absolute left-4 top-4 rounded-full bg-[#fffdf7] px-3 py-1.5 text-xs font-bold text-forest">
            {menuItem.meal.category}
          </span>
          <span className="absolute bottom-3 right-4 text-[10px] font-semibold text-ink/70">
            Illustration du plat
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex w-full items-start justify-between gap-2">
            <span className="rounded-md bg-sage/30 px-2 py-0.5 text-xs font-bold">
              {slot.startTime}
            </span>
            <div className="flex flex-col items-end text-right">
              <span className="text-xs font-bold text-forest">
                Formule sociale {formatPrice(socialMealPriceCents)}
              </span>
              <span className="text-[11px] font-medium text-forest/80">
                Formule CROUS avec compte Izly · 1 plat + entrée + dessert
              </span>
            </div>
          </div>
          <h3 className="mb-2 font-display text-2xl font-bold leading-tight">
            {menuItem.meal.name}
          </h3>
          <p className="mb-4 min-h-10 text-sm leading-relaxed text-ink/75">
            {menuItem.meal.description && !menuItem.meal.description.includes('délicieux')
              ? menuItem.meal.description
              : 'Plat proposé par votre restaurant universitaire.'}
          </p>
          {menuItem.meal.allergens.length > 0 ? (
            <p className="mb-4 w-fit rounded-full bg-paper px-3 py-1 text-[11px] text-ink/70">
              Allergènes : {menuItem.meal.allergens.join(', ')}
            </p>
          ) : null}
          {isFull && !isReserved ? (
            <span className="mb-2 text-xs font-bold text-danger">Complet</span>
          ) : null}
          {isReserved ? (
            <span className="mb-2 text-xs font-bold text-forest">Réservé sur ce créneau</span>
          ) : null}
          <div className="mt-auto w-full">
            <SlotGauge capacity={slot.capacity} reservedCount={slot.reservedCount} />
          </div>
          <button
            type="button"
            onClick={startReservation}
            disabled={disabled || mutation.isPending}
            aria-label={actionLabel}
            className={cn(
              'mt-4 inline-flex min-h-12 items-center justify-center rounded-full px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest',
              disabled ? 'cursor-not-allowed bg-sage/30 text-forest' : 'bg-tomato text-paper',
            )}
          >
            {!canReserve
              ? 'Connexion étudiante requise pour réserver'
              : mutation.isPending
                ? 'Réservation en cours…'
                : isReserved
                  ? 'Déjà réservé'
                  : hasServiceReservation
                    ? '1 repas max par service'
                    : isFull
                      ? 'Créneau complet'
                      : 'Réserver'}
          </button>
        </div>
      </motion.article>

      {isComposerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setComposerOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`composer-title-${menuItem.id}`}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-paper p-6 shadow-xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-forest">
                  Formule sociale
                </p>
                <h2
                  id={`composer-title-${menuItem.id}`}
                  className="font-display text-3xl font-bold"
                >
                  Composer votre repas
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="grid min-h-11 min-w-11 place-items-center rounded-full border border-forest/20"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-ink/75">
              Plateau CROUS standard : {menuItem.meal.name} + entrée + dessert (
              {formatPrice(socialMealPriceCents)} avec compte Izly actif). Les éventuels suppléments
              s’ajoutent et seront réglés sur le TPE Izly lors du retrait.
            </p>

            {starterOptions.length > 0 ? (
              <fieldset className="mt-6">
                <legend className="font-bold">
                  Entrée <span className="text-tomato">(obligatoire)</span>
                </legend>
                <div className="mt-3 grid gap-2">
                  {starterOptions.map((option) => {
                    const selected = peripheralIds.includes(option.id)
                    return (
                      <label
                        key={option.id}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-forest/15 bg-white px-4 py-2"
                      >
                        <input
                          type="radio"
                          name={`starter-${menuItem.id}-${slot.id}`}
                          checked={selected}
                          onChange={() => selectPeripheral(option, starterOptions)}
                        />
                        <span>
                          {option.meal.name} <span className="text-xs text-ink/60">· incluse</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            {dessertOptions.length > 0 ? (
              <fieldset className="mt-6">
                <legend className="font-bold">
                  Dessert <span className="text-tomato">(obligatoire)</span>
                </legend>
                <div className="mt-3 grid gap-2">
                  {dessertOptions.map((option) => {
                    const selected = peripheralIds.includes(option.id)
                    return (
                      <label
                        key={option.id}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-forest/15 bg-white px-4 py-2"
                      >
                        <input
                          type="radio"
                          name={`dessert-${menuItem.id}-${slot.id}`}
                          checked={selected}
                          onChange={() => selectPeripheral(option, dessertOptions)}
                        />
                        <span>
                          {option.meal.name} <span className="text-xs text-ink/60">· inclus</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            {otherPeripheralOptions.length > 0 && !hasRequiredComposition ? (
              <fieldset className="mt-6">
                <legend className="font-bold">Périphériques (2 choix maximum)</legend>
                <div className="mt-3 grid gap-2">
                  {otherPeripheralOptions.map((option) => {
                    const selected = peripheralIds.includes(option.id)
                    const disabledOption = !selected && peripheralIds.length >= 2
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          'flex min-h-11 items-center gap-3 rounded-xl border border-forest/15 bg-white px-4 py-2',
                          disabledOption && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabledOption}
                          aria-label={option.meal.name}
                          onChange={() =>
                            toggleSelection(option.id, peripheralIds, setPeripheralIds)
                          }
                        />
                        <span>
                          {option.meal.name} <span className="text-xs text-ink/60">· inclus</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : null}

            {supplementOptions.length > 0 ? (
              <fieldset className="mt-6">
                <legend className="font-bold">Suppléments payants</legend>
                <div className="mt-3 grid gap-2">
                  {supplementOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-forest/15 bg-white px-4 py-2"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={supplementIds.includes(option.id)}
                          onChange={() =>
                            toggleSelection(option.id, supplementIds, setSupplementIds)
                          }
                        />
                        {option.meal.name}
                      </span>
                      <span className="text-sm font-bold">
                        + {formatPrice(option.meal.priceCents)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="mt-7 rounded-2xl bg-sage/20 p-4 text-sm">
              <div className="flex justify-between font-bold">
                <span>Total à payer sur place</span>
                <span>{formatPrice(socialMealPriceCents + supplementTotal)}</span>
              </div>
              <p className="mt-2 text-ink/70">
                Cette confirmation réserve le repas. Elle ne débite pas Izly et ne confirme aucun
                paiement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !compositionIsReady}
              className="mt-5 min-h-12 w-full rounded-full bg-tomato px-5 font-bold text-paper disabled:opacity-60"
            >
              {mutation.isPending
                ? 'Réservation en cours…'
                : compositionIsReady
                  ? 'Confirmer la réservation'
                  : 'Choisissez une entrée et un dessert'}
            </button>
          </section>
        </div>
      ) : null}
    </>
  )
}
