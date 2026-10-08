import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark bg-night min-h-screen text-paper font-sans antialiased flex flex-col">
      <header className="bg-night-2 border-b border-sage/20 p-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="font-display font-bold text-2xl text-paper">
            CrousFlow <span className="text-forest font-normal">· Admin</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link
              href="/admin"
              className="text-sm font-bold text-paper hover:text-forest transition-colors"
            >
              Statistiques
            </Link>
            <span className="text-sm font-bold text-sage/50 cursor-not-allowed">
              Console robustesse (à venir)
            </span>
          </nav>
        </div>
        <Link
          href="/connexion"
          className="text-sm font-bold text-sage hover:text-paper transition-colors"
        >
          Déconnexion
        </Link>
      </header>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
