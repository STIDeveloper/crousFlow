import { getSessionUser } from '@/server/auth/session'
import { StudentShell } from '@/components/features/StudentShell'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null)
  return <StudentShell role={user?.role ?? null}>{children}</StudentShell>
}
