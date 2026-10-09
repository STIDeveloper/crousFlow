'use client'

import { FormEvent, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, Loader2, Search, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type TicketItem = {
  kind?: string
  meal?: { name?: string; productType?: string; category?: string }
  menuItem?: { meal?: { name?: string; productType?: string; category?: string } }
}

type TicketInspection = {
  id?: string
  status?: string
  fulfillmentStatus?: string
  priceCents?: number
  paymentStatus?: string
  availability?: string
  main?: { name?: string; productType?: string; category?: string }
  menuItem?: { meal?: { name?: string; productType?: string; category?: string } }
  items?: TicketItem[]
  slot?: { date?: string; startTime?: string; endTime?: string }
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === 'object' && value !== null && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}

function readInspection(value: unknown): TicketInspection {
  if (typeof value !== 'object' || value === null) return {}
  return value as TicketInspection
}

function formatPrice(value?: number): string {
  if (typeof value !== 'number') return 'Montant non communiqué'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value / 100)
}

function getItemLabel(kind?: string, category?: string): string {
  if (kind === 'MAIN') return 'Plat'
  if (kind === 'PERIPHERAL') {
    const norm = (category ?? '').toLowerCase()
    if (norm.includes('entree') || norm.includes('entrée')) return 'Entrée'
    if (norm.includes('dessert')) return 'Dessert'
    return 'Périphérique'
  }
  if (kind === 'SUPPLEMENT') return 'Supplément'
  return 'Article'
}

export function KitchenTicketDesk({
  isOnline,
  onCompleted,
}: {
  isOnline: boolean
  onCompleted?: () => void
}) {
  const [token, setToken] = useState('')
  const [inspection, setInspection] = useState<TicketInspection | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [validateLoading, setValidateLoading] = useState(false)
  const [paymentObserved, setPaymentObserved] = useState(false)
  const [withdrawalOperationKey, setWithdrawalOperationKey] = useState<string | null>(null)

  async function inspect(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const cleanToken = token.trim()
    if (!cleanToken || !isOnline) return
    setInspectLoading(true)
    setInspection(null)
    try {
      const response = await fetch(`/api/tickets/inspect?token=${encodeURIComponent(cleanToken)}`, {
        cache: 'no-store',
      })
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 404) {
          setInspection({ status: 'À confirmer' })
          setWithdrawalOperationKey(crypto.randomUUID())
          return
        }
        throw new Error(readError(data, 'Ticket introuvable.'))
      }
      setInspection(readInspection(data))
      setWithdrawalOperationKey(crypto.randomUUID())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'QR Code invalide ou expiré')
    } finally {
      setInspectLoading(false)
    }
  }

  async function validate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const cleanToken = token.trim()
    if (!cleanToken || !isOnline || !paymentObserved) return
    setValidateLoading(true)
    try {
      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: cleanToken,
          paymentObserved: true,
          operationKey: withdrawalOperationKey ?? crypto.randomUUID(),
        }),
      })
      const data: unknown = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readError(data, 'Le retrait n’a pas été confirmé.'))
      toast.success('Paiement Izly constaté, repas remis avec succès !', {
        icon: <CheckCircle2 className="text-ok" />,
      })
      setToken('')
      setInspection(null)
      setPaymentObserved(false)
      setWithdrawalOperationKey(null)
      onCompleted?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Le retrait n’a pas été confirmé.', {
        icon: <XCircle className="text-danger" />,
      })
    } finally {
      setValidateLoading(false)
    }
  }

  const mainMeal = inspection?.main ?? inspection?.menuItem?.meal
  const sideItems = (inspection?.items ?? []).map((item) => ({
    name: item.meal?.name ?? item.menuItem?.meal?.name ?? 'Article',
    kind: item.kind,
    category: item.meal?.category ?? item.menuItem?.meal?.category,
  }))
  const isConsumed = inspection?.status === 'CONSUMED'
  const isCancelled = inspection?.status === 'CANCELLED'

  return (
    <section
      className="rounded-2xl border border-sage/20 bg-night-2 p-5 sm:p-6"
      aria-label="Retrait et paiement"
    >
      <div className="flex items-center gap-2">
        <Search className="size-5 text-glow" />
        <h2 className="font-display text-2xl font-bold">Retrait au comptoir</h2>
      </div>
      <p className="mt-1 text-sm text-sage">
        Consultez le code ou scannez le QR, vérifiez la composition du plateau, constatez le débit
        Izly sur le TPE puis validez la remise.
      </p>
      <form onSubmit={inspect} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="ticket-code">
          Code du ticket
        </label>
        <input
          id="ticket-code"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Scanner le QR ou saisir l’identifiant à 6 caractères (ex : A1B2C3)"
          autoComplete="off"
          disabled={!isOnline}
          className="min-h-12 flex-1 rounded-xl border border-sage/45 bg-night px-4 font-mono text-base uppercase text-paper focus:outline-none focus:ring-2 focus:ring-glow"
        />
        <button
          type="submit"
          disabled={!token.trim() || inspectLoading || !isOnline}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sage/20 px-6 font-bold hover:bg-sage/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {inspectLoading ? (
            <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
          ) : (
            <Eye className="size-5" />
          )}
          Consulter le ticket
        </button>
      </form>

      {inspection ? (
        <div
          className={`mt-5 rounded-2xl border p-5 sm:p-6 ${isConsumed ? 'border-warn/40 bg-warn/10' : isCancelled ? 'border-danger/40 bg-danger/10' : 'border-glow/40 bg-glow/10'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${isConsumed ? 'bg-warn text-night' : isCancelled ? 'bg-danger text-paper' : 'bg-glow text-night'}`}
                >
                  {isConsumed ? 'Déjà consommé' : isCancelled ? 'Annulé' : 'Réservation confirmée'}
                </span>
                {inspection.fulfillmentStatus ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${inspection.fulfillmentStatus === 'READY' ? 'bg-ok/20 text-ok' : 'bg-warn/20 text-warn'}`}
                  >
                    {inspection.fulfillmentStatus === 'READY'
                      ? '✓ Stock disponible'
                      : 'En attente réception'}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold">
                {mainMeal?.name ?? 'Plateau repas'}
              </h3>
              <p className="mt-1 text-sm text-sage">
                {inspection.slot?.date
                  ? new Date(inspection.slot.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'Date indisponible'}
                {inspection.slot?.startTime
                  ? ` · Créneau ${inspection.slot.startTime}–${inspection.slot.endTime ?? ''}`
                  : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-paper/10 px-3 py-1 font-mono text-base font-bold text-glow">
                {formatPrice(inspection.priceCents)}
              </span>
              <p className="mt-1 text-xs text-sage">Paiement Izly sur TPE</p>
            </div>
          </div>

          {/* Composition détaillée du plateau */}
          <div className="mt-4 rounded-xl border border-sage/15 bg-night/80 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sage mb-2.5">
              Composition du plateau
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="rounded-md bg-tomato/20 px-2 py-0.5 text-xs font-bold text-tomato">
                  Plat principal
                </span>
                <span className="font-medium text-paper">{mainMeal?.name ?? 'Non spécifié'}</span>
              </li>
              {sideItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="rounded-md bg-sage/20 px-2 py-0.5 text-xs font-bold text-sage">
                    {getItemLabel(item.kind, item.category)}
                  </span>
                  <span className="font-medium text-paper">{item.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {isConsumed ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-warn/40 bg-warn/15 p-3 text-sm text-warn font-semibold flex items-center gap-2"
            >
              <AlertTriangle className="size-4 shrink-0" />
              Ce ticket a déjà été validé et le repas a été servi.
            </div>
          ) : isCancelled ? (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-danger/40 bg-danger/15 p-3 text-sm text-danger font-semibold flex items-center gap-2"
            >
              <XCircle className="size-4 shrink-0" />
              Cette réservation a été annulée par l’étudiant.
            </div>
          ) : (
            <form onSubmit={validate} className="mt-5 border-t border-glow/20 pt-4">
              <label className="flex min-h-11 items-center gap-3 text-sm font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentObserved}
                  onChange={(event) => setPaymentObserved(event.target.checked)}
                  disabled={!isOnline}
                  className="size-5 rounded border-sage/40 bg-night text-glow focus:ring-glow"
                />
                Paiement Izly ({formatPrice(inspection.priceCents)}) constaté sur le terminal CROUS
              </label>
              <button
                type="submit"
                disabled={!paymentObserved || validateLoading || !isOnline}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-glow px-5 font-bold text-night disabled:cursor-not-allowed disabled:opacity-50 transition-opacity"
              >
                {validateLoading ? (
                  <Loader2 className="size-5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
                Valider le retrait & remettre le plateau
              </button>
            </form>
          )}
        </div>
      ) : null}

      {!isOnline ? (
        <p role="alert" className="mt-4 rounded-xl border border-warn/50 bg-warn/15 p-3 text-sm">
          Hors ligne : aucune validation de retrait ne sera enregistrée.
        </p>
      ) : null}
    </section>
  )
}
