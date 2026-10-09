import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { menuQuerySchema } from '@/lib/schemas/menu'
import { AppError, toHttpResponse } from '@/server/errors'
import { getWeeklyMenu } from '@/server/menus/query'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const { searchParams } = new URL(request.url)
    const parsed = menuQuerySchema.safeParse({ week: searchParams.get('week') })
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Paramètre week invalide', 422, parsed.error.flatten())
    }

    const menu = await getWeeklyMenu(parsed.data.week)
    return NextResponse.json(menu, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('[API/MENUS ERROR]', error)
    const { status, body } = toHttpResponse(error, requestId)
    return NextResponse.json(body, { status })
  }
}
