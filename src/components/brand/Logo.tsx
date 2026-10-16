import { cn } from '@/lib/utils'

/** Pictogramme CrousFlow : un bol dont la vapeur dessine le « flow ». */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-9 shrink-0', className)} aria-hidden="true">
      <circle cx="24" cy="24" r="24" className="fill-brand" />
      <circle cx="24" cy="24" r="19" className="fill-brand-light/35" />
      <g
        className="stroke-surface"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.5 19.5c-1.8-2.4 1.8-3.9 0-6.4" />
        <path d="M24 19.5c-1.8-2.4 1.8-3.9 0-6.4" />
        <path d="M30.5 19.5c-1.8-2.4 1.8-3.9 0-6.4" />
      </g>
      <path d="M11.5 23.5h25a12.5 12.5 0 0 1-25 0Z" className="fill-surface" />
      <path d="M18 37.2h12" className="stroke-surface" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

/** Logo complet (pictogramme + nom). `tone="dark"` pour les fonds sombres. */
export function Logo({
  tone = 'light',
  className,
  markClassName,
}: {
  tone?: 'light' | 'dark'
  className?: string
  markClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          'font-display text-[1.35rem] font-extrabold leading-none tracking-tight',
          tone === 'dark' ? 'text-surface' : 'text-ink',
        )}
      >
        crous<span className={tone === 'dark' ? 'text-brand-light' : 'text-brand'}>flow</span>
      </span>
    </span>
  )
}
