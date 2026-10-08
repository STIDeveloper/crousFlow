'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2, Download, TrendingUp, Users, Clock, Leaf } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar,
} from 'recharts'

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-forest w-12 h-12" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      {/* IMPACT BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-night-2 p-6 rounded-2xl border border-forest/30 shadow-[0_0_20px_rgba(var(--color-forest),0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-forest" />
            <h3 className="text-sage text-sm font-bold">Repas servis (30j)</h3>
          </div>
          <p className="text-4xl font-display font-bold text-paper">{stats?.consumedCount || 0}</p>
        </div>

        <div className="bg-night-2 p-6 rounded-2xl border border-glow/30 shadow-[0_0_20px_rgba(var(--color-glow),0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="w-5 h-5 text-glow" />
            <h3 className="text-sage text-sm font-bold">Gaspillage évité</h3>
          </div>
          <p className="text-4xl font-display font-bold text-glow">
            {stats?.gaspillageEvite || 0}{' '}
            <span className="text-lg text-sage font-normal">repas</span>
          </p>
        </div>

        <div className="bg-night-2 p-6 rounded-2xl border border-ok/30 shadow-[0_0_20px_rgba(var(--color-ok),0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-ok" />
            <h3 className="text-sage text-sm font-bold">Temps économisé</h3>
          </div>
          <p className="text-4xl font-display font-bold text-ok">
            {stats?.minutesSaved || 0} <span className="text-lg text-sage font-normal">min</span>
          </p>
        </div>

        <div className="bg-night-2 p-6 rounded-2xl border border-warn/30 shadow-[0_0_20px_rgba(var(--color-warn),0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-warn" />
            <h3 className="text-sage text-sm font-bold">Taux de No-Show</h3>
          </div>
          <p className="text-4xl font-display font-bold text-warn">
            {stats?.noShowRate?.toFixed(1) || 0}{' '}
            <span className="text-lg text-sage font-normal">%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART 1: Réservations */}
        <div className="bg-night-2 p-6 rounded-2xl border border-sage/20">
          <h2 className="text-xl font-bold mb-6">Évolution des réservations</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={stats?.chartData || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="date"
                  stroke="#ffffff50"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    borderColor: '#ffffff20',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="reservations"
                  fill="url(#colorRes)"
                  stroke="var(--color-forest)"
                  strokeWidth={2}
                  fillOpacity={0.1}
                />
                <defs>
                  <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-forest)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-forest)" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Simulate No Shows (Bar chart) */}
        <div className="bg-night-2 p-6 rounded-2xl border border-sage/20">
          <h2 className="text-xl font-bold mb-6">No-Shows par jour (simulé)</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={stats?.chartData || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="date"
                  stroke="#ffffff50"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    borderColor: '#ffffff20',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar
                  dataKey="reservations"
                  fill="var(--color-warn)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.6}
                >
                  {/* Dummy mapping since API didn't return daily no shows for the exercise, just styling a bar chart */}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* EXPORTS */}
      <div className="bg-night-2 p-8 rounded-2xl border border-sage/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2">Exports de données</h2>
          <p className="text-sage text-sm">Données agrégées et anonymes au format CSV.</p>
        </div>
        <div className="flex gap-4">
          <a href="/api/admin/export?type=reservations" download>
            <button className="flex items-center gap-2 px-6 py-3 bg-night border border-sage/40 rounded-xl hover:bg-forest/20 hover:border-forest transition-colors font-bold">
              <Download className="w-5 h-5" /> Réservations
            </button>
          </a>
          <a href="/api/admin/export?type=stats" download>
            <button className="flex items-center gap-2 px-6 py-3 bg-night border border-sage/40 rounded-xl hover:bg-glow/20 hover:border-glow transition-colors font-bold">
              <Download className="w-5 h-5" /> Statistiques
            </button>
          </a>
        </div>
      </div>
    </div>
  )
}
