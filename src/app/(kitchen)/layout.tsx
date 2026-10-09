import Link from 'next/link'
import { StaffLogoutButton } from '@/components/features/StaffLogoutButton'

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen text-paper font-sans antialiased flex flex-col bg-night [--color-night:#142c23] [--color-night-2:#203c30] [--color-paper:#fff7e7] [--color-sage:#bed1ad] [--color-glow:#ffc857] [--color-forest:#ffc857] [--color-ok:#a4df81] [--color-warn:#ffc857] [--color-danger:#ee583f]">
      <header className="sticky top-0 z-50 flex min-h-20 items-center justify-between gap-3 border-b border-sage/20 bg-night px-4 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/kitchen"
            className="font-display text-xl font-bold text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-glow sm:text-2xl"
          >
            CrousFlow<span className="text-glow">.</span>{' '}
            <span className="ml-2 rounded-full border border-glow/30 px-3 py-1 text-xs uppercase tracking-widest text-glow">
              Cuisine
            </span>
          </Link>
        </div>
        <StaffLogoutButton />
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  )
}
