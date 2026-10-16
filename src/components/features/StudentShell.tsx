'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { QrCode, UtensilsCrossed } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/utils'
import { StudentLogoutButton } from './StudentLogoutButton'

const TABS = [
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/tickets', label: 'Mes tickets', icon: QrCode },
]

export function StudentShell({
  role,
  children,
}: {
  role: 'STUDENT' | 'KITCHEN' | 'ADMIN' | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLogin = pathname === '/connexion'
  const showStudentLinks = role === 'STUDENT' && !isLogin
  const showAccount = role !== null && !isLogin
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-50 w-full border-b border-line/70 bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-18 sm:px-8">
          <Link
            href="/"
            aria-label="CrousFlow, accueil"
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <Logo />
          </Link>
          <nav aria-label="Navigation principale" className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/menu"
              aria-current={pathname === '/menu' ? 'page' : undefined}
              className={cn(
                'min-h-11 content-center rounded-full px-4 text-sm font-bold text-ink transition-colors hover:bg-brand-soft',
                showStudentLinks && 'hidden sm:block',
                pathname === '/menu' && 'text-primary',
              )}
            >
              Consulter le menu
            </Link>
            {showStudentLinks && (
              <Link
                href="/tickets"
                className="hidden min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-brand-deep sm:inline-flex"
              >
                <QrCode className="size-4" aria-hidden="true" />
                Mes tickets
              </Link>
            )}
            {showAccount ? (
              <StudentLogoutButton />
            ) : (
              !isLogin && (
                <Link
                  href="/connexion"
                  className="min-h-11 content-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-brand-deep"
                >
                  Connexion
                </Link>
              )
            )}
          </nav>
        </div>
      </header>
      <main className={cn('flex-1', showStudentLinks && 'pb-24 sm:pb-0')}>{children}</main>
      {showStudentLinks && (
        <nav
          aria-label="Navigation étudiante"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-deep-2 bg-deep pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
          <div className="mx-auto flex h-18 max-w-md items-center justify-around px-6">
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className="flex min-w-24 flex-col items-center gap-1 rounded-2xl py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-light"
                >
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-full border-2 transition-colors',
                      active
                        ? 'border-brand-light bg-brand-light text-deep'
                        : 'border-surface/35 text-surface/80',
                    )}
                  >
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-bold',
                      active ? 'text-brand-light' : 'text-surface/80',
                    )}
                  >
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
