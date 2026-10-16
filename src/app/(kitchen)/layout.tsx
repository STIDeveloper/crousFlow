import { StaffHeader } from '@/components/features/StaffHeader'

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-staff dark flex min-h-screen flex-col bg-deep font-sans text-surface antialiased">
      <StaffHeader area="Cuisine" homeHref="/kitchen" />
      <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  )
}
