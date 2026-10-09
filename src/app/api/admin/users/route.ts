import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireSessionUser } from '@/server/auth/session'
import { toHttpResponse } from '@/server/errors'
import db from '@/server/db'

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['ADMIN'])
    const searchParams = new URL(request.url).searchParams
    const query = searchParams.get('q')?.trim() ?? ''
    const roleFilter = searchParams.get('role')?.trim()

    const users = await db.user.findMany({
      where: {
        AND: [
          query
            ? {
                OR: [{ name: { contains: query } }, { email: { contains: query } }],
              }
            : {},
          roleFilter && ['STUDENT', 'KITCHEN', 'ADMIN'].includes(roleFilter)
            ? { role: roleFilter as 'STUDENT' | 'KITCHEN' | 'ADMIN' }
            : {},
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(users)
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
