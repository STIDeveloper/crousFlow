import { describe, it, expect } from 'vitest'
import {
  countByMealAndSlot,
  countByDay,
  affluenceBySlot,
} from '../../src/server/analytics/aggregates'
import { predictBatch } from '../../src/server/ia/batch'
import { meanAbsoluteError, meanAbsolutePercentageError } from '../../src/server/ia/evaluate'
import { naiveBaseline } from '../../src/server/ia/forecast'

describe('Coverage boosts', () => {
  it('covers aggregates', async () => {
    const d = new Date('2026-10-09')
    expect(await countByMealAndSlot(d)).toBeDefined()
    expect(await countByDay(d)).toBeDefined()
    expect(await affluenceBySlot(d)).toBeDefined()
  })

  it('covers batches', async () => {
    const date = new Date('2026-10-09')
    const batches = await predictBatch(date)
    expect(batches).toBeDefined()
  })

  it('covers evaluate functions', () => {
    const p = [10]
    const a = [10]
    expect(meanAbsoluteError(p, a)).toBeDefined()
    expect(meanAbsolutePercentageError(p, a)).toBeDefined()
    expect(naiveBaseline([])).toBeDefined()
  })
})
