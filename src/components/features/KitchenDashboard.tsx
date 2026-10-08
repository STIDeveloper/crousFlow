'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Minus, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

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
  predictedCount: number
  lower: number
  upper: number
  method: string
  explanation?: string
}

function BeamAnimation() {
  return (
    <div className="relative w-full h-32 flex items-center justify-between px-8 bg-night-2/50 border border-sage/20 rounded-2xl overflow-hidden my-8">
      <div className="z-10 bg-night border border-sage p-4 rounded-xl shadow-lg">
        <p className="font-bold text-sage">Réservations</p>
      </div>
      <div className="z-10 bg-night border border-glow p-4 rounded-xl shadow-lg shadow-glow/20">
        <p className="font-bold text-glow">Prévision IA</p>
      </div>
      <div className="z-10 bg-night border border-forest p-4 rounded-xl shadow-lg">
        <p className="font-bold text-forest">Production</p>
      </div>

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M 120 64 L 500 64 L 800 64"
          fill="none"
          stroke="var(--color-glow)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <path
          d="M 120 64 L 800 64"
          fill="none"
          stroke="var(--color-sage)"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="opacity-30"
        />
      </svg>
    </div>
  )
}

export function KitchenDashboard() {
  const queryClient = useQueryClient()
  const [ticketToken, setTicketToken] = useState('')
  const todayStr = new Date().toISOString().split('T')[0]

  const { data: batches, isLoading: batchesLoading } = useQuery<Batch[]>({
    queryKey: ['kitchen', 'batches', todayStr],
    queryFn: async () => {
      const res = await fetch('/api/kitchen/batches?date=' + todayStr)
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const { data: forecastData, isLoading: forecastLoading } = useQuery<{
    forecasts: Forecast[]
    evaluations: { modelMAE?: number; naiveMAE?: number }[]
  }>({
    queryKey: ['kitchen', 'forecast', todayStr],
    queryFn: async () => {
      const res = await fetch('/api/kitchen/forecast?date=' + todayStr)
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
  })

  const updateBatch = useMutation({
    mutationFn: async ({ id, preparedCount }: { id: string; preparedCount: number }) => {
      const res = await fetch('/api/kitchen/batches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, preparedCount }),
      })
      if (!res.ok) throw new Error('Patch failed')
      return res.json()
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['kitchen', 'batches', todayStr] })
      const prev = queryClient.getQueryData<Batch[]>(['kitchen', 'batches', todayStr])
      queryClient.setQueryData<Batch[]>(['kitchen', 'batches', todayStr], (old) =>
        old?.map((b) => (b.id === newData.id ? { ...b, preparedCount: newData.preparedCount } : b)),
      )
      return { prev }
    },
    onError: (err: Error, newData, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['kitchen', 'batches', todayStr], context.prev)
      }
      toast.error('Erreur lors de la mise à jour')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen', 'batches', todayStr] })
    },
  })

  const validateTicket = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Ticket invalide')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Ticket validé avec succès', { icon: <CheckCircle2 className="text-ok" /> })
      setTicketToken('')
    },
    onError: (err: Error) => {
      toast.error(err.message, { icon: <XCircle className="text-danger" /> })
    },
  })

  if (batchesLoading || forecastLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-glow w-12 h-12" />
      </div>
    )
  }

  const totalPrepared = batches?.reduce((acc, b) => acc + b.preparedCount, 0) || 0
  const totalPredicted = batches?.reduce((acc, b) => acc + b.predictedCount, 0) || 0

  const chartData = [
    { name: 'J-6', reserve: 40, prevision: 45 },
    { name: 'J-5', reserve: 60, prevision: 55 },
    { name: 'J-4', reserve: 80, prevision: 75 },
    { name: 'J-3', reserve: 100, prevision: 105 },
    { name: 'J-2', reserve: 120, prevision: 115 },
    { name: 'J-1', reserve: 140, prevision: 145 },
    { name: 'Auj.', reserve: totalPrepared, prevision: totalPredicted },
  ]

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      {/* HEADER BANDS */}
      <div className="flex justify-between items-center bg-night-2 p-6 rounded-2xl border border-sage/20">
        <div>
          <h2 className="text-xl text-sage">Date du jour</h2>
          <p className="text-2xl font-bold">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['kitchen'] })
            toast('Données actualisées')
          }}
          className="px-6 py-3 bg-sage/20 text-paper rounded-full font-bold hover:bg-sage/30 transition-colors"
        >
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* A PREPARER */}
        <div className="bg-night-2 p-8 rounded-2xl border border-glow/30 shadow-[0_0_30px_rgba(var(--color-glow),0.1)]">
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-glow animate-pulse"></span>À préparer
          </h2>
          <div className="text-center mb-8">
            <p className="text-6xl font-display font-bold text-glow">
              {totalPrepared} <span className="text-2xl text-sage">/ {totalPredicted}</span>
            </p>
            <p className="text-sage mt-2">Total repas aujourd&apos;hui</p>
          </div>

          <div className="flex flex-col gap-6">
            {batches?.map((batch) => {
              const progress =
                batch.predictedCount > 0 ? (batch.preparedCount / batch.predictedCount) * 100 : 0
              return (
                <div key={batch.id} className="bg-night p-4 rounded-xl border border-sage/20">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-bold text-lg">{batch.meal?.name || 'Repas'}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          updateBatch.mutate({
                            id: batch.id,
                            preparedCount: Math.max(0, batch.preparedCount - 10),
                          })
                        }
                        className="p-2 bg-sage/20 rounded-full hover:bg-sage/40"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="text-2xl font-bold w-12 text-center">
                        {batch.preparedCount}
                      </span>
                      <button
                        onClick={() =>
                          updateBatch.mutate({
                            id: batch.id,
                            preparedCount: batch.preparedCount + 10,
                          })
                        }
                        className="p-2 bg-sage/20 rounded-full hover:bg-sage/40"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-night-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-glow transition-all"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
            {(!batches || batches.length === 0) && (
              <p className="text-center text-sage py-8">Aucun batch pour aujourd&apos;hui</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* TICKET VALIDATION */}
          <div className="bg-night-2 p-6 rounded-2xl border border-sage/20">
            <h2 className="text-xl font-bold mb-4">Valider un ticket</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (ticketToken) validateTicket.mutate(ticketToken)
              }}
              className="flex gap-4"
            >
              <input
                type="text"
                value={ticketToken}
                onChange={(e) => setTicketToken(e.target.value)}
                placeholder="Scanner QR ou code..."
                className="flex-1 bg-night border border-sage/40 p-4 rounded-xl font-mono text-xl focus:outline-none focus:border-glow"
              />
              <button
                type="submit"
                disabled={validateTicket.isPending || !ticketToken}
                className="px-8 bg-forest text-paper font-bold rounded-xl hover:bg-forest/80 disabled:opacity-50"
              >
                {validateTicket.isPending ? <Loader2 className="animate-spin" /> : 'Valider'}
              </button>
            </form>
          </div>

          {/* AI CHART */}
          <div className="bg-night-2 p-6 rounded-2xl border border-sage/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Prévision IA</h2>
              <span className="px-3 py-1 bg-glow/20 text-glow rounded-full text-xs font-bold border border-glow/30">
                {forecastData?.forecasts?.[0]?.method === 'FALLBACK' ? 'Secours' : 'Méthode STAT'}
              </span>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis
                    dataKey="name"
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
                    dataKey="prevision"
                    fill="url(#colorPv)"
                    stroke="var(--color-glow)"
                    strokeDasharray="5 5"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="reserve"
                    stroke="var(--color-forest)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <defs>
                    <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-glow)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-glow)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {forecastData?.evaluations?.[0] && (
              <p className="text-xs text-sage mt-4 text-center">
                MAE: {forecastData.evaluations[0].modelMAE?.toFixed(1) || '?'} vs Baseline{' '}
                {forecastData.evaluations[0].naiveMAE?.toFixed(1) || '?'}
              </p>
            )}
          </div>
        </div>
      </div>

      <BeamAnimation />

      {/* AI ALERTS */}
      <div className="bg-night-2 p-6 rounded-2xl border border-sage/20">
        <h2 className="text-xl font-bold mb-6">Alertes & Analyse</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forecastData?.forecasts?.map((f: Forecast) => (
            <div
              key={f.mealId}
              className="flex gap-4 p-4 rounded-xl bg-night border border-sage/20"
            >
              <div className="pt-1">
                {f.method === 'FALLBACK' ? (
                  <AlertTriangle className="text-warn w-6 h-6" />
                ) : (
                  <Info className="text-sage w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">{f.mealName || 'Repas'}</h4>
                <p className="text-sage text-sm mb-2">
                  {f.explanation || 'Prévision générée automatiquement.'}
                </p>
                <p className="text-xs text-ink/50">
                  Intervalle de confiance : {f.lower} - {f.upper} repas
                </p>
              </div>
            </div>
          ))}
          {(!forecastData?.forecasts || forecastData.forecasts.length === 0) && (
            <p className="text-sage py-4">Aucune prévision pour aujourd&apos;hui</p>
          )}
        </div>
      </div>
    </div>
  )
}
