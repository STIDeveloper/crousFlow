import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { clearSessionUser } from '@/server/auth/session'
import { toHttpResponse } from '@/server/errors'

export async function POST() {
  const requestId = crypto.randomUUID()
  try {
    await clearSessionUser()
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
