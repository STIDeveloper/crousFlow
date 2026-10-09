'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'

export type ReceptionLine = {
  id: string
  productId?: string
  mealId?: string
  productName: string
  productType?: string
  expectedQuantity: number
  receivedQuantity: number
  rejectedQuantity: number
  acceptedQuantity?: number
  observation?: string
  lotReference?: string
  expiresAt?: string
}

function dateForTomorrow(): string {
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

function readLines(value: unknown): ReceptionLine[] {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'object' && value !== null && 'lines' in value
      ? (value as { lines?: unknown }).lines
      : typeof value === 'object' && value !== null && 'receptions' in value
        ? (value as { receptions?: unknown }).receptions
        : []
  if (!Array.isArray(list)) return []
  return list
    .filter((line): line is ReceptionLine => {
      if (typeof line !== 'object' || line === null) return false
      const item = line as Partial<ReceptionLine>
      return typeof item.id === 'string' && typeof item.productName === 'string'
    })
    .map((line) => ({
      id: line.id,
      productId: line.productId,
      mealId: line.mealId,
      productName: line.productName,
      productType: line.productType,
      expectedQuantity: Number(line.expectedQuantity ?? 0),
      receivedQuantity: Number(line.receivedQuantity ?? 0),
      rejectedQuantity: Number(line.rejectedQuantity ?? 0),
      acceptedQuantity: Number(
        line.acceptedQuantity ??
          Math.max(0, Number(line.receivedQuantity ?? 0) - Number(line.rejectedQuantity ?? 0)),
      ),
      observation: line.observation ?? '',
      lotReference: line.lotReference ?? '',
      expiresAt: line.expiresAt ?? '',
    }))
}

export function KitchenReceptionPanel({ serviceDate: serviceDateProp }: { serviceDate?: string }) {
  const queryClient = useQueryClient()
  const serviceDate = serviceDateProp ?? dateForTomorrow()
  const [isOnline, setIsOnline] = useState(true)
  const [draftLines, setDraftLines] = useState<ReceptionLine[]>([])

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

  const query = useQuery<ReceptionLine[]>({
    queryKey: ['kitchen', 'receptions', serviceDate],
    retry: false,
    queryFn: async () => {
      const response = await fetch(`/api/kitchen/receptions?date=${serviceDate}`, {
        cache: 'no-store',
      })
      const data: unknown = await response.json().catch(() => [])
      if (!response.ok)
        throw new Error(readError(data, 'La réception du service est indisponible.'))
      return readLines(data)
    },
  })

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/kitchen/receptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDate,
          operationKey: crypto.randomUUID(),
          lines: draftLines.map((line) => ({
            productId: line.productId ?? line.mealId ?? line.id,
            receivedQuantity: line.receivedQuantity,
            rejectedQuantity: line.rejectedQuantity,
            observation: line.observation,
            lotReference: line.lotReference,
            expiresAt: line.expiresAt || undefined,
          })),
        }),
      })
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readError(data, 'La réception n’a pas été enregistrée.'))
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kitchen', 'receptions', serviceDate] })
      void queryClient.invalidateQueries({ queryKey: ['kitchen', 'slots-summary'] })
      toast.success('Réception enregistrée. Les quantités acceptées alimentent le stock.')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function updateLine(id: string, field: keyof ReceptionLine, value: string): void {
    setDraftLines((current) => {
      const source = current.length > 0 ? current : (query.data ?? [])
      return source.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]:
                field === 'receivedQuantity' || field === 'rejectedQuantity'
                  ? Math.max(0, Number(value))
                  : value,
            }
          : line,
      )
    })
  }

  if (!isOnline && !query.data) {
    return (
      <section
        role="status"
        className="rounded-2xl border border-warn/40 bg-night-2 p-6 text-center"
      >
        <WifiOff className="mx-auto mb-3 size-7 text-glow" />
        <h2 className="font-display text-xl font-bold">Réception hors ligne</h2>
        <p className="mt-2 text-sage">Reconnectez-vous pour charger les quantités attendues.</p>
      </section>
    )
  }
  if (query.isLoading)
    return (
      <div
        className="h-56 animate-pulse rounded-2xl bg-night-2"
        aria-label="Chargement de la réception"
      />
    )
  if (query.isError)
    return (
      <section
        role="alert"
        className="rounded-2xl border border-danger/40 bg-night-2 p-6 text-center"
      >
        <AlertTriangle className="mx-auto mb-3 size-7 text-danger" />
        <h2 className="font-display text-xl font-bold">Impossible de charger la réception</h2>
        <p className="mt-2 text-sage">{query.error.message}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sage/40 px-4 font-bold"
        >
          <RefreshCw className="size-4" /> Réessayer
        </button>
      </section>
    )

  function fillAllExpected(): void {
    const source = draftLines.length > 0 ? draftLines : (query.data ?? [])
    setDraftLines(
      source.map((line) => ({
        ...line,
        receivedQuantity: line.expectedQuantity,
        rejectedQuantity: 0,
      })),
    )
    toast.info('Quantités reçues initialisées avec les prévisions attendues.')
  }

  const lines = draftLines.length > 0 ? draftLines : (query.data ?? [])
  const acceptedTotal = lines.reduce(
    (total, line) => total + Math.max(0, line.receivedQuantity - line.rejectedQuantity),
    0,
  )
  return (
    <section
      className="rounded-2xl border border-glow/30 bg-night-2 p-5 sm:p-7"
      aria-label="Réception des produits"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <ClipboardList className="mt-1 size-6 text-glow" />
          <div>
            <h2 className="font-display text-2xl font-bold">Réception du service</h2>
            <p className="mt-1 text-sm text-sage">
              Saisissez reçu et refusé : seul le reçu accepté entre en stock.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lines.length > 0 && isOnline ? (
            <button
              type="button"
              onClick={fillAllExpected}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-glow/50 bg-glow/10 px-3 text-xs font-bold text-glow hover:bg-glow/20 transition-colors"
            >
              <CheckCircle2 className="size-3.5" />
              Tout conforme (Reçu = Attendu)
            </button>
          ) : null}
          <div className="rounded-xl bg-sage/10 px-3 py-2 text-sm text-sage">
            <strong className="text-paper">{acceptedTotal}</strong> portions acceptées
          </div>
        </div>
      </div>
      {!isOnline ? (
        <div role="alert" className="mt-4 rounded-xl border border-warn/50 bg-warn/15 p-3 text-sm">
          Hors ligne : les quantités sont consultables, l’enregistrement est désactivé.
        </div>
      ) : null}
      {lines.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-sage/30 p-6 text-center text-sage">
          Aucune ligne de réception configurée pour cette date.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {lines.map((line) => {
            const accepted = Math.max(0, line.receivedQuantity - line.rejectedQuantity)
            const difference = accepted - line.expectedQuantity
            return (
              <article key={line.id} className="rounded-xl border border-sage/20 bg-night p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold">{line.productName}</h3>
                    <p className="text-sm text-sage">
                      Attendu : {line.expectedQuantity} · Accepté : {accepted}
                      {difference < 0 ? (
                        <span className="ml-2 font-bold text-warn">Écart {difference}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <label className="grid gap-1 text-xs font-bold text-sage">
                      Reçu
                      <input
                        type="number"
                        min="0"
                        value={line.receivedQuantity}
                        onChange={(event) =>
                          updateLine(line.id, 'receivedQuantity', event.target.value)
                        }
                        disabled={!isOnline}
                        className="min-h-11 w-24 rounded-lg border border-sage/40 bg-night px-2 font-mono text-base text-paper"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-bold text-sage">
                      Refusé
                      <input
                        type="number"
                        min="0"
                        value={line.rejectedQuantity}
                        onChange={(event) =>
                          updateLine(line.id, 'rejectedQuantity', event.target.value)
                        }
                        disabled={!isOnline}
                        className="min-h-11 w-24 rounded-lg border border-sage/40 bg-night px-2 font-mono text-base text-paper"
                      />
                    </label>
                    <span className="self-end rounded-lg bg-ok/10 px-3 py-3 text-center text-sm font-bold text-ok">
                      {accepted} accepté{accepted > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <label className="grid gap-1 text-xs font-bold text-sage">
                    Référence lot
                    <input
                      value={line.lotReference ?? ''}
                      onChange={(event) => updateLine(line.id, 'lotReference', event.target.value)}
                      disabled={!isOnline}
                      className="min-h-10 rounded-lg border border-sage/30 bg-night-2 px-3 text-sm text-paper"
                      placeholder="Optionnel"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-sage">
                    DLC
                    <input
                      type="date"
                      value={line.expiresAt ?? ''}
                      onChange={(event) => updateLine(line.id, 'expiresAt', event.target.value)}
                      disabled={!isOnline}
                      className="min-h-10 rounded-lg border border-sage/30 bg-night-2 px-3 text-sm text-paper"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-sage">
                    Observation
                    <input
                      value={line.observation ?? ''}
                      onChange={(event) => updateLine(line.id, 'observation', event.target.value)}
                      disabled={!isOnline}
                      className="min-h-10 rounded-lg border border-sage/30 bg-night-2 px-3 text-sm text-paper"
                      placeholder="Température, colis…"
                    />
                  </label>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {lines.length > 0 ? (
        <button
          type="button"
          disabled={!isOnline || receiveMutation.isPending}
          onClick={() => receiveMutation.mutate()}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-glow px-5 font-bold text-night disabled:cursor-not-allowed disabled:opacity-50"
        >
          {receiveMutation.isPending ? (
            <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <CheckCircle2 className="size-5" />
          )}{' '}
          Enregistrer la réception
        </button>
      ) : null}
    </section>
  )
}
