export function SlotGauge({
  capacity,
  reservedCount,
}: {
  capacity: number
  reservedCount: number
}) {
  const fillRate = capacity > 0 ? reservedCount / capacity : 0

  let colorClass = 'bg-sage'
  if (fillRate > 0.85) colorClass = 'bg-danger'
  else if (fillRate > 0.6) colorClass = 'bg-warn'

  return (
    <div className="w-full flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-sage/30 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, fillRate * 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-ink/60 whitespace-nowrap">
        {capacity - reservedCount} places
      </span>
    </div>
  )
}
