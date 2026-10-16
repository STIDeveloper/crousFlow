import { StaffHeader } from '@/components/features/StaffHeader'

const ADMIN_LINKS = [
  { href: '/admin', label: 'Statistiques' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/catalogue', label: 'Catalogue' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/settings', label: 'Paramètres' },
  { href: '/admin/chaos', label: 'Robustesse' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-staff dark flex min-h-screen flex-col bg-deep font-sans text-surface antialiased">
      <StaffHeader area="Administration" homeHref="/admin" links={ADMIN_LINKS} />
      <main className="w-full min-w-0 max-w-full flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
