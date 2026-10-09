import { NextRequest, NextResponse } from 'next/server'
import { toHttpResponse } from '@/server/errors'
import db from '@/server/db'
import { requireSessionUser } from '@/server/auth/session'
import { parseDateQuery } from '@/server/http/query'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    await requireSessionUser()

    const { searchParams } = new URL(req.url)
    const date = parseDateQuery(searchParams.get('date')) ?? new Date()

    const slots = await db.slot.findMany({
      where: { date },
    })

    return NextResponse.json(slots)
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
