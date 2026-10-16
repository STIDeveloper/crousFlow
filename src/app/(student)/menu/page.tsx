import { WeekPlanner } from '@/components/features/WeekPlanner'
import { getSessionUser } from '@/server/auth/session'

export default async function MenuPage() {
  const user = await getSessionUser().catch(() => null)
  return (
    <div className="min-h-screen bg-surface pb-20">
      <WeekPlanner canReserve={user?.role === 'STUDENT'} />
    </div>
  )
}
