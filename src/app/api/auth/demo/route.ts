import { NextResponse } from 'next/server'
import { setSessionUser } from '@/server/auth/session'
import db from '@/server/db'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    const user = await db.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    await setSessionUser(user.id)

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
