'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock,
  Download,
  Leaf,
  Package,
  RefreshCw,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Stats = {
  consumedCount?: number
  gaspillageEvite?: number
  minutesSaved?: number
  noShowRate?: number
  chartData?: { date: string; reservations: number; noShows?: number }[]
}

function AdminState({ error, retry }: { error?: boolean; retry?: () => void }) {
  return (
    <section
      className="rounded-2xl border border-sage/25 bg-night-2 p-8 text-center"
      role={error ? 'alert' : undefined}
    >
      <AlertTriangle className="mx-auto mb-3 size-8 text-warn" />
      <h1 className="font-display text-2xl font-bold">
        {error ? 'Les indicateurs sont indisponibles.' : 'Aucune donnée à afficher.'}
      </h1>
      <p className="mt-2 text-sm text-sage">
        {error
          ? 'Vérifiez la connexion puis relancez le chargement.'
          : 'Les données apparaîtront au fil des réservations et retraits.'}
      </p>
      {retry && (
        <button
          onClick={retry}
          className="mt-5 min-h-11 rounded-xl border border-sage/50 px-4 font-bold hover:bg-sage/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow"
        >
          Réessayer
        </button>
      )}
    </section>
  )
}

export function AdminDashboard() {
  const [isOnline, setIsOnline] = useState(true)
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
  const query = useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Statistiques indisponibles')
      return res.json()
    },
  })
  if (!isOnline && !query.data)
    return (
      <section
        role="status"
        className="rounded-2xl border border-warn/40 bg-night-2 p-8 text-center"
      >
        <h1 className="font-display text-2xl text-glow">Vous êtes hors ligne</h1>
        <p className="mt-3 text-sage">Reconnectez-vous pour charger les indicateurs du campus.</p>
      </section>
    )
  if (query.isLoading)
    return (
      <div className="space-y-6" aria-label="Chargement des indicateurs">
        <div className="h-36 animate-pulse rounded-2xl bg-night-2" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-36 animate-pulse rounded-2xl bg-night-2" />
          <div className="h-36 animate-pulse rounded-2xl bg-night-2" />
          <div className="h-36 animate-pulse rounded-2xl bg-night-2" />
          <div className="h-36 animate-pulse rounded-2xl bg-night-2" />
        </div>
      </div>
    )
  if (query.isError) return <AdminState error retry={() => query.refetch()} />
  const stats = query.data ?? {}
  const chartData = stats.chartData ?? []
  if (!chartData.length && !stats.consumedCount) return <AdminState />
  const cards = [
    {
      label: 'Repas retirés (30 j)',
      value: stats.consumedCount ?? 0,
      suffix: '',
      icon: Users,
      color: 'text-forest',
      border: 'border-forest/35',
      note: 'Tickets validés sur la période.',
    },
    {
      label: 'Estimation du gaspillage évité',
      value: stats.gaspillageEvite ?? 0,
      suffix: ' repas',
      icon: Leaf,
      color: 'text-glow',
      border: 'border-glow/35',
      note: 'Indicateur estimatif, à confirmer par pesée.',
    },
    {
      label: 'Temps de file estimé',
      value: stats.minutesSaved ?? 0,
      suffix: ' min',
      icon: Clock,
      color: 'text-ok',
      border: 'border-ok/35',
      note: 'Estimation de démonstration.',
    },
    {
      label: 'Taux de non-retrait',
      value: (stats.noShowRate ?? 0).toFixed(1),
      suffix: ' %',
      icon: TrendingUp,
      color: 'text-warn',
      border: 'border-warn/35',
      note: 'Sur les réservations de la période.',
    },
  ]
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:gap-8">
      {!isOnline && (
        <div role="alert" className="rounded-xl border border-warn/60 bg-warn/15 p-4 text-sm">
          <strong>Hors ligne.</strong> Les indicateurs restent consultables mais ne peuvent pas être
          actualisés.
        </div>
      )}
      <header className="flex flex-col gap-4 rounded-2xl border border-sage/20 bg-night-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-sage">
            Moins d’attente. Plus d’impact.
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Le campus, en clair.</h1>
          <p className="mt-1 text-sm text-sage">
            Données issues des réservations et retraits enregistrés localement.
          </p>
        </div>
        <button
          onClick={() => query.refetch()}
          disabled={!isOnline || query.isFetching}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sage/45 px-4 font-bold hover:bg-sage/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`}
          />
          Actualiser
        </button>
      </header>
      <section
        aria-label="Espaces opérationnels"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Link
          href="/admin/services"
          className="group flex flex-col justify-between rounded-2xl border border-glow/30 bg-night-2 p-5 transition-transform hover:-translate-y-1 hover:border-glow focus-visible:outline-2 focus-visible:outline-glow"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-xl bg-glow/15 p-2 text-glow">
                <CalendarDays className="size-5" />
              </span>
              <ArrowRight className="size-4 text-sage transition-transform group-hover:translate-x-1" />
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-paper">Services & Menus</h2>
            <p className="mt-1 text-xs text-sage">
              Composer, planifier et publier les services pour les étudiants.
            </p>
          </div>
          <span className="mt-4 text-xs font-bold text-glow">Accéder →</span>
        </Link>
        <Link
          href="/admin/catalogue"
          className="group flex flex-col justify-between rounded-2xl border border-sage/25 bg-night-2 p-5 transition-transform hover:-translate-y-1 hover:border-sage focus-visible:outline-2 focus-visible:outline-forest"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-xl bg-forest/20 p-2 text-forest">
                <Package className="size-5" />
              </span>
              <ArrowRight className="size-4 text-sage transition-transform group-hover:translate-x-1" />
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-paper">Catalogue</h2>
            <p className="mt-1 text-xs text-sage">
              Gérer les plats, entrées, desserts et ventes comptoir.
            </p>
          </div>
          <span className="mt-4 text-xs font-bold text-forest">Gérer →</span>
        </Link>
        <Link
          href="/admin/users"
          className="group flex flex-col justify-between rounded-2xl border border-sage/25 bg-night-2 p-5 transition-transform hover:-translate-y-1 hover:border-sage focus-visible:outline-2 focus-visible:outline-glow"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-xl bg-sage/15 p-2 text-paper">
                <Users className="size-5" />
              </span>
              <ArrowRight className="size-4 text-sage transition-transform group-hover:translate-x-1" />
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-paper">Utilisateurs</h2>
            <p className="mt-1 text-xs text-sage">
              Consulter les comptes et attribuer les rôles Cuisine / Admin.
            </p>
          </div>
          <span className="mt-4 text-xs font-bold text-paper">Comptes →</span>
        </Link>
        <Link
          href="/admin/settings"
          className="group flex flex-col justify-between rounded-2xl border border-glow/30 bg-night-2 p-5 transition-transform hover:-translate-y-1 hover:border-glow focus-visible:outline-2 focus-visible:outline-glow"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-xl bg-glow/15 p-2 text-glow">
                <Settings className="size-5" />
              </span>
              <ArrowRight className="size-4 text-sage transition-transform group-hover:translate-x-1" />
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-paper">Paramètres</h2>
            <p className="mt-1 text-xs text-sage">
              Tarifs formules, quotas étudiants et fenêtres de réservation.
            </p>
          </div>
          <span className="mt-4 text-xs font-bold text-glow">Configurer →</span>
        </Link>
        <Link
          href="/admin/chaos"
          className="group flex flex-col justify-between rounded-2xl border border-sage/25 bg-night-2 p-5 transition-transform hover:-translate-y-1 hover:border-sage focus-visible:outline-2 focus-visible:outline-warn"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-xl bg-warn/15 p-2 text-warn">
                <ShieldAlert className="size-5" />
              </span>
              <ArrowRight className="size-4 text-sage transition-transform group-hover:translate-x-1" />
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-paper">Robustesse</h2>
            <p className="mt-1 text-xs text-sage">
              Simulateur de concurrence, pannes et scénarios extrêmes.
            </p>
          </div>
          <span className="mt-4 text-xs font-bold text-warn">Console →</span>
        </Link>
      </section>
      <section aria-label="Indicateurs clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, suffix, icon: Icon, color, border, note }) => (
          <article
            key={label}
            className={`rounded-[1.75rem] border ${border} bg-night-2 p-6 transition-transform hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-sage">{label}</h2>
                <p className={`mt-5 font-display text-5xl font-bold tabular-nums ${color}`}>
                  {value}
                  <span className="text-lg text-sage">{suffix}</span>
                </p>
              </div>
              <Icon className={`size-6 ${color}`} aria-hidden="true" />
            </div>
            <p className="mt-3 text-xs text-sage/90">{note}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-sage/20 bg-night-2 p-5 sm:p-6">
          <h2 className="font-display text-2xl font-bold">Réservations enregistrées</h2>
          <p className="mt-1 text-sm text-sage">
            Historique des réservations disponibles dans la base locale.
          </p>
          <div className="mt-5 h-64 w-full min-w-0 min-h-[256px]">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff80"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#ffffff80" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#203c30',
                      borderColor: '#ffffff30',
                      borderRadius: '12px',
                    }}
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="reservations"
                    name="Réservations"
                    fill="var(--color-forest)"
                    stroke="var(--color-forest)"
                    fillOpacity={0.25}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-20 text-center text-sm text-sage">Pas encore d’historique.</p>
            )}
          </div>
        </section>
        <section className="min-w-0 rounded-2xl border border-sage/20 bg-night-2 p-5 sm:p-6">
          <h2 className="font-display text-2xl font-bold">Non-retraits par jour</h2>
          <p className="mt-1 text-sm text-sage">
            Affiché uniquement lorsque la donnée est disponible.
          </p>
          <div className="mt-5 h-64 w-full min-w-0 min-h-[256px]">
            {chartData.some((day) => typeof day.noShows === 'number') ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff18" />
                  <XAxis
                    dataKey="date"
                    stroke="#ffffff80"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#ffffff80" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#203c30',
                      borderColor: '#ffffff30',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="noShows"
                    name="Non-retraits"
                    fill="var(--color-warn)"
                    radius={[5, 5, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-20 text-center text-sm text-sage">
                Donnée non disponible dans cette démo.
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="flex flex-col gap-5 rounded-2xl border border-sage/20 bg-night-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-display text-2xl font-bold">Exports CSV</h2>
          <p className="mt-1 max-w-xl text-sm text-sage">
            Exports de démonstration ; vérifiez le contenu avant toute utilisation hors contexte
            pédagogique.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/api/admin/export?type=reservations"
            download
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sage/45 px-4 font-bold hover:bg-sage/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow"
          >
            <Download className="size-5" />
            Réservations CSV
          </a>
          <a
            href="/api/admin/export?type=stats"
            download
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-glow/45 px-4 font-bold hover:bg-glow/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow"
          >
            <Download className="size-5" />
            Indicateurs CSV
          </a>
        </div>
      </section>
    </div>
  )
}
