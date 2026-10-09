import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { AppError, toHttpResponse } from '@/server/errors'
import { readJsonBody } from '@/server/http/body'
import db from '@/server/db'
import { z } from 'zod'

const roleUpdateSchema = z.object({
  role: z.enum(['STUDENT', 'KITCHEN', 'ADMIN']),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID()
  try {
    const currentUser = await requireSessionUser()
    requireRole(currentUser, ['ADMIN'])
    const { id } = await context.params

    const body = await readJsonBody(request)
    const parsed = roleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Rôle invalide', 422, parsed.error.flatten())
    }

    if (currentUser.id === id && parsed.data.role !== 'ADMIN') {
      throw new AppError(
        'FORBIDDEN',
        'Vous ne pouvez pas révoquer vos propres droits administrateur',
        403,
      )
    }

    const targetUser = await db.user.findUnique({ where: { id } })
    if (!targetUser) {
      throw new AppError('NOT_FOUND', 'Utilisateur introuvable', 404)
    }

    const updated = await db.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
