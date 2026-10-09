import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { closeServiceSchema } from '@/lib/schemas/service'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import { closeService } from '@/server/services/service'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const parsed = closeServiceSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Clôture invalide', 422, parsed.error.flatten())
    }
    return NextResponse.json(await closeService(user, parsed.data))
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
