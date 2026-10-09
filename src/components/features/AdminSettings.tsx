'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  Coins,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  Sliders,
} from 'lucide-react'
import { toast } from 'sonner'

type SettingsDto = {
  socialMealPriceCents: number
  nonScholarPriceCents: number
  bookingClosingHour: string
  cancellationClosingHour: string
  maxPerDay: number
  maxPerWeek: number
  maxPeripherals: number
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

export function AdminSettings() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<SettingsDto | null>(null)

  const { data, isLoading, refetch } = useQuery<SettingsDto>({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings')
      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(readError(json, 'Impossible de charger la configuration.'))
      return json as SettingsDto
    },
  })

  // Synchronise le formulaire lorsque les données distantes sont chargées ou actualisées
  const [syncedData, setSyncedData] = useState<SettingsDto | undefined>(undefined)
  if (data && data !== syncedData) {
    setSyncedData(data)
    setFormData(data)
  }

  const currentValues: SettingsDto = formData ??
    data ?? {
      socialMealPriceCents: 100,
      nonScholarPriceCents: 330,
      bookingClosingHour: '11:00',
      cancellationClosingHour: '10:30',
      maxPerDay: 1,
      maxPerWeek: 5,
      maxPeripherals: 2,
    }

  const mutation = useMutation({
    mutationFn: async (updated: SettingsDto) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(readError(json, 'Échec de l’enregistrement des paramètres.'))
      return json as SettingsDto
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'settings'], saved)
      void queryClient.invalidateQueries({ queryKey: ['menu'] })
      toast.success('Paramètres du restaurant enregistrés en base et appliqués immédiatement.', {
        icon: <CheckCircle2 className="text-ok" />,
      })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(currentValues)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-sage/20 bg-night-2 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-glow">
            Paramètres Cafétéria
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Configuration Métier</h1>
          <p className="mt-2 text-sage">
            Modifiez les tarifs, fenêtres horaires et quotas appliqués en temps réel sans
            redémarrage.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-night p-3 border border-sage/20 text-sm text-sage">
          <Settings className="size-5 text-glow" />
          <span>Règles locales actives</span>
        </div>
      </header>

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-sage/20 bg-night-2 p-12">
          <Loader2 className="size-8 animate-spin text-glow motion-reduce:animate-none" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Bloc Tarification */}
          <section className="rounded-2xl border border-sage/20 bg-night-2 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="size-5 text-glow" />
              <h2 className="font-display text-xl font-bold text-paper">
                Tarification des Formules
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-sage">
                <span>Tarif formule sociale CROUS (compte Izly actif)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={currentValues.socialMealPriceCents / 100}
                    onChange={(e) =>
                      setFormData({
                        ...currentValues,
                        socialMealPriceCents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-mono text-paper focus:ring-2 focus:ring-glow"
                  />
                  <span className="font-bold text-paper">€</span>
                </div>
                <span className="text-xs font-normal text-sage/80">
                  Référence CROUS : 1,00 € pour les étudiants bénéficiant d&apos;un compte Izly
                  actif.
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-sage">
                <span>Tarif repas général (hors compte Izly / visiteurs)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={currentValues.nonScholarPriceCents / 100}
                    onChange={(e) =>
                      setFormData({
                        ...currentValues,
                        nonScholarPriceCents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-mono text-paper focus:ring-2 focus:ring-glow"
                  />
                  <span className="font-bold text-paper">€</span>
                </div>
                <span className="text-xs font-normal text-sage/80">
                  Tarif standard conventionné CROUS (ex: 3,30 €).
                </span>
              </label>
            </div>
          </section>

          {/* Bloc Horaires et Clôture */}
          <section className="rounded-2xl border border-sage/20 bg-night-2 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="size-5 text-glow" />
              <h2 className="font-display text-xl font-bold text-paper">
                Fenêtres de Réservation & Annulation
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-sage">
                <span>Heure limite de réservation le jour du service</span>
                <input
                  type="time"
                  value={currentValues.bookingClosingHour}
                  onChange={(e) =>
                    setFormData({ ...currentValues, bookingClosingHour: e.target.value })
                  }
                  className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-mono text-paper focus:ring-2 focus:ring-glow"
                />
                <span className="text-xs font-normal text-sage/80">
                  Exemple : 11:00 pour le service du midi.
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-sage">
                <span>Heure limite d&apos;annulation sans pénalité</span>
                <input
                  type="time"
                  value={currentValues.cancellationClosingHour}
                  onChange={(e) =>
                    setFormData({ ...currentValues, cancellationClosingHour: e.target.value })
                  }
                  className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-mono text-paper focus:ring-2 focus:ring-glow"
                />
                <span className="text-xs font-normal text-sage/80">
                  Permet de libérer les portions pour les autres étudiants.
                </span>
              </label>
            </div>
          </section>

          {/* Bloc Quotas et Composition */}
          <section className="rounded-2xl border border-sage/20 bg-night-2 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="size-5 text-glow" />
              <h2 className="font-display text-xl font-bold text-paper">
                Composition de Formule & Quotas
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-bold text-sage">
                <span>Périphériques max inclus</span>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={currentValues.maxPeripherals}
                  onChange={(e) =>
                    setFormData({ ...currentValues, maxPeripherals: Number(e.target.value) })
                  }
                  className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-mono text-paper focus:ring-2 focus:ring-glow"
                />
                <span className="text-xs font-normal text-sage/80">
                  1 Plat + jusqu&apos;à 2 périphériques (entrée/dessert).
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-sage">
                <span>Réservations max / jour / étudiant</span>
                <input
                  type="number"
                  min="1"
                  max="3"
                  value={currentValues.maxPerDay}
                  onChange={(e) =>
                    setFormData({ ...currentValues, maxPerDay: Number(e.target.value) })
                  }
                  className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-mono text-paper focus:ring-2 focus:ring-glow"
                />
                <span className="text-xs font-normal text-sage/80">
                  1 repas social par service maximum.
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-sage">
                <span>Réservations max / semaine</span>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={currentValues.maxPerWeek}
                  onChange={(e) =>
                    setFormData({ ...currentValues, maxPerWeek: Number(e.target.value) })
                  }
                  className="min-h-11 w-full rounded-xl border border-sage/40 bg-night px-3 font-mono text-paper focus:ring-2 focus:ring-glow"
                />
                <span className="text-xs font-normal text-sage/80">
                  Plafond hebdomadaire étudiant.
                </span>
              </label>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-sage/40 px-5 font-bold text-sage hover:bg-sage/10 transition-colors"
            >
              <RefreshCw className="size-4" /> Réinitialiser
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-glow px-6 font-bold text-night hover:bg-glow/90 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? (
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
              ) : (
                <Save className="size-5" />
              )}
              Enregistrer les modifications
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
