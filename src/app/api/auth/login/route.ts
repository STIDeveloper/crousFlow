import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { loginSchema } from '@/lib/schemas/auth'
import { verifyPassword } from '@/server/auth/password'
import { setSessionUser } from '@/server/auth/session'
import db from '@/server/db'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import { checkRateLimit } from '@/server/rate-limit'

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  try {
    const parsed = loginSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Identifiants invalides', 422, parsed.error.flatten())
    }
    checkRateLimit(`auth_login_${clientKey(request)}_${parsed.data.email}`, 10, 60_000)
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      include: { account: true },
    })

    if (
      !user?.account ||
      !(await verifyPassword(parsed.data.password, user.account.passwordHash))
    ) {
      throw new AppError('UNAUTHORIZED', 'Adresse e-mail ou mot de passe incorrect', 401)
    }

    await setSessionUser(user.id)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
