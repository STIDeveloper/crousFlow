import { cn } from '@/lib/utils'

export function SlotGauge({
  capacity,
  reservedCount,
}: {
  capacity: number
  reservedCount: number
}) {
  const fillRate = capacity > 0 ? reservedCount / capacity : 0
  const remaining = Math.max(0, capacity - reservedCount)

  let colorClass = 'bg-brand'
  if (fillRate > 0.85) colorClass = 'bg-danger'
  else if (fillRate > 0.6) colorClass = 'bg-warn'

  return (
    <div className="mt-2 flex w-full items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-mist"
        role="meter"
        aria-label="Remplissage du créneau"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={reservedCount}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClass)}
          style={{ width: `${Math.min(100, fillRate * 100)}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-xs font-bold text-ink-soft">
        {remaining} place{remaining > 1 ? 's' : ''}
      </span>
    </div>
  )
}
