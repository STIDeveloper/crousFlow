import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/schemas/auth'
import { hashPassword } from '@/server/auth/password'
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
    checkRateLimit(`auth_register_${clientKey(request)}`, 5, 60_000)
    const parsed = registerSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Données d’inscription invalides',
        422,
        parsed.error.flatten(),
      )
    }

    const { email, name, password } = parsed.data
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      throw new AppError('VALIDATION_ERROR', 'Impossible de créer ce compte', 422)
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        name,
        role: 'STUDENT',
        account: { create: { passwordHash } },
      },
    })
    await setSessionUser(user.id)

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role } },
      { status: 201 },
    )
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
