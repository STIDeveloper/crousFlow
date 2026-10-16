'use client'

import { useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Check, Clock, Copy, Loader2, X, ZoomIn } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { LogoMark } from '@/components/brand/Logo'
import { ticketShortCode } from '@/lib/ticket-code'
import { cn } from '@/lib/utils'

export type TicketReservation = {
  id: string
  status: string
  priceCents?: number
  qrToken?: string
  fulfillmentStatus?: string | null
  incidentReason?: string | null
  menuItem?: { meal?: { name: string } }
  items?: Array<{ kind: string; menuItem?: { meal?: { name: string } } }>
  slot?: { date: string; startTime: string; endTime: string }
}

export const TICKET_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'À retirer',
  CANCELLED: 'Annulé',
  CONSUMED: 'Consommé',
  NO_SHOW: 'Non retiré',
}

function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export function TicketCard({
  reservation,
  onCancel,
  isCancelling = false,
}: {
  reservation: TicketReservation
  onCancel?: () => void
  isCancelling?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-100, 100], [6, -6])
  const rotateY = useTransform(x, [-100, 100], [-6, 6])

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    x.set(event.clientX - (rect.left + rect.width / 2))
    y.set(event.clientY - (rect.top + rect.height / 2))
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const isActive = reservation.status === 'CONFIRMED'
  const [copied, setCopied] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)

  async function copyToken() {
    if (!reservation.qrToken) return
    try {
      await navigator.clipboard.writeText(reservation.qrToken)
      setCopied(true)
      toast.success('Code du ticket copié dans le presse-papier !')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Impossible de copier le code.')
    }
  }

  const shortCode = ticketShortCode(reservation.id)
  const mealName = reservation.menuItem?.meal?.name || 'Repas'
  const selectedProducts = reservation.items
    ?.map((item) => item.menuItem?.meal?.name)
    .filter((name): name is string => Boolean(name))
  const dateLabel = reservation.slot?.date
    ? new Date(reservation.slot.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : ''

  return (
    <motion.article
      style={reduceMotion ? undefined : { rotateX, rotateY, perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-line/70 bg-surface shadow-card',
        !isActive && 'opacity-80',
      )}
    >
      <header
        className={cn(
          'relative overflow-hidden px-6 pt-5 text-ink',
          isActive ? 'sky-gradient pb-28' : 'bg-mist pb-6',
        )}
      >
        <div
          aria-hidden="true"
          className="ripple pointer-events-none absolute -right-24 -top-24 size-72 rounded-full"
        />
        <div className="relative mb-5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/85">
            <LogoMark className="size-6" />
            Ticket de retrait
          </span>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide',
              isActive ? 'bg-surface text-primary shadow-sm' : 'bg-surface/70 text-ink-soft',
            )}
          >
            {TICKET_STATUS_LABEL[reservation.status] ?? reservation.status}
          </span>
        </div>
        <h3 className="relative text-center font-display text-[1.7rem] font-extrabold leading-tight">
          {mealName}
        </h3>
        <p className="relative mt-1 text-center text-sm font-semibold capitalize text-ink/80">
          {dateLabel}
        </p>
        <p className="relative mt-1 text-center font-display text-xl font-extrabold">
          {reservation.slot?.startTime} — {reservation.slot?.endTime}
        </p>
        {selectedProducts && selectedProducts.length > 0 ? (
          <p className="relative mt-2 text-center text-xs font-medium text-ink/75">
            Avec {selectedProducts.join(', ')}
          </p>
        ) : null}
        {reservation.fulfillmentStatus === 'BLOCKED' ? (
          <p className="relative mt-3 rounded-xl bg-surface/90 px-3 py-2 text-center text-xs font-bold text-danger shadow-sm">
            Plateau en cours de réapprovisionnement par la cuisine
          </p>
        ) : null}
        {reservation.incidentReason ? (
          <p className="relative mt-2 rounded-xl bg-warn/90 px-3 py-1.5 text-center text-xs font-semibold text-ink shadow-sm">
            Info cuisine : {reservation.incidentReason}
          </p>
        ) : null}
      </header>

      <div className={cn('relative flex flex-col items-center px-6 pb-6', isActive && '-mt-24')}>
        {!isActive ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-dashed border-ink-soft/40 px-4 py-2 font-display text-lg font-extrabold text-ink-soft">
            {TICKET_STATUS_LABEL[reservation.status] ?? reservation.status}
          </p>
        ) : reservation.qrToken ? (
          <>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="group relative grid size-56 cursor-zoom-in place-items-center rounded-full bg-surface shadow-float ring-8 ring-surface/70 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              aria-label="Agrandir le QR code pour le scan"
            >
              <QRCodeSVG value={reservation.qrToken} size={140} level="M" />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-deep/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink shadow">
                  <ZoomIn className="size-4" /> Agrandir
                </span>
              </span>
            </button>

            {isQrModalOpen ? (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-deep/80 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-label="QR Code agrandi"
                onClick={() => setIsQrModalOpen(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setIsQrModalOpen(false)
                }}
              >
                <div
                  className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[2rem] bg-surface text-ink shadow-float"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="sky-gradient w-full px-6 pb-16 pt-6 text-center">
                    <p className="visual-kicker text-ink/80">Scan comptoir</p>
                    <h4 className="mt-1 font-display text-xl font-extrabold">{mealName}</h4>
                  </div>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setIsQrModalOpen(false)}
                    className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-surface/90 text-ink shadow-sm hover:bg-surface"
                    aria-label="Fermer le QR code agrandi"
                  >
                    <X className="size-5" />
                  </button>
                  <div className="-mt-12 rounded-3xl bg-surface p-4 shadow-float">
                    <QRCodeSVG value={reservation.qrToken} size={260} level="H" />
                  </div>
                  <div className="mt-5 w-[calc(100%-3rem)] rounded-2xl bg-brand-soft p-3 text-center">
                    <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
                      Code de secours
                    </span>
                    <span className="font-mono text-2xl font-black tracking-[0.3em] text-ink">
                      {shortCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(false)}
                    className="my-6 min-h-11 w-[calc(100%-3rem)] rounded-full bg-primary py-2.5 font-bold text-primary-foreground hover:bg-brand-deep"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-center font-bold text-danger">Code de retrait indisponible</p>
        )}

        {isActive && reservation.qrToken ? (
          <>
            <div className="mt-5 flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-soft">Identifiant :</span>
              <span className="font-mono text-base font-black tracking-[0.22em] text-ink">
                {shortCode}
              </span>
              <button
                type="button"
                onClick={copyToken}
                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-canvas px-2.5 text-[11px] font-bold text-ink hover:border-brand hover:bg-brand-soft"
                aria-label="Copier le code de retrait"
              >
                {copied ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <ZoomIn className="size-3.5" /> Agrandir le QR code
            </button>
            <p className="mt-2 text-center text-xs text-ink-soft">
              Le personnel cuisine peut scanner ce QR code ou saisir cet identifiant pour valider le
              retrait.
            </p>
            <p className="mt-3 rounded-full bg-brand-soft/70 px-4 py-1.5 text-center text-xs font-bold text-ink">
              {typeof reservation.priceCents === 'number'
                ? `${formatEuros(reservation.priceCents)} à payer sur place.`
                : 'Paiement à effectuer sur place.'}{' '}
              Ce ticket ne confirme aucun débit Izly.
            </p>
          </>
        ) : null}
      </div>

      {isActive && (
        <footer className="flex items-center justify-between gap-3 border-t border-line bg-canvas px-5 py-3 text-xs font-bold text-ink">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4 text-primary" aria-hidden="true" />
            Retrait avant {reservation.slot?.endTime || '14:00'}
          </span>
          {onCancel ? (
            <button
              type="button"
              disabled={isCancelling}
              onClick={onCancel}
              className="min-h-11 rounded-full border border-danger/60 px-4 text-danger transition-colors hover:bg-danger hover:text-surface disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              {isCancelling ? (
                <Loader2
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-label="Annulation en cours"
                />
              ) : (
                'Annuler'
              )}
            </button>
          ) : null}
        </footer>
      )}
    </motion.article>
  )
}

/** Ligne d'historique, comme une ligne de relevé : pastille d'état, plat, date, statut. */
export function TicketHistoryRow({ reservation }: { reservation: TicketReservation }) {
  const status = reservation.status
  const date = reservation.slot?.date
    ? new Date(reservation.slot.date).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : ''
  return (
    <li className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full border-2',
          status === 'CONSUMED'
            ? 'border-leaf bg-leaf/15 text-ok'
            : status === 'NO_SHOW'
              ? 'border-warn bg-warn/15 text-ink'
              : 'border-line bg-canvas text-ink-soft',
        )}
        aria-hidden="true"
      >
        {status === 'CONSUMED' ? (
          <Check className="size-5" strokeWidth={3} />
        ) : status === 'NO_SHOW' ? (
          <Clock className="size-5" />
        ) : (
          <X className="size-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">
          {reservation.menuItem?.meal?.name || 'Repas'}
        </span>
        <span className="block text-xs font-medium capitalize text-ink-soft">
          {date} · {reservation.slot?.startTime}
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 text-right text-sm font-extrabold',
          status === 'CONSUMED' ? 'text-ok' : status === 'NO_SHOW' ? 'text-ink' : 'text-ink-soft',
        )}
      >
        {TICKET_STATUS_LABEL[status] ?? status}
        {typeof reservation.priceCents === 'number' && status === 'CONSUMED' ? (
          <span className="block text-xs font-semibold text-ink-soft">
            {formatEuros(reservation.priceCents)}
          </span>
        ) : null}
      </span>
    </li>
  )
}
