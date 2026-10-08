'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

export function TicketCard({
  reservation,
}: {
  reservation: {
    status: string
    qrToken?: string
    menuItem?: { meal?: { name: string } }
    slot?: { date: string; startTime: string; endTime: string }
  }
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const rotateX = useTransform(y, [-100, 100], [10, -10])
  const rotateY = useTransform(x, [-100, 100], [-10, 10])

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
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

  const isConsumed = reservation.status === 'CONSUMED'
  const shortCode = reservation.qrToken
    ? reservation.qrToken.substring(0, 6).toUpperCase()
    : 'XXXXXX'

  return (
    <motion.div
      style={{ rotateX, rotateY, perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full max-w-sm mx-auto bg-paper border-2 border-sage rounded-2xl shadow-sm transition-all duration-300 overflow-hidden ${isConsumed ? 'opacity-60 grayscale' : ''}`}
    >
      {/* Perforated border effect */}
      <div className="absolute top-1/2 -left-3 w-6 h-6 bg-sage rounded-full transform -translate-y-1/2"></div>
      <div className="absolute top-1/2 -right-3 w-6 h-6 bg-sage rounded-full transform -translate-y-1/2"></div>
      <div className="absolute top-1/2 left-4 right-4 h-0.5 border-t-2 border-dashed border-sage opacity-30 transform -translate-y-1/2"></div>

      <div className="p-6 pb-8 border-b-2 border-dashed border-sage/0">
        <h3 className="font-display font-bold text-2xl text-center mb-1">
          {reservation.menuItem?.meal?.name || 'Repas'}
        </h3>
        <p className="text-center text-ink/70 font-medium">
          {reservation.slot?.date
            ? new Date(reservation.slot.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : ''}
        </p>
        <p className="text-center text-forest font-bold text-lg mt-1">
          {reservation.slot?.startTime}
        </p>
      </div>

      <div className="p-6 pt-8 flex flex-col items-center relative">
        {isConsumed ? (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="transform -rotate-12 border-4 border-danger text-danger font-display font-bold text-4xl px-4 py-2 rounded-lg opacity-80 shadow-lg">
              CONSOMMÉ
            </span>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl shadow-inner border border-sage mb-4">
            <QRCodeSVG value={reservation.qrToken || 'dummy'} size={200} level="M" />
          </div>
        )}
        <p className="text-xs text-ink/50 font-mono tracking-widest">{shortCode}</p>
      </div>

      {!isConsumed && (
        <div className="bg-sage/20 text-center py-2 text-xs font-bold text-ink/70">
          À consommer avant {reservation.slot?.endTime || '14:00'}
        </div>
      )}
    </motion.div>
  )
}
