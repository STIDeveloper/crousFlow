'use client'

import { useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Check, Copy, Loader2, X, ZoomIn } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { ticketShortCode } from '@/lib/ticket-code'

export function TicketCard({
  reservation,
  onCancel,
  isCancelling = false,
}: {
  reservation: {
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
  onCancel?: () => void
  isCancelling?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-100, 100], [10, -10])
  const rotateY = useTransform(x, [-100, 100], [-10, 10])

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(event.clientX - centerX)
    y.set(event.clientY - centerY)
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

  const statusLabel: Record<string, string> = {
    CONFIRMED: 'À retirer',
    CANCELLED: 'Annulé',
    CONSUMED: 'Consommé',
    NO_SHOW: 'Non retiré',
  }
  const shortCode = ticketShortCode(reservation.id)
  const selectedProducts = reservation.items
    ?.map((item) => item.menuItem?.meal?.name)
    .filter((name): name is string => Boolean(name))

  return (
    <motion.div
      style={reduceMotion ? undefined : { rotateX, rotateY, perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full max-w-sm mx-auto bg-[#fffdf7] border border-[#245642]/15 rounded-[2rem] shadow-[0_14px_35px_#75491512] overflow-hidden ${isActive ? '' : 'opacity-80'}`}
    >
      {/* Perforated border effect */}
      <div className="absolute top-1/2 -left-3 w-6 h-6 bg-sage rounded-full transform -translate-y-1/2"></div>
      <div className="absolute top-1/2 -right-3 w-6 h-6 bg-sage rounded-full transform -translate-y-1/2"></div>
      <div className="absolute top-1/2 left-4 right-4 h-0.5 border-t-2 border-dashed border-sage opacity-30 transform -translate-y-1/2"></div>

      <div className="p-6 pb-8 bg-[#245642] text-[#fff7e7]">
        <div className="mb-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em]">
          <span>crousflow.</span>
          <span>Ticket de réservation</span>
        </div>
        <p className="mb-3 mx-auto w-fit rounded-full bg-[#ffc857] px-3 py-1 text-center text-xs font-bold uppercase tracking-wide text-[#245642]">
          {statusLabel[reservation.status] ?? reservation.status}
        </p>
        <h3 className="font-display font-bold text-3xl text-center mb-3 leading-tight">
          {reservation.menuItem?.meal?.name || 'Repas'}
        </h3>
        <p className="text-center text-[#fff7e7]/80 text-sm font-medium">
          {reservation.slot?.date
            ? new Date(reservation.slot.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : ''}
        </p>
        <p className="text-center text-[#ffc857] font-bold text-xl mt-2">
          {reservation.slot?.startTime} — {reservation.slot?.endTime}
        </p>
        {selectedProducts && selectedProducts.length > 0 ? (
          <p className="mt-3 text-center text-xs text-[#fff7e7]/80">
            Avec {selectedProducts.join(', ')}
          </p>
        ) : null}
        {reservation.fulfillmentStatus === 'BLOCKED' ? (
          <div className="mt-3 rounded-xl bg-tomato/90 px-3 py-2 text-center text-xs font-bold text-white shadow-sm">
            Plateau en cours de réapprovisionnement par la cuisine
          </div>
        ) : null}
        {reservation.incidentReason ? (
          <div className="mt-2 rounded-xl bg-amber-400/90 px-3 py-1.5 text-center text-xs font-semibold text-night shadow-sm">
            Info cuisine : {reservation.incidentReason}
          </div>
        ) : null}
      </div>

      <div className="p-6 pt-8 flex min-h-64 flex-col items-center relative border-t-2 border-dashed border-[#245642]/20">
        {!isActive ? (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="transform -rotate-12 border-4 border-danger text-danger font-display font-bold text-4xl px-4 py-2 rounded-lg opacity-80 shadow-lg">
              {statusLabel[reservation.status] ?? reservation.status}
            </span>
          </div>
        ) : reservation.qrToken ? (
          <>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="group relative bg-white p-4 rounded-2xl border border-[#245642]/10 mb-4 cursor-zoom-in transition-all hover:shadow-md hover:border-forest/40 focus-visible:outline-2 focus-visible:outline-forest"
              aria-label="Agrandir le QR code pour le scan"
            >
              <QRCodeSVG value={reservation.qrToken} size={200} level="M" />
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#142c23]/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-night shadow">
                  <ZoomIn className="size-4" /> Agrandir
                </span>
              </div>
            </button>

            {/* Modal QR Code plein écran / grand format */}
            {isQrModalOpen ? (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-label="QR Code agrandi"
                onClick={() => setIsQrModalOpen(false)}
              >
                <div
                  className="relative flex w-full max-w-sm flex-col items-center rounded-3xl bg-[#fffdf7] p-8 text-ink shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(false)}
                    className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-forest/10 text-forest hover:bg-forest/20 focus-visible:outline-2 focus-visible:outline-forest"
                    aria-label="Fermer le QR code agrandi"
                  >
                    <X className="size-5" />
                  </button>

                  <p className="text-xs font-bold uppercase tracking-widest text-forest">
                    Scan comptoir
                  </p>
                  <h4 className="mt-1 font-display text-xl font-bold text-center">
                    {reservation.menuItem?.meal?.name || 'Repas'}
                  </h4>

                  <div className="my-6 rounded-2xl bg-white p-4 shadow-inner border border-forest/15">
                    <QRCodeSVG value={reservation.qrToken} size={260} level="H" />
                  </div>

                  <div className="w-full rounded-xl bg-forest/10 p-3 text-center">
                    <span className="text-xs font-semibold text-forest uppercase tracking-wider block">
                      Code de secours
                    </span>
                    <span className="font-mono text-2xl font-black tracking-widest text-forest">
                      {shortCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(false)}
                    className="mt-6 w-full min-h-11 rounded-full bg-forest py-2.5 font-bold text-paper hover:bg-forest/90 focus-visible:outline-2 focus-visible:outline-forest"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-center text-danger font-bold">Code de retrait indisponible</p>
        )}
        {isActive && reservation.qrToken ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink/70 font-mono tracking-widest">
                Identifiant : {shortCode}
              </span>
              <button
                type="button"
                onClick={copyToken}
                className="inline-flex items-center gap-1 rounded-full border border-forest/20 bg-forest/5 px-2.5 py-1 text-[11px] font-bold text-forest hover:bg-forest/15 focus-visible:outline-2 focus-visible:outline-forest"
                aria-label="Copier le code de retrait"
              >
                {copied ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline focus-visible:outline-2 focus-visible:outline-forest"
            >
              <ZoomIn className="size-3.5" /> Agrandir le QR code
            </button>
            <p className="mt-2 text-center text-xs text-ink/60">
              Le personnel cuisine peut scanner ce QR code ou saisir cet identifiant pour valider le
              retrait.
            </p>
            <p className="mt-3 text-center text-xs font-semibold text-forest">
              {typeof reservation.priceCents === 'number'
                ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(reservation.priceCents / 100)} à payer sur place.`
                : 'Paiement à effectuer sur place.'}{' '}
              Ce ticket ne confirme aucun débit Izly.
            </p>
          </>
        ) : null}
      </div>

      {isActive && (
        <div className="bg-[#ffc857]/25 flex items-center justify-between gap-3 py-3 px-5 text-xs font-bold text-[#245642]">
          <span>Retrait avant {reservation.slot?.endTime || '14:00'}</span>
          {onCancel ? (
            <button
              type="button"
              disabled={isCancelling}
              onClick={onCancel}
              className="min-h-11 rounded-full border border-danger px-3 text-danger disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
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
        </div>
      )}
    </motion.div>
  )
}
