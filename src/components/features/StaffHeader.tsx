'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'
import { StaffLogoutButton } from './StaffLogoutButton'

type StaffLink = { href: string; label: string }

export function StaffHeader({
  area,
  homeHref,
  links = [],
}: {
  area: string
  homeHref: string
  links?: StaffLink[]
}) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-deep/95 backdrop-blur supports-[backdrop-filter]:bg-deep/80">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 lg:gap-8">
          <Link
            href={homeHref}
            className="flex min-w-0 shrink items-center gap-2 rounded-full sm:gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-highlight"
          >
            <Logo tone="dark" />
            <span className="rounded-full bg-highlight/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-highlight sm:px-3 sm:text-[11px] sm:tracking-[0.14em]">
              {area}
            </span>
          </Link>
          {links.length > 0 ? (
            <nav aria-label={`Navigation ${area.toLowerCase()}`} className="hidden gap-1 lg:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    'min-h-10 content-center rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight',
                    isActive(link.href)
                      ? 'bg-highlight text-deep'
                      : 'text-mist hover:bg-deep-2 hover:text-surface',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <StaffLogoutButton />
      </div>
      {links.length > 0 ? (
        <nav
          aria-label={`Navigation ${area.toLowerCase()} mobile`}
          className="flex gap-2 overflow-x-auto px-4 pb-3 text-xs font-bold lg:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={cn(
                'min-h-9 shrink-0 content-center rounded-full px-3.5',
                isActive(link.href) ? 'bg-highlight text-deep' : 'bg-deep-2 text-mist',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
