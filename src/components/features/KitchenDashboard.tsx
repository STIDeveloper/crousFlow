'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ChefHat,
  ChevronDown,
  ClipboardCheck,
  Info,
  Minus,
  Plus,
  RefreshCw,
  Truck,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { KitchenReceptionPanel } from './KitchenReceptionPanel'
import { KitchenTicketDesk } from './KitchenTicketDesk'
import { KitchenShortageManager } from './KitchenShortageManager'
import { KitchenStandaloneCounter } from './KitchenStandaloneCounter'

type Batch = {
  id: string
  mealId: string
  meal?: { name: string }
  predictedCount: number
  preparedCount: number
  status: string
}
type Forecast = {
  mealId: string
  mealName?: string
  predicted: number
  lower: number
  upper: number
  method: string
  explanation?: string
  suggestedAction?: string
  level?: 'info' | 'warn' | 'danger'
  source?: 'gemini' | 'local'
}
type ForecastResponse = {
  forecasts: Forecast[]
  evaluations: { modelMAE?: number; naiveMAE?: number }[]
}

type SlotSummary = {
  id: string
  startTime: string
  endTime: string
  meals: { id: string; name: string; count: number }[]
  products: { id: string; name: string; count: number; productType: string }[]
  totalCount: number
}

function getNextServiceDate(): string {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + 1)

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1)
  }

  return date.toISOString().slice(0, 10)
}

function ScreenState({ kind, retry }: { kind: 'empty' | 'error'; retry?: () => void }) {
  const copy =
    kind === 'error'
      ? ['Impossible de charger le poste cuisine.', 'Vérifiez la connexion puis réessayez.']
      : [
          'Aucune production planifiée à cette date.',
          'Les lots apparaîtront dès que des repas seront configurés.',
        ]
  return (
    <section
      className="rounded-2xl border border-mist/25 bg-deep-2 p-8 text-center"
      role={kind === 'error' ? 'alert' : undefined}
    >
      <AlertTriangle className="mx-auto mb-3 size-8 text-warn" aria-hidden="true" />
      <h2 className="font-display text-xl font-bold">{copy[0]}</h2>
      <p className="mt-2 text-sm text-mist">{copy[1]}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-5 min-h-11 rounded-xl border border-mist/50 px-4 font-bold hover:bg-mist/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
        >
          Réessayer
        </button>
      )}
    </section>
  )
}

export function KitchenDashboard() {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(true)
  const [serviceDate, setServiceDate] = useState(getNextServiceDate)
  const [activeTab, setActiveTab] = useState<'comptoir' | 'reception' | 'production'>('comptoir')
  const [showIdleBatches, setShowIdleBatches] = useState(false)
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    update()
    addEventListener('online', update)
    addEventListener('offline', update)
    return () => {
      removeEventListener('online', update)
      removeEventListener('offline', update)
    }
  }, [])
  const batchesQuery = useQuery<Batch[]>({
    queryKey: ['kitchen', 'batches', serviceDate],
    queryFn: async () => {
      const res = await fetch(`/api/kitchen/batches?date=${serviceDate}`)
      if (!res.ok) throw new Error('Lots indisponibles')
      return res.json()
    },
  })
  const forecastQuery = useQuery<ForecastResponse>({
    queryKey: ['kitchen', 'forecast', serviceDate],
    queryFn: async () => {
      const res = await fetch(`/api/kitchen/forecast?date=${serviceDate}`)
      if (!res.ok) throw new Error('Prévisions indisponibles')
      return res.json()
    },
  })
  const slotsSummaryQuery = useQuery<SlotSummary[]>({
    queryKey: ['kitchen', 'slots-summary', serviceDate],
    queryFn: async () => {
      const res = await fetch(`/api/kitchen/slots-summary?date=${serviceDate}`)
      if (!res.ok) throw new Error('Résumés par créneau indisponibles')
      return res.json()
    },
  })
  useEffect(() => {
    if (!forecastQuery.isSuccess) return

    void queryClient.refetchQueries({
      queryKey: ['kitchen', 'batches', serviceDate],
      type: 'active',
    })
  }, [forecastQuery.dataUpdatedAt, forecastQuery.isSuccess, queryClient, serviceDate])
  const updateBatch = useMutation({
    mutationFn: async ({ id, preparedCount }: { id: string; preparedCount: number }) => {
      const res = await fetch('/api/kitchen/batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, preparedCount }),
      })
      if (!res.ok) throw new Error('La quantité n’a pas été enregistrée.')
      return res.json()
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: ['kitchen', 'batches', serviceDate] })
      const previous = queryClient.getQueryData<Batch[]>(['kitchen', 'batches', serviceDate])
      queryClient.setQueryData<Batch[]>(['kitchen', 'batches', serviceDate], (old) =>
        old?.map((batch) =>
          batch.id === change.id ? { ...batch, preparedCount: change.preparedCount } : batch,
        ),
      )
      return { previous }
    },
    onError: (error: Error, _change, context) => {
      if (context?.previous)
        queryClient.setQueryData(['kitchen', 'batches', serviceDate], context.previous)
      toast.error(error.message)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['kitchen', 'batches', serviceDate] }),
  })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['kitchen'] })
    toast('Actualisation demandée.')
  }
  const batches = batchesQuery.data ?? []
  const forecasts = forecastQuery.data?.forecasts ?? []
  const slotsSummary = slotsSummaryQuery.data ?? []
  const totalPrepared = batches.reduce((sum, batch) => sum + batch.preparedCount, 0)
  const totalPredicted = batches.reduce((sum, batch) => sum + batch.predictedCount, 0)
  const sortedBatches = [...batches].sort(
    (a, b) => b.predictedCount - a.predictedCount || b.preparedCount - a.preparedCount,
  )
  const activeBatches = sortedBatches.filter(
    (batch) => batch.predictedCount > 0 || batch.preparedCount > 0,
  )
  const idleBatches = sortedBatches.filter(
    (batch) => batch.predictedCount === 0 && batch.preparedCount === 0,
  )
  const visibleBatches = showIdleBatches ? sortedBatches : activeBatches
  const chartData = activeBatches.map((batch) => ({
    name: batch.meal?.name ?? 'Repas',
    cible: batch.predictedCount,
    prepare: batch.preparedCount,
  }))
  const demandForecasts = forecasts.filter((forecast) => forecast.predicted > 0)
  const idleForecasts = forecasts.filter((forecast) => forecast.predicted <= 0)
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:gap-8">
      {!isOnline && (
        <div
          className="rounded-xl border border-warn/60 bg-warn/15 p-4 text-sm text-surface"
          role="alert"
        >
          <strong>Hors ligne.</strong> Les quantités affichées restent consultables, mais aucune
          action ne sera enregistrée.
        </div>
      )}
      <header className="flex flex-col gap-4 rounded-2xl border border-mist/20 bg-deep-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-mist">
            Le bon repas. Au bon moment.
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold capitalize sm:text-5xl">
            {new Date(`${serviceDate}T12:00:00`).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h1>
          <p className="mt-1 text-sm text-mist">
            Saisissez les quantités préparées, puis validez les tickets au retrait.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-bold text-mist" htmlFor="service-date">
            Date de service
            <input
              id="service-date"
              type="date"
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
              className="min-h-11 rounded-xl border border-mist/45 bg-deep px-3 font-mono text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
            />
          </label>
          <button
            onClick={refresh}
            disabled={!isOnline}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-mist/45 px-4 font-bold hover:bg-mist/15 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Actualiser
          </button>
        </div>
      </header>

      {/* Barre d'onglets pour navigation fluide du cuisinier */}
      <nav
        aria-label="Espaces cuisine"
        className="flex flex-wrap gap-2 border-b border-mist/20 pb-3"
      >
        <button
          type="button"
          onClick={() => setActiveTab('comptoir')}
          className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-highlight ${
            activeTab === 'comptoir'
              ? 'bg-highlight text-deep shadow-md'
              : 'border border-mist/25 bg-deep-2 text-mist hover:text-surface'
          }`}
        >
          <ClipboardCheck className="size-4" />
          Retraits & Comptoir
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reception')}
          className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-highlight ${
            activeTab === 'reception'
              ? 'bg-highlight text-deep shadow-md'
              : 'border border-mist/25 bg-deep-2 text-mist hover:text-surface'
          }`}
        >
          <Truck className="size-4" />
          Livraisons & Ruptures
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('production')}
          className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all focus-visible:outline-2 focus-visible:outline-highlight ${
            activeTab === 'production'
              ? 'bg-highlight text-deep shadow-md'
              : 'border border-mist/25 bg-deep-2 text-mist hover:text-surface'
          }`}
        >
          <ChefHat className="size-4" />
          Production & Prévisions
        </button>
      </nav>

      {/* ONGLET 1 : COMPTOIR & RETRAITS */}
      {activeTab === 'comptoir' && (
        <div className="space-y-6">
          <KitchenTicketDesk
            isOnline={isOnline}
            onCompleted={() => void queryClient.invalidateQueries({ queryKey: ['kitchen'] })}
          />
          <KitchenStandaloneCounter serviceDate={serviceDate} />
        </div>
      )}

      {/* ONGLET 2 : LIVRAISONS & RUPTURES */}
      {activeTab === 'reception' && (
        <div className="space-y-6">
          <KitchenReceptionPanel serviceDate={serviceDate} />
          <KitchenShortageManager serviceDate={serviceDate} />
        </div>
      )}

      {/* ONGLET 3 : PRODUCTION & PRÉVISIONS */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          <section aria-label="Production du service" className="grid grid-cols-2 gap-3 sm:gap-5">
            <article className="rounded-[2rem] bg-highlight p-5 text-deep sm:p-8">
              <p className="text-xs font-bold uppercase tracking-widest">Repas à préparer</p>
              <p className="mt-3 font-display text-5xl font-bold tabular-nums sm:text-7xl">
                {totalPredicted}
              </p>
              <p className="mt-2 text-sm">La cible de votre prochain service</p>
            </article>
            <article className="rounded-[2rem] border border-mist/25 bg-deep-2 p-5 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-mist">Déjà préparés</p>
              <p className="mt-3 font-display text-5xl font-bold tabular-nums text-ok sm:text-7xl">
                {totalPrepared}
              </p>
              <p className="mt-2 text-sm text-mist">Chaque portion compte.</p>
            </article>
          </section>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-highlight/35 bg-deep-2 p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-bold">À préparer</h2>
                  <p className="mt-1 text-sm text-mist">
                    Cible fondée sur les réservations et la prévision.
                  </p>
                </div>
                <span className="rounded-full bg-highlight/15 px-3 py-1 text-sm font-bold text-highlight">
                  {totalPrepared}/{totalPredicted}
                </span>
              </div>
              {batchesQuery.isLoading ? (
                <div className="mt-6 h-40 animate-pulse rounded-xl bg-deep" />
              ) : batchesQuery.isError ? (
                <div className="pt-5">
                  <ScreenState kind="error" retry={() => void batchesQuery.refetch()} />
                </div>
              ) : batches.length === 0 ? (
                <div className="pt-5">
                  <ScreenState kind="empty" />
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {visibleBatches.map((batch) => {
                    const progress = batch.predictedCount
                      ? Math.min(
                          100,
                          Math.round((batch.preparedCount / batch.predictedCount) * 100),
                        )
                      : 0
                    const busy = updateBatch.isPending
                    return (
                      <article
                        key={batch.id}
                        className="rounded-xl border border-mist/20 bg-deep p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-bold">{batch.meal?.name ?? 'Repas'}</h3>
                            <p className="text-sm text-mist">
                              {batch.preparedCount} préparés · cible {batch.predictedCount}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              aria-label={`Retirer 10 repas pour ${batch.meal?.name ?? 'ce repas'}`}
                              onClick={() =>
                                updateBatch.mutate({
                                  id: batch.id,
                                  preparedCount: Math.max(0, batch.preparedCount - 10),
                                })
                              }
                              disabled={busy || !isOnline}
                              className="grid size-11 place-items-center rounded-xl bg-mist/15 hover:bg-mist/30 disabled:opacity-50"
                            >
                              <Minus className="size-5" />
                            </button>
                            <output
                              className="min-w-11 text-center text-xl font-bold"
                              aria-live="polite"
                            >
                              {batch.preparedCount}
                            </output>
                            <button
                              aria-label={`Ajouter 10 repas pour ${batch.meal?.name ?? 'ce repas'}`}
                              onClick={() =>
                                updateBatch.mutate({
                                  id: batch.id,
                                  preparedCount: batch.preparedCount + 10,
                                })
                              }
                              disabled={busy || !isOnline}
                              className="grid size-11 place-items-center rounded-xl bg-mist/15 hover:bg-mist/30 disabled:opacity-50"
                            >
                              <Plus className="size-5" />
                            </button>
                          </div>
                        </div>
                        <div
                          className="mt-4 h-2 overflow-hidden rounded-full bg-deep-2"
                          aria-label={`${progress}% de la cible préparée`}
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full bg-highlight transition-[width] motion-reduce:transition-none"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </article>
                    )
                  })}
                  {idleBatches.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowIdleBatches((value) => !value)}
                      aria-expanded={showIdleBatches}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-mist/25 text-sm font-bold text-mist hover:bg-deep hover:text-surface"
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${showIdleBatches ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                      {showIdleBatches
                        ? 'Masquer les produits sans demande'
                        : `Afficher les produits sans demande (${idleBatches.length})`}
                    </button>
                  ) : null}
                </div>
              )}
            </section>
            <div className="space-y-6">
              <section className="min-w-0 rounded-2xl border border-mist/20 bg-deep-2 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Cible de service</h2>
                    <p className="mt-1 text-sm text-mist">
                      Comparaison des quantités préparées et prévues par plat.
                    </p>
                  </div>
                  <span className="rounded-full border border-mist/30 px-3 py-1 text-xs font-bold text-mist">
                    {forecasts[0]?.method === 'FALLBACK'
                      ? 'Mode secours'
                      : 'Estimation statistique'}
                  </span>
                </div>
                {chartData.length ? (
                  <div className="mt-5 h-72 w-full min-w-0 min-h-[288px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
                        barGap={4}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--color-line)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          stroke="var(--color-mist)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          tickFormatter={(value: string) =>
                            value.length > 14 ? `${value.slice(0, 13)}…` : value
                          }
                        />
                        <YAxis
                          stroke="var(--color-mist)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--color-line)', opacity: 0.35 }}
                          contentStyle={{
                            backgroundColor: 'var(--color-deep-2)',
                            borderColor: 'var(--color-line)',
                            borderRadius: '12px',
                            color: 'var(--color-surface)',
                          }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, color: 'var(--color-mist)' }}
                        />
                        <Bar
                          isAnimationActive={false}
                          dataKey="cible"
                          name="Cible"
                          fill="var(--color-highlight)"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={36}
                        />
                        <Bar
                          isAnimationActive={false}
                          dataKey="prepare"
                          name="Préparé"
                          fill="var(--color-ok)"
                          radius={[8, 8, 0, 0]}
                          maxBarSize={36}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-mist">Aucune donnée à comparer.</p>
                )}
              </section>
            </div>
          </div>

          <section className="rounded-2xl border border-mist/20 bg-deep-2 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Répartition par créneau</h2>
                <p className="mt-1 text-sm text-mist">
                  Quantités réservées par produit et par créneau de retrait.
                </p>
              </div>
            </div>
            <div className="mt-6">
              {slotsSummaryQuery.isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="h-28 animate-pulse rounded-xl bg-deep" />
                  <div className="h-28 animate-pulse rounded-xl bg-deep" />
                  <div className="h-28 animate-pulse rounded-xl bg-deep" />
                </div>
              ) : slotsSummary.length === 0 ? (
                <p className="text-center text-sm text-mist">Aucun créneau prévu à cette date.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {slotsSummary.map((slot) => (
                    <article
                      key={slot.id}
                      className="rounded-xl border border-mist/20 bg-deep p-4 flex flex-col"
                    >
                      <div className="flex items-center justify-between border-b border-mist/10 pb-3">
                        <span className="font-mono text-lg font-bold text-highlight">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <span className="rounded-full bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary">
                          {slot.totalCount} repas
                        </span>
                      </div>
                      <ul className="mt-3 flex-1 space-y-2">
                        {slot.products.map((product) => (
                          <li
                            key={product.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate pr-2">
                              {product.name}
                              <span className="ml-2 text-[10px] uppercase text-mist">
                                {product.productType === 'MAIN'
                                  ? 'plat'
                                  : product.productType === 'SIDE'
                                    ? 'périphérique'
                                    : 'supplément'}
                              </span>
                            </span>
                            <span className="font-bold">{product.count}</span>
                          </li>
                        ))}
                        {slot.products.length === 0 && (
                          <li className="text-sm text-mist italic">Aucune commande</li>
                        )}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-mist/20 bg-deep-2 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Info className="size-5 text-highlight" />
              <h2 className="font-display text-2xl font-bold">Analyse de production</h2>
            </div>
            <p className="mt-1 text-sm text-mist">
              Indications issues des données de démonstration ; elles aident à ajuster la
              production, sans garantir un volume final.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {forecastQuery.isLoading ? (
                <>
                  <div className="h-28 animate-pulse rounded-xl bg-deep" />
                  <div className="h-28 animate-pulse rounded-xl bg-deep" />
                </>
              ) : forecasts.length ? (
                demandForecasts.map((forecast) => (
                  <article
                    key={forecast.mealId}
                    className="rounded-xl border border-mist/20 bg-deep p-4"
                  >
                    <div className="flex gap-3">
                      <span className="pt-1">
                        {forecast.level === 'danger' ? (
                          <AlertTriangle className="size-5 text-danger" aria-label="Alerte" />
                        ) : forecast.level === 'warn' || forecast.method === 'FALLBACK' ? (
                          <AlertTriangle className="size-5 text-warn" aria-label="Vigilance" />
                        ) : (
                          <Info className="size-5 text-highlight" aria-label="Information" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold">{forecast.mealName ?? 'Repas'}</h3>
                          {forecast.source ? (
                            <span className="rounded-full border border-mist/30 px-2 py-0.5 text-[11px] font-bold text-mist">
                              {forecast.source === 'gemini'
                                ? 'Expliqué par Gemini'
                                : 'Calcul local'}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-mist">
                          Cible : {forecast.predicted} repas · fourchette {forecast.lower}–
                          {forecast.upper}
                        </p>
                        <p className="mt-2 text-sm text-surface/85">
                          {forecast.explanation ??
                            'Estimation générée à partir des données disponibles.'}
                        </p>
                        {forecast.suggestedAction ? (
                          <p className="mt-2 text-sm font-bold text-highlight">
                            → {forecast.suggestedAction}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-mist">Aucune recommandation pour cette date.</p>
              )}
              {!forecastQuery.isLoading && idleForecasts.length > 0 ? (
                <article className="rounded-xl border border-dashed border-mist/25 bg-deep p-4 md:col-span-2">
                  <p className="text-sm font-bold text-surface">
                    Sans demande prévue pour ce service
                  </p>
                  <p className="mt-1 text-sm text-mist">
                    {idleForecasts.map((forecast) => forecast.mealName ?? 'Produit').join(' · ')}
                  </p>
                  <p className="mt-2 text-sm font-bold text-highlight">
                    → Ne pas préparer à l’avance, sauf commande de dernière minute.
                  </p>
                </article>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
