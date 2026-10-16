'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type Replacement = {
  offerId: string
  mealId: string
  name: string
  productType: string
  sideCategory?: string | null
  availableStock: number
}

type ShortageItem = {
  reservationId: string
  studentName: string
  studentEmail: string
  slotTime: string
  mainMealName: string
  missingItems: Array<{ id: string; name: string; type: string }>
  availableReplacements: Replacement[]
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

export function KitchenShortageManager({ serviceDate }: { serviceDate: string }) {
  const queryClient = useQueryClient()
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<Record<string, string>>({})

  const {
    data: shortages,
    isLoading,
    refetch,
  } = useQuery<ShortageItem[]>({
    queryKey: ['kitchen', 'shortages', serviceDate],
    queryFn: async () => {
      const res = await fetch(`/api/kitchen/shortages?date=${serviceDate}`)
      const data: unknown = await res.json().catch(() => [])
      if (!res.ok) throw new Error(readError(data, 'Impossible de charger les ruptures.'))
      return Array.isArray(data) ? (data as ShortageItem[]) : []
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async (payload: {
      action: 'substitute' | 'cancel'
      reservationId: string
      substituteMealId?: string
      reason?: string
    }) => {
      const res = await fetch('/api/kitchen/shortages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(readError(data, 'Échec du traitement de la rupture.'))
      return data
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['kitchen', 'shortages', serviceDate] })
      void queryClient.invalidateQueries({ queryKey: ['kitchen'] })
      if (vars.action === 'substitute') {
        toast.success('Remplacement appliqué avec succès. La commande est prête à être servie.', {
          icon: <CheckCircle2 className="text-ok" />,
        })
      } else {
        toast.info('Réservation annulée pour motif de rupture.')
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const items = shortages ?? []

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-mist/20 bg-deep-2 p-5 animate-pulse text-mist text-sm">
        Vérification des ruptures de stock...
      </div>
    )
  }

  if (items.length === 0) {
    return null // Pas de rupture détectée pour ce service
  }

  return (
    <section
      className="rounded-2xl border border-warn/50 bg-warn/10 p-5 sm:p-6"
      aria-label="Gestion des ruptures"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="size-6 text-warn shrink-0" />
          <div>
            <h2 className="font-display text-xl font-bold text-surface">
              {items.length} commande{items.length > 1 ? 's' : ''} affectée
              {items.length > 1 ? 's' : ''} par une rupture de livraison
            </h2>
            <p className="text-xs text-mist">
              La livraison reçue est inférieure aux portions réservées. Choisissez une substitution
              en stock ou annulez.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex min-h-9 items-center gap-1.5 self-start sm:self-auto rounded-lg border border-warn/40 bg-deep px-3 text-xs font-bold text-warn hover:bg-warn/20"
        >
          <RefreshCw className="size-3.5" /> Actualiser
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const chosenSubstitute =
            selectedSubstitutes[item.reservationId] ?? item.availableReplacements[0]?.mealId
          const isProcessing =
            resolveMutation.isPending &&
            resolveMutation.variables?.reservationId === item.reservationId

          return (
            <article
              key={item.reservationId}
              className="rounded-xl border border-warn/30 bg-deep p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-surface">{item.studentName}</span>
                  <span className="font-mono text-xs text-mist">({item.studentEmail})</span>
                  <span className="rounded bg-deep-2 px-2 py-0.5 text-xs font-mono text-highlight">
                    {item.slotTime}
                  </span>
                </div>
                <div className="mt-1 text-xs text-danger font-medium flex items-center gap-1.5">
                  <span>Produit manquant :</span>
                  {item.missingItems.map((m, idx) => (
                    <strong key={idx} className="underline">
                      {m.name} ({m.type})
                    </strong>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {item.availableReplacements.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={chosenSubstitute}
                      disabled={isProcessing}
                      onChange={(e) =>
                        setSelectedSubstitutes((prev) => ({
                          ...prev,
                          [item.reservationId]: e.target.value,
                        }))
                      }
                      aria-label="Produit de remplacement"
                      className="min-h-10 rounded-lg border border-mist/40 bg-deep-2 px-2.5 text-xs font-bold text-surface focus:ring-1 focus:ring-highlight"
                    >
                      {item.availableReplacements.map((r) => (
                        <option key={r.mealId} value={r.mealId}>
                          Remplacer par : {r.name} (Reste {r.availableStock})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isProcessing || !chosenSubstitute}
                      onClick={() =>
                        resolveMutation.mutate({
                          action: 'substitute',
                          reservationId: item.reservationId,
                          substituteMealId: chosenSubstitute,
                        })
                      }
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-highlight px-3 text-xs font-bold text-deep hover:bg-highlight/90 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Substituer
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-mist italic">Aucun remplacement en stock</span>
                )}

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    resolveMutation.mutate({
                      action: 'cancel',
                      reservationId: item.reservationId,
                      reason: 'Rupture fournisseur sans produit de substitution disponible',
                    })
                  }
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-danger/40 px-3 text-xs font-bold text-danger hover:bg-danger/10 disabled:opacity-50"
                >
                  <XCircle className="size-3.5" />
                  Annuler commande
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
