import { NextRequest, NextResponse } from 'next/server'
import { setSessionUser } from '@/server/auth/session'
import db from '@/server/db'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const user = await db.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    await setSessionUser(user.id)
    return NextResponse.json({ success: true, role: user.role })
  } catch {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
