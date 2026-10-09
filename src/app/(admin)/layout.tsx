import Link from 'next/link'
import { StaffLogoutButton } from '@/components/features/StaffLogoutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark bg-night min-h-screen text-paper font-sans antialiased flex flex-col [--color-night:#142c23] [--color-night-2:#203c30] [--color-paper:#fff7e7] [--color-sage:#bed1ad] [--color-glow:#ffc857] [--color-forest:#ffc857] [--color-ok:#a4df81] [--color-warn:#ffc857] [--color-danger:#ee583f]">
      <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-3 border-b border-sage/20 bg-night-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link
            href="/admin"
            className="font-display text-xl font-bold text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest sm:text-2xl"
          >
            CrousFlow<span className="text-glow">.</span>{' '}
            <span className="ml-2 rounded-full border border-glow/30 px-3 py-1 text-xs uppercase tracking-widest text-glow">
              Admin
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              href="/admin"
              className="min-h-11 content-center text-sm font-bold text-paper transition-colors hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
            >
              Statistiques
            </Link>
            <Link
              href="/admin/services"
              className="min-h-11 content-center text-sm font-bold text-sage transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
            >
              Services
            </Link>
            <Link
              href="/admin/catalogue"
              className="min-h-11 content-center text-sm font-bold text-sage transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
            >
              Catalogue
            </Link>
            <Link
              href="/admin/users"
              className="min-h-11 content-center text-sm font-bold text-sage transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
            >
              Utilisateurs
            </Link>
            <Link
              href="/admin/settings"
              className="min-h-11 content-center text-sm font-bold text-sage transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
            >
              Paramètres
            </Link>
            <Link
              href="/admin/chaos"
              className="min-h-11 content-center text-sm font-bold text-sage transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest"
            >
              Robustesse
            </Link>
          </nav>
        </div>
        <StaffLogoutButton />
      </header>
      <nav
        aria-label="Navigation administration"
        className="flex flex-wrap gap-2 border-b border-sage/15 px-4 py-2.5 text-xs font-bold md:hidden overflow-x-auto"
      >
        <Link href="/admin" className="min-h-9 px-3 content-center rounded-full bg-night-2">
          Stats
        </Link>
        <Link
          href="/admin/services"
          className="min-h-9 px-3 content-center rounded-full bg-night-2 text-glow"
        >
          Services
        </Link>
        <Link
          href="/admin/catalogue"
          className="min-h-9 px-3 content-center rounded-full bg-night-2 text-glow"
        >
          Catalogue
        </Link>
        <Link
          href="/admin/users"
          className="min-h-9 px-3 content-center rounded-full bg-night-2 text-glow"
        >
          Utilisateurs
        </Link>
        <Link
          href="/admin/settings"
          className="min-h-9 px-3 content-center rounded-full bg-night-2 text-glow"
        >
          Paramètres
        </Link>
        <Link
          href="/admin/chaos"
          className="min-h-9 px-3 content-center rounded-full bg-night-2 text-glow"
        >
          Robustesse
        </Link>
      </nav>
      <main className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
