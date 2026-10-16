'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Plus, Sandwich } from 'lucide-react'
import { toast } from 'sonner'

type StandaloneProduct = {
  id: string
  name: string
  category: string
  priceCents: number
  allergens: string
  servedToday: number
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

export function KitchenStandaloneCounter({ serviceDate }: { serviceDate: string }) {
  const queryClient = useQueryClient()

  const { data: products, isLoading } = useQuery<StandaloneProduct[]>({
    queryKey: ['kitchen', 'standalone-stock', serviceDate],
    queryFn: async () => {
      const res = await fetch(`/api/kitchen/standalone-stock?date=${serviceDate}`)
      const data: unknown = await res.json().catch(() => [])
      if (!res.ok) throw new Error(readError(data, 'Stock produits froids indisponible.'))
      return Array.isArray(data) ? (data as StandaloneProduct[]) : []
    },
  })

  const saleMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const res = await fetch('/api/kitchen/standalone-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealId, quantity: 1 }),
      })
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(readError(data, 'Échec de l’enregistrement de la sortie.'))
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kitchen', 'standalone-stock', serviceDate] })
      toast.success('Vente comptoir enregistrée (-1 portion déstockée).', {
        icon: <CheckCircle2 className="text-ok" />,
      })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const list = products ?? []

  return (
    <section
      className="rounded-2xl border border-mist/20 bg-deep-2 p-5 sm:p-6"
      aria-label="Produits froids et libre-service"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sandwich className="size-5 text-highlight" />
          <h2 className="font-display text-2xl font-bold text-surface">
            Comptoir Libre-Service (Produits Froids)
          </h2>
        </div>
        <span className="rounded-full bg-mist/15 px-3 py-1 text-xs font-bold text-mist">
          Ventes directes sans réservation
        </span>
      </div>
      <p className="mt-1 text-sm text-mist">
        Sandwichs, salades et desserts froids disponibles directement sur place pour les étudiants
        sans réservation préalable. Le paiement s’effectue sur le TPE CROUS officiel.
      </p>

      {isLoading ? (
        <div className="mt-4 flex min-h-24 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-highlight" />
        </div>
      ) : list.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-mist/25 p-4 text-center text-xs text-mist">
          Aucun produit configuré en libre-service dans le catalogue. Ajoutez des produits de type
          &quot;Produit froid / Libre-service&quot; depuis l&apos;administration.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((prod) => {
            const isSelling = saleMutation.isPending && saleMutation.variables === prod.id
            return (
              <article
                key={prod.id}
                className="rounded-xl border border-mist/20 bg-deep p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-surface text-sm">{prod.name}</h3>
                    <span className="font-mono text-xs font-bold text-highlight">
                      {(prod.priceCents / 100).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-mist">{prod.category}</p>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-mist/10">
                  <span className="text-xs text-mist">
                    Vendus aujourd&apos;hui :{' '}
                    <strong className="text-surface font-mono">{prod.servedToday}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={isSelling}
                    onClick={() => saleMutation.mutate(prod.id)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-highlight/15 border border-highlight/30 px-3 text-xs font-bold text-highlight hover:bg-highlight/25 transition-colors disabled:opacity-50"
                  >
                    {isSelling ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Sortie comptoir
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
