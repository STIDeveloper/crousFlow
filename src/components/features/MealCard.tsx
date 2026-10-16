'use client'

import { motion } from 'framer-motion'
import { Check, Clock, X } from 'lucide-react'
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

  const vegetarian = menuItem.meal.category === 'Végétarien'
  const optionClass =
    'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 transition-colors hover:border-brand has-[:checked]:border-primary has-[:checked]:bg-brand-soft/70'

  return (
    <>
      <motion.article
        layoutId={`meal-${menuItem.id}-${slot.id}`}
        className={cn(
          'food-card group flex w-full flex-col overflow-hidden rounded-[1.75rem] border border-line/70 bg-surface text-left',
          isReserved && 'ring-2 ring-brand ring-offset-2 ring-offset-canvas',
        )}
      >
        <div className="relative">
          <div
            className={cn(
              'relative h-44 w-full overflow-hidden',
              vegetarian ? 'bg-leaf/20' : 'bg-brand-soft',
            )}
          >
            <div
              aria-hidden="true"
              className="ripple absolute -left-24 -top-24 size-80 rounded-full opacity-80"
            />
            <MealArtwork vegetarian={vegetarian} />
            <span className="absolute left-4 top-4 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">
              {menuItem.meal.category}
            </span>
            {isReserved ? (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-leaf px-3 py-1.5 text-xs font-extrabold text-ink shadow-sm">
                <Check className="size-3.5" aria-hidden="true" strokeWidth={3} />
                Réservé
              </span>
            ) : null}
            <span className="absolute bottom-2.5 left-4 text-[10px] font-semibold text-ink/60">
              Illustration du plat
            </span>
          </div>
          <span className="absolute bottom-0 right-5 grid size-16 translate-y-1/2 place-items-center rounded-full bg-surface text-center shadow-card ring-4 ring-surface">
            <span className="font-display text-base font-extrabold leading-none text-primary">
              {formatPrice(socialMealPriceCents)}
            </span>
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5 pt-6">
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-ink">
            <Clock className="size-3.5 text-primary" aria-hidden="true" />
            Retrait {slot.startTime}
          </span>
          <h3 className="mb-2 font-display text-[1.4rem] font-extrabold leading-tight text-ink">
            {menuItem.meal.name}
          </h3>
          <p className="mb-4 min-h-10 text-sm leading-relaxed text-ink-soft">
            {menuItem.meal.description && !menuItem.meal.description.includes('délicieux')
              ? menuItem.meal.description
              : 'Plat proposé par votre restaurant universitaire.'}
          </p>
          <p className="mb-4 flex flex-col rounded-2xl bg-canvas px-3.5 py-2.5">
            <span className="text-xs font-bold text-primary">
              Formule sociale {formatPrice(socialMealPriceCents)}
            </span>
            <span className="text-[11px] font-medium text-ink-soft">
              Formule CROUS avec compte Izly · 1 plat + entrée + dessert
            </span>
          </p>
          {menuItem.meal.allergens.length > 0 ? (
            <p className="mb-4 w-fit rounded-full border border-line bg-canvas px-3 py-1 text-[11px] font-medium text-ink-soft">
              Allergènes : {menuItem.meal.allergens.join(', ')}
            </p>
          ) : null}
          {isFull && !isReserved ? (
            <span className="mb-2 text-xs font-bold text-danger">Complet</span>
          ) : null}
          {isReserved ? (
            <span className="mb-2 text-xs font-bold text-ok">Réservé sur ce créneau</span>
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
              'mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isReserved
                ? 'cursor-default bg-leaf/25 text-ok'
                : disabled
                  ? 'cursor-not-allowed bg-mist text-ink-soft'
                  : 'bg-primary text-primary-foreground shadow-sm hover:bg-brand-deep',
            )}
          >
            {isReserved ? <Check className="size-4" aria-hidden="true" strokeWidth={3} /> : null}
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
          className="fixed inset-0 z-[60] flex items-end justify-center bg-deep/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setComposerOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setComposerOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`composer-title-${menuItem.id}`}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-surface shadow-float sm:rounded-[2rem]"
          >
            <div className="sky-gradient relative overflow-hidden px-6 pb-6 pt-6 sm:px-8">
              <div
                aria-hidden="true"
                className="ripple pointer-events-none absolute -right-28 -top-28 size-72 rounded-full"
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="visual-kicker text-ink/80">Formule sociale</p>
                  <h2
                    id={`composer-title-${menuItem.id}`}
                    className="mt-1 font-display text-3xl font-extrabold text-ink"
                  >
                    Composer votre repas
                  </h2>
                </div>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setComposerOpen(false)}
                  className="grid min-h-11 min-w-11 place-items-center rounded-full bg-surface/90 text-ink shadow-sm hover:bg-surface"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="relative mt-3 text-sm font-medium text-ink/85">
                Plateau CROUS standard : {menuItem.meal.name} + entrée + dessert (
                {formatPrice(socialMealPriceCents)} avec compte Izly actif). Les éventuels
                suppléments s’ajoutent et seront réglés sur le TPE Izly lors du retrait.
              </p>
            </div>

            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              {starterOptions.length > 0 ? (
                <fieldset className="mt-6">
                  <legend className="font-bold text-ink">
                    Entrée <span className="text-sm font-semibold text-primary">(obligatoire)</span>
                  </legend>
                  <div className="mt-3 grid gap-2">
                    {starterOptions.map((option) => {
                      const selected = peripheralIds.includes(option.id)
                      return (
                        <label key={option.id} className={optionClass}>
                          <input
                            type="radio"
                            className="size-4 accent-primary"
                            name={`starter-${menuItem.id}-${slot.id}`}
                            checked={selected}
                            onChange={() => selectPeripheral(option, starterOptions)}
                          />
                          <span className="font-medium">
                            {option.meal.name}{' '}
                            <span className="text-xs text-ink-soft">· incluse</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ) : null}

              {dessertOptions.length > 0 ? (
                <fieldset className="mt-6">
                  <legend className="font-bold text-ink">
                    Dessert{' '}
                    <span className="text-sm font-semibold text-primary">(obligatoire)</span>
                  </legend>
                  <div className="mt-3 grid gap-2">
                    {dessertOptions.map((option) => {
                      const selected = peripheralIds.includes(option.id)
                      return (
                        <label key={option.id} className={optionClass}>
                          <input
                            type="radio"
                            className="size-4 accent-primary"
                            name={`dessert-${menuItem.id}-${slot.id}`}
                            checked={selected}
                            onChange={() => selectPeripheral(option, dessertOptions)}
                          />
                          <span className="font-medium">
                            {option.meal.name}{' '}
                            <span className="text-xs text-ink-soft">· inclus</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ) : null}

              {otherPeripheralOptions.length > 0 && !hasRequiredComposition ? (
                <fieldset className="mt-6">
                  <legend className="font-bold text-ink">Périphériques (2 choix maximum)</legend>
                  <div className="mt-3 grid gap-2">
                    {otherPeripheralOptions.map((option) => {
                      const selected = peripheralIds.includes(option.id)
                      const disabledOption = !selected && peripheralIds.length >= 2
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            optionClass,
                            disabledOption && 'cursor-not-allowed opacity-50 hover:border-line',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={selected}
                            disabled={disabledOption}
                            aria-label={option.meal.name}
                            onChange={() =>
                              toggleSelection(option.id, peripheralIds, setPeripheralIds)
                            }
                          />
                          <span className="font-medium">
                            {option.meal.name}{' '}
                            <span className="text-xs text-ink-soft">· inclus</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ) : null}

              {supplementOptions.length > 0 ? (
                <fieldset className="mt-6">
                  <legend className="font-bold text-ink">Suppléments payants</legend>
                  <div className="mt-3 grid gap-2">
                    {supplementOptions.map((option) => (
                      <label key={option.id} className={cn(optionClass, 'justify-between')}>
                        <span className="flex items-center gap-3 font-medium">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={supplementIds.includes(option.id)}
                            onChange={() =>
                              toggleSelection(option.id, supplementIds, setSupplementIds)
                            }
                          />
                          {option.meal.name}
                        </span>
                        <span className="text-sm font-bold text-ink">
                          + {formatPrice(option.meal.priceCents)}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <div className="mt-7 rounded-2xl bg-brand-soft/70 p-4 text-sm">
                <div className="flex items-center justify-between font-bold text-ink">
                  <span>Total à payer sur place</span>
                  <span className="font-display text-2xl font-extrabold">
                    {formatPrice(socialMealPriceCents + supplementTotal)}
                  </span>
                </div>
                <p className="mt-2 text-ink-soft">
                  Cette confirmation réserve le repas. Elle ne débite pas Izly et ne confirme aucun
                  paiement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !compositionIsReady}
                className="mt-5 min-h-13 w-full rounded-full bg-primary px-5 font-extrabold text-primary-foreground shadow-sm transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending
                  ? 'Réservation en cours…'
                  : compositionIsReady
                    ? 'Confirmer la réservation'
                    : 'Choisissez une entrée et un dessert'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
