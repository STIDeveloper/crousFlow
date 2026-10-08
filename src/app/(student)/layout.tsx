import Link from 'next/link'
import { Ticket, Calendar } from 'lucide-react'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-sage bg-paper/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-display text-xl font-bold text-forest">
            CrousFlow
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/tickets"
              className="hidden sm:flex text-sm font-medium hover:text-forest transition-colors"
            >
              Mes tickets
            </Link>
            <Link href="/connexion" className="text-sm font-medium text-tomato hover:underline">
              Se déconnecter
            </Link>
          </div>
        </div>
      </header>

      {/* padding bottom on mobile to account for the bottom nav */}
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-sage bg-paper flex justify-around items-center h-16 px-4 pb-safe">
        <Link
          href="/menu"
          className="flex flex-col items-center justify-center w-full h-full text-ink hover:text-forest"
          aria-label="Menu de la semaine"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-[10px] font-medium mt-1">Menu</span>
        </Link>
        <Link
          href="/tickets"
          className="flex flex-col items-center justify-center w-full h-full text-ink hover:text-forest"
          aria-label="Mes tickets"
        >
          <Ticket className="h-6 w-6" />
          <span className="text-[10px] font-medium mt-1">Tickets</span>
        </Link>
      </nav>
    </div>
  )
}
