import { cookies } from 'next/headers'
import { AppError } from '../errors'
import db from '../db'
import { Role } from '@prisma/client'

export async function getSessionUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('demo_user')?.value
  if (!userId) return null
  return db.user.findUnique({ where: { id: userId } })
}

export async function requireSessionUser() {
  const user = await getSessionUser()
  if (!user) throw new AppError('UNAUTHORIZED', 'Non authentifié', 401)
  return user
}

export function requireRole(user: { role: Role }, roles: Role[]) {
  if (!roles.includes(user.role)) {
    throw new AppError('FORBIDDEN', 'Accès refusé', 403)
  }
}

export async function setSessionUser(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set('demo_user', userId, { httpOnly: true, sameSite: 'lax' })
}
