import { NextRequest, NextResponse } from 'next/server'
import { toHttpResponse } from '@/server/errors'
import { predictBatch } from '@/server/ia/batch'
import { evaluateForecast } from '@/server/ia/evaluate'
import { requireSessionUser, requireRole } from '@/server/auth/session'
import { parseDateQuery } from '@/server/http/query'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const user = await requireSessionUser()
    requireRole(user, ['KITCHEN', 'ADMIN'])

    const { searchParams } = new URL(req.url)
    const date = parseDateQuery(searchParams.get('date')) ?? new Date()

    const batchResults = await predictBatch(date)

    // Append evaluation for the first meal (or all) for demonstration
    const evaluations = []
    if (batchResults.length > 0) {
      const evalResult = await evaluateForecast(batchResults[0].mealId)
      evaluations.push({ mealId: batchResults[0].mealId, ...evalResult })
    }

    return NextResponse.json({
      date: date.toISOString().split('T')[0],
      forecasts: batchResults,
      evaluations,
    })
  } catch (err) {
    const { status, body } = toHttpResponse(err, requestId)
    return NextResponse.json(body, { status })
  }
}
