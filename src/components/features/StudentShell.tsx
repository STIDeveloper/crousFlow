'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Ticket } from 'lucide-react'
import { StudentLogoutButton } from './StudentLogoutButton'

export function StudentShell({
  role,
  children,
}: {
  role: 'STUDENT' | 'KITCHEN' | 'ADMIN' | null
  children: React.ReactNode
}) {
  const isLogin = usePathname() === '/connexion'
  const showStudentLinks = role === 'STUDENT' && !isLogin
  const showAccount = role !== null && !isLogin
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-50 w-full border-b border-forest/10 bg-paper">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/" className="font-display text-xl font-bold text-forest">
            crousflow<span className="text-tomato">.</span>
          </Link>
          <nav aria-label="Navigation principale" className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/menu"
              className="rounded-full px-3 py-3 text-sm font-bold text-forest hover:bg-glow/30"
            >
              Consulter le menu
            </Link>
            {showStudentLinks && (
              <Link
                href="/tickets"
                className="hidden rounded-full bg-forest px-5 py-3 text-sm font-bold text-paper sm:flex"
              >
                Mes tickets
              </Link>
            )}
            {showAccount ? (
              <StudentLogoutButton />
            ) : (
              !isLogin && (
                <Link
                  href="/connexion"
                  className="rounded-full bg-forest px-4 py-3 text-sm font-bold text-paper"
                >
                  Connexion
                </Link>
              )
            )}
          </nav>
        </div>
      </header>
      <main className={`flex-1 ${showStudentLinks ? 'pb-16 sm:pb-0' : ''}`}>{children}</main>
      {showStudentLinks && (
        <nav
          aria-label="Navigation étudiante"
          className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-sage bg-paper px-4 sm:hidden"
        >
          <Link
            href="/menu"
            className="flex h-full w-full flex-col items-center justify-center text-forest"
          >
            <Calendar className="h-6 w-6" />
            <span className="mt-1 text-xs">Menu</span>
          </Link>
          <Link
            href="/tickets"
            className="flex h-full w-full flex-col items-center justify-center text-forest"
          >
            <Ticket className="h-6 w-6" />
            <span className="mt-1 text-xs">Mes tickets</span>
          </Link>
        </nav>
      )}
    </div>
  )
}
