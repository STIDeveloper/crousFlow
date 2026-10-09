'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Undo2,
  Users,
  WifiOff,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type Product = {
  id: string
  name: string
  category: string
  productType: string
  sideCategory?: string | null
  active: boolean
}
type ServiceOffer = {
  id?: string
  productId?: string
  menuItemId?: string
  productName?: string
  meal?: { name?: string; productType?: string; category?: string }
  plannedQuantity?: number
  expectedQuantity?: number
  committedQuantity?: number
  physicalQuantity?: number
  allocatedQuantity?: number
  available?: boolean
}
type Service = {
  id: string
  serviceDate: string
  serviceKey?: string
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | string
  reservationClosesAt?: string
  offers?: ServiceOffer[]
  slots?: Array<{ id: string; startTime: string; endTime: string; capacity: number }>
}

function nextWeekday(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

function readList<T>(value: unknown, key: string): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'object' && value !== null && key in value) {
    const list = (value as Record<string, unknown>)[key]
    return Array.isArray(list) ? (list as T[]) : []
  }
  return []
}

function formatDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function AdminServices() {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(true)
  const [serviceDate, setServiceDate] = useState(nextWeekday)
  const [serviceKey, setServiceKey] = useState('LUNCH')
  const [reservationClosesAt, setReservationClosesAt] = useState('18:00')
  const [reservationDaysBefore, setReservationDaysBefore] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({})
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MAIN' | 'STARTER' | 'DESSERT'>(
    'ALL',
  )

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

  const productsQuery = useQuery<Product[]>({
    queryKey: ['admin', 'products', 'active'],
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/admin/products?active=true', { cache: 'no-store' })
      const data: unknown = await response.json().catch(() => [])
      if (!response.ok) throw new Error(readError(data, 'Le catalogue est indisponible.'))
      return readList<Product>(data, 'products').filter((product) => product.active !== false)
    },
  })

  const servicesQuery = useQuery<Service[]>({
    queryKey: ['admin', 'services', serviceDate],
    retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/admin/services?date=${serviceDate}`, { cache: 'no-store' })
      const data: unknown = await response.json().catch(() => [])
      if (!response.ok) throw new Error(readError(data, 'Les services sont indisponibles.'))
      return readList<Service>(data, 'services')
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const offers = Object.entries(selectedProducts).map(([productId, plannedQuantity]) => ({
        productId,
        plannedQuantity,
        expectedQuantity: plannedQuantity,
      }))
      if (!offers.length) throw new Error('Sélectionnez au moins un produit.')
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDate,
          serviceKey,
          reservationClosingTime: reservationClosesAt,
          reservationDaysBefore,
          reservationClosesAt: `${serviceDate}T${reservationClosesAt}:00+02:00`,
          offers,
        }),
      })
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readError(data, 'Le brouillon n’a pas été créé.'))
      return data
    },
    onSuccess: () => {
      setSelectedProducts({})
      void queryClient.invalidateQueries({ queryKey: ['admin', 'services', serviceDate] })
      toast.success('Brouillon de service enregistré.')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: 'PUBLISHED' | 'CLOSED' | 'DRAFT'
    }) => {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readError(data, 'Le statut du service n’a pas changé.'))
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'services', serviceDate] })
      void queryClient.invalidateQueries({ queryKey: ['menu'] })
      const label =
        variables.status === 'PUBLISHED'
          ? 'Service publié pour les étudiants.'
          : variables.status === 'DRAFT'
            ? 'Service dépublié (revenu en brouillon).'
            : 'Service clôturé.'
      toast.success(label)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' })
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readError(data, 'La suppression du brouillon a échoué.'))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'services', serviceDate] })
      toast.success('Brouillon supprimé.')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const [inspectOrdersServiceId, setInspectOrdersServiceId] = useState<string | null>(null)

  const ordersQuery = useQuery<
    Array<{
      id: string
      status: string
      fulfillmentStatus: string
      priceCents: number
      user?: { name: string; email: string }
      slot?: { startTime: string; endTime: string }
      menuItem?: { meal?: { name: string } }
      items?: Array<{ kind: string; menuItem?: { meal?: { name: string } } }>
    }>
  >({
    queryKey: ['admin', 'service-orders', inspectOrdersServiceId],
    enabled: Boolean(inspectOrdersServiceId),
    queryFn: async () => {
      if (!inspectOrdersServiceId) return []
      const res = await fetch(`/api/admin/services/${inspectOrdersServiceId}/orders`)
      const data: unknown = await res.json().catch(() => [])
      if (!res.ok) throw new Error(readError(data, 'Impossible de charger les commandes.'))
      return Array.isArray(data) ? data : []
    },
  })

  const activeProducts = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'ALL') return activeProducts
    if (categoryFilter === 'MAIN') return activeProducts.filter((p) => p.productType === 'MAIN')
    if (categoryFilter === 'STARTER')
      return activeProducts.filter(
        (p) =>
          p.sideCategory === 'STARTER' ||
          p.category.toLowerCase().includes('entree') ||
          p.category.toLowerCase().includes('entrée'),
      )
    if (categoryFilter === 'DESSERT')
      return activeProducts.filter(
        (p) => p.sideCategory === 'DESSERT' || p.category.toLowerCase().includes('dessert'),
      )
    return activeProducts
  }, [activeProducts, categoryFilter])

  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data])
  const currentDraft = useMemo(
    () => services.find((service) => service.status === 'DRAFT'),
    [services],
  )

  function toggleProduct(product: Product): void {
    setSelectedProducts((current) => {
      if (product.id in current) {
        const next = { ...current }
        delete next[product.id]
        return next
      }
      return { ...current, [product.id]: 40 }
    })
  }

  function autoSelectStandardFormula(): void {
    const main = activeProducts.find((p) => p.productType === 'MAIN')
    const starter = activeProducts.find(
      (p) =>
        p.sideCategory === 'STARTER' ||
        p.category.toLowerCase().includes('entree') ||
        p.category.toLowerCase().includes('entrée'),
    )
    const dessert = activeProducts.find(
      (p) => p.sideCategory === 'DESSERT' || p.category.toLowerCase().includes('dessert'),
    )
    const newSelected: Record<string, number> = {}
    if (main) newSelected[main.id] = 40
    if (starter) newSelected[starter.id] = 40
    if (dessert) newSelected[dessert.id] = 40
    setSelectedProducts(newSelected)
    toast.info('Formule standard 1 Plat + 1 Entrée + 1 Dessert pré-remplie à 40 portions.')
  }

  if (!isOnline && !servicesQuery.data) {
    return (
      <section
        role="status"
        className="rounded-2xl border border-warn/40 bg-night-2 p-8 text-center"
      >
        <WifiOff className="mx-auto mb-3 size-8 text-glow" />
        <h1 className="font-display text-2xl font-bold">Services hors ligne</h1>
        <p className="mt-2 text-sage">Reconnectez-vous pour préparer la publication.</p>
      </section>
    )
  }

  if (productsQuery.isLoading || servicesQuery.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2" aria-label="Chargement des services">
        <div className="h-96 animate-pulse rounded-2xl bg-night-2" />
        <div className="h-96 animate-pulse rounded-2xl bg-night-2" />
      </div>
    )
  }

  if (productsQuery.isError || servicesQuery.isError) {
    const error = productsQuery.error ?? servicesQuery.error
    return (
      <section
        role="alert"
        className="rounded-2xl border border-danger/40 bg-night-2 p-8 text-center"
      >
        <AlertTriangle className="mx-auto mb-3 size-8 text-danger" />
        <h1 className="font-display text-2xl font-bold">
          La préparation du service est indisponible.
        </h1>
        <p className="mt-2 text-sage">{error?.message}</p>
        <button
          type="button"
          onClick={() => {
            void productsQuery.refetch()
            void servicesQuery.refetch()
          }}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sage/40 px-4 font-bold"
        >
          <RefreshCw className="size-4" /> Réessayer
        </button>
      </section>
    )
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6">
      {!isOnline ? (
        <div role="alert" className="rounded-xl border border-warn/50 bg-warn/15 p-4 text-sm">
          <strong>Hors ligne.</strong> Les services restent consultables, les mutations sont
          désactivées.
        </div>
      ) : null}
      <header className="flex flex-col gap-4 rounded-2xl border border-sage/20 bg-night-2 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-glow">
            Publication du menu
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Services & Menus</h1>
          <p className="mt-2 text-sage">
            Composez le service, fixez les quantités attendues, puis publiez-le pour l’étudiant.
          </p>
        </div>
        <label className="grid gap-1 text-sm font-bold text-sage">
          Date de service
          <input
            type="date"
            value={serviceDate}
            onChange={(event) => setServiceDate(event.target.value)}
            className="min-h-11 rounded-xl border border-sage/40 bg-night px-3 font-mono text-paper"
          />
        </label>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-2xl border border-sage/20 bg-night-2 p-5 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">{formatDate(serviceDate)}</h2>
              <p className="mt-1 text-sm text-sage">
                Sélectionnez les produits pour composer le menu du service.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={autoSelectStandardFormula}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-glow/40 bg-glow/10 px-3 text-xs font-bold text-glow hover:bg-glow/20 transition-colors"
              >
                + Formule standard
              </button>
            </div>
          </div>

          {/* Filtres par type */}
          <div className="mt-4 flex flex-wrap gap-2 border-b border-sage/15 pb-3">
            <span className="flex items-center text-xs font-bold text-sage mr-2">
              <Filter className="size-3.5 mr-1" /> Filtrer :
            </span>
            {(['ALL', 'MAIN', 'STARTER', 'DESSERT'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${categoryFilter === cat ? 'bg-glow text-night' : 'bg-night border border-sage/25 text-sage hover:text-paper'}`}
              >
                {cat === 'ALL'
                  ? 'Tous'
                  : cat === 'MAIN'
                    ? 'Plats'
                    : cat === 'STARTER'
                      ? 'Entrées'
                      : 'Desserts'}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 max-h-[28rem] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-sage/30 p-5 text-center text-sage">
                Aucun produit dans cette catégorie.
              </p>
            ) : (
              filteredProducts.map((product) => {
                const selected = product.id in selectedProducts
                return (
                  <article
                    key={product.id}
                    className={`rounded-xl border p-4 transition-colors ${selected ? 'border-glow/60 bg-glow/10' : 'border-sage/20 bg-night'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleProduct(product)}
                        className="size-5 rounded border-sage/40"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-paper">{product.name}</h3>
                          <span className="rounded bg-sage/15 px-2 py-0.5 text-xs text-sage font-medium">
                            {product.sideCategory === 'STARTER'
                              ? 'Entrée'
                              : product.sideCategory === 'DESSERT'
                                ? 'Dessert'
                                : product.productType === 'MAIN'
                                  ? 'Plat'
                                  : product.category}
                          </span>
                        </div>
                      </div>
                      {selected ? (
                        <label className="flex items-center gap-2 text-sm font-bold">
                          Prévu
                          <input
                            type="number"
                            min="0"
                            value={selectedProducts[product.id]}
                            onChange={(event) =>
                              setSelectedProducts((current) => ({
                                ...current,
                                [product.id]: Number(event.target.value),
                              }))
                            }
                            className="min-h-10 w-20 rounded-lg border border-sage/40 bg-night px-2 text-right font-mono"
                          />
                        </label>
                      ) : null}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (isOnline) createMutation.mutate()
          }}
          className="h-fit rounded-2xl border border-glow/30 bg-night-2 p-5 sm:p-7"
        >
          <h2 className="font-display text-2xl font-bold">Nouveau brouillon</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-bold">
              Service
              <select
                value={serviceKey}
                onChange={(event) => setServiceKey(event.target.value)}
                className="min-h-11 rounded-xl border border-sage/40 bg-night px-3 font-normal"
              >
                <option value="LUNCH">Midi (Déjeuner)</option>
                <option value="DINNER">Soir (Dîner)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Clôture des réservations
              <select
                value={reservationDaysBefore}
                onChange={(event) => setReservationDaysBefore(Number(event.target.value))}
                className="min-h-11 rounded-xl border border-sage/40 bg-night px-3 font-normal"
              >
                <option value={1}>La veille (J-1 à {reservationClosesAt}) — Standard CROUS</option>
                <option value={0}>Le jour même (Jour J à {reservationClosesAt})</option>
                <option value={2}>Deux jours avant (J-2)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Heure limite de clôture
              <input
                type="time"
                value={reservationClosesAt}
                onChange={(event) => setReservationClosesAt(event.target.value)}
                className="min-h-11 rounded-xl border border-sage/40 bg-night px-3 font-mono font-normal"
              />
            </label>
            <div className="rounded-xl bg-night p-3 border border-sage/20 text-xs text-sage">
              <strong className="text-paper">{Object.keys(selectedProducts).length}</strong>{' '}
              produit(s) sélectionné(s) pour ce service.
            </div>
          </div>
          <button
            type="submit"
            disabled={
              !isOnline || createMutation.isPending || !Object.keys(selectedProducts).length
            }
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-glow px-5 font-bold text-night disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
            ) : (
              <Check className="size-5" />
            )}{' '}
            Enregistrer le brouillon
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-sage/20 bg-night-2 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">
              Services du {formatDate(serviceDate)}
            </h2>
            <p className="mt-1 text-sm text-sage">
              Suivez l&apos;état des services : Préparation (DRAFT), Ouvert aux réservations
              (PUBLISHED), ou Clôturé (CLOSED).
            </p>
          </div>
          <button
            type="button"
            onClick={() => void servicesQuery.refetch()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sage/40 px-3 text-sm font-bold"
          >
            <RefreshCw className="size-4" /> Actualiser
          </button>
        </div>

        {services.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-sage/30 p-6 text-center text-sage">
            Aucun service configuré pour cette date.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {services.map((service) => {
              const isClosed = service.status === 'CLOSED'
              const isPublished = service.status === 'PUBLISHED'
              const totalCommitted = (service.offers ?? []).reduce(
                (acc, o) => acc + (o.committedQuantity ?? 0),
                0,
              )
              const totalPhysical = (service.offers ?? []).reduce(
                (acc, o) => acc + (o.physicalQuantity ?? 0),
                0,
              )
              const totalPlanned = (service.offers ?? []).reduce(
                (acc, o) => acc + (o.plannedQuantity ?? 0),
                0,
              )

              return (
                <article
                  key={service.id}
                  className="rounded-xl border border-sage/20 bg-night p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-glow">
                          {service.serviceKey === 'DINNER' ? 'Service du soir' : 'Service du midi'}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <h3 className="font-display text-2xl font-bold text-paper">
                            {service.status}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isPublished ? 'bg-ok/20 text-ok' : isClosed ? 'bg-warn/20 text-warn' : 'bg-sage/20 text-sage'}`}
                          >
                            {isPublished
                              ? 'Réservations ouvertes'
                              : isClosed
                                ? 'Service clôturé'
                                : 'Brouillon interne'}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full border border-sage/30 px-3 py-1 text-xs font-bold text-sage">
                        {service.offers?.length ?? 0} produit
                        {(service.offers?.length ?? 0) > 1 ? 's' : ''}
                      </span>
                    </div>

                    {service.reservationClosesAt ? (
                      <p className="mt-2 text-xs text-sage">
                        Réservations jusqu’au{' '}
                        {new Date(service.reservationClosesAt).toLocaleString('fr-FR')}
                      </p>
                    ) : null}

                    {/* Tableau comparatif des stocks */}
                    <div className="mt-4 w-full min-w-0 overflow-x-auto rounded-xl border border-sage/15 bg-night-2/70 p-3">
                      <div className="grid grid-cols-4 gap-2 text-xs font-bold text-sage pb-1.5 border-b border-sage/15">
                        <span className="col-span-1">Produit</span>
                        <span className="text-right">Prévu</span>
                        <span className="text-right text-glow">Réservé</span>
                        <span className="text-right text-ok">Reçu</span>
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {(service.offers ?? []).map((offer, index) => (
                          <li
                            key={offer.id ?? offer.productId ?? index}
                            className="grid grid-cols-4 gap-2 text-xs items-center"
                          >
                            <span className="truncate font-medium text-paper">
                              {offer.productName ??
                                offer.meal?.name ??
                                offer.productId ??
                                'Produit'}
                            </span>
                            <span className="text-right font-mono text-sage">
                              {offer.plannedQuantity ?? offer.expectedQuantity ?? 0}
                            </span>
                            <span className="text-right font-mono font-bold text-glow">
                              {offer.committedQuantity ?? 0}
                            </span>
                            <span className="text-right font-mono text-ok">
                              {offer.physicalQuantity ?? 0}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Synthèse du service */}
                    <div className="mt-3 flex items-center justify-between text-xs text-sage px-1">
                      <span>
                        Total prévu : <strong className="text-paper">{totalPlanned}</strong>
                      </span>
                      <span>
                        Total réservé : <strong className="text-glow">{totalCommitted}</strong>
                      </span>
                      <span>
                        Total reçu : <strong className="text-ok">{totalPhysical}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 pt-3 border-t border-sage/15">
                    {/* Bouton pour voir les commandes du service */}
                    <button
                      type="button"
                      onClick={() => setInspectOrdersServiceId(service.id)}
                      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-sage/30 bg-night px-4 text-xs font-bold text-paper hover:bg-sage/10 transition-colors"
                    >
                      <Users className="size-3.5 text-glow" />
                      Voir les commandes ({totalCommitted})
                    </button>

                    {service.status === 'DRAFT' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!isOnline || statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ id: service.id, status: 'PUBLISHED' })
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-glow px-3 text-xs font-bold text-night disabled:opacity-50"
                        >
                          <Send className="size-3.5" /> Publier
                        </button>
                        <button
                          type="button"
                          disabled={!isOnline || deleteDraftMutation.isPending}
                          onClick={() => deleteDraftMutation.mutate(service.id)}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-danger/40 px-3 text-xs font-bold text-danger hover:bg-danger/10 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" /> Supprimer
                        </button>
                      </div>
                    ) : service.status === 'PUBLISHED' ? (
                      <div className="flex flex-col gap-2">
                        <a
                          href={`/menu?date=${service.serviceDate.slice(0, 10)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-glow/40 bg-glow/10 px-4 text-xs font-bold text-glow hover:bg-glow/20 transition-colors"
                        >
                          <Eye className="size-3.5" /> Voir le menu tel qu’affiché aux étudiants{' '}
                          <ExternalLink className="size-3" />
                        </a>
                        <button
                          type="button"
                          disabled={!isOnline || statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ id: service.id, status: 'CLOSED' })
                          }
                          className="min-h-11 w-full rounded-xl border border-danger/50 px-4 text-xs font-bold text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                        >
                          Clôturer les réservations & le service
                        </button>
                        {totalCommitted === 0 ? (
                          <button
                            type="button"
                            disabled={!isOnline || statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({ id: service.id, status: 'DRAFT' })
                            }
                            className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-sage/30 px-3 text-xs font-bold text-sage hover:text-paper hover:bg-sage/10"
                          >
                            <Undo2 className="size-3.5" /> Dépublier (repasser en brouillon)
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="rounded-xl bg-sage/10 p-2 text-center text-xs text-sage font-medium">
                          Service clôturé. Réconciliation disponible pour le bilan CROUS.
                        </p>
                        <a
                          href="/api/admin/export?type=reservations"
                          download
                          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-sage/40 bg-sage/10 px-4 text-xs font-bold text-paper hover:bg-sage/20 transition-colors"
                        >
                          <Download className="size-3.5 text-glow" /> Exporter le bilan des
                          réservations (CSV)
                        </a>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal Consultation des commandes du service */}
      {inspectOrdersServiceId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-glow/40 bg-night-2 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sage/20 pb-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-paper">Commandes du Service</h3>
                <p className="text-xs text-sage">
                  Liste nominative des réservations étudiantes et composition des plateaux.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectOrdersServiceId(null)}
                className="grid size-10 place-items-center rounded-full border border-sage/30 text-sage hover:text-paper hover:bg-sage/10"
              >
                <X className="size-5" />
              </button>
            </div>

            {ordersQuery.isLoading ? (
              <div className="flex min-h-56 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-glow" />
              </div>
            ) : (ordersQuery.data ?? []).length === 0 ? (
              <p className="py-12 text-center text-sm text-sage">
                Aucune réservation pour ce service pour le moment.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-sage/20 text-sage uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3">Étudiant</th>
                      <th className="px-3 py-3">Créneau</th>
                      <th className="px-3 py-3">Composition</th>
                      <th className="px-3 py-3">Prix</th>
                      <th className="px-3 py-3">Stock</th>
                      <th className="px-3 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage/10">
                    {(ordersQuery.data ?? []).map((o) => {
                      const items = (o.items ?? [])
                        .map((it) => it.menuItem?.meal?.name)
                        .filter(Boolean)
                        .join(', ')
                      return (
                        <tr key={o.id} className="hover:bg-sage/5">
                          <td className="px-3 py-3">
                            <strong className="text-paper">{o.user?.name ?? 'Étudiant'}</strong>
                            <div className="text-sage/70 font-mono text-[11px]">
                              {o.user?.email}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-glow">
                            {o.slot?.startTime}–{o.slot?.endTime}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-paper">
                              {o.menuItem?.meal?.name ?? 'Plat'}
                            </div>
                            {items ? (
                              <div className="text-sage/80 text-[11px]">+ {items}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-paper">
                            {(o.priceCents / 100).toFixed(2)} €
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded px-2 py-0.5 font-bold text-[10px] ${
                                o.fulfillmentStatus === 'READY'
                                  ? 'bg-ok/20 text-ok'
                                  : o.fulfillmentStatus === 'BLOCKED'
                                    ? 'bg-danger/20 text-danger'
                                    : 'bg-warn/20 text-warn'
                              }`}
                            >
                              {o.fulfillmentStatus}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded px-2 py-0.5 font-bold text-[10px] ${
                                o.status === 'CONSUMED'
                                  ? 'bg-forest/20 text-forest'
                                  : o.status === 'CANCELLED'
                                    ? 'bg-danger/20 text-danger'
                                    : 'bg-glow/20 text-glow'
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {currentDraft ? (
        <p className="text-xs text-sage">Brouillon en cours de composition : {currentDraft.id}</p>
      ) : null}
    </div>
  )
}
