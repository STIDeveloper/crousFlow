import { NextResponse } from 'next/server'
import { setSessionUser } from '@/server/auth/session'
import db from '@/server/db'
import { demoLoginSchema } from '@/lib/schemas/auth'
import { readJsonBody } from '@/server/http/body'
import { AppError, toHttpResponse } from '@/server/errors'
import { checkRateLimit } from '@/server/rate-limit'
import crypto from 'crypto'

export async function POST(req: Request) {
  const requestId = crypto.randomUUID()
  try {
    const body = await readJsonBody(req)
    const parsed = demoLoginSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Adresse e-mail invalide', 422, parsed.error.flatten())
    }

    const client = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    checkRateLimit(`demo_login_${client}_${parsed.data.email.toLowerCase()}`, 10, 60_000)
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })

    if (!user) {
      throw new AppError('NOT_FOUND', 'Utilisateur introuvable', 404)
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
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
