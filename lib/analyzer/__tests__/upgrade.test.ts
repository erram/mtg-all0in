import { optimizeBudget } from '@/lib/analyzer/upgrade'
import type { MissingCard } from '@/lib/builder'

function mc(partial: Partial<MissingCard> & { name: string }): MissingCard {
  return {
    name: partial.name,
    needed: partial.needed ?? partial.missing ?? 1,
    owned: partial.owned ?? 0,
    missing: partial.missing ?? 1,
    img: partial.img ?? null,
    priceUsd: partial.priceUsd ?? null,
  }
}

describe('optimizeBudget', () => {
  it('returns an empty plan for empty input', () => {
    const plan = optimizeBudget([], new Map(), 100)
    expect(plan.picks).toEqual([])
    expect(plan.totalCost).toBe(0)
    expect(plan.coverageGain).toBe(0)
    expect(plan.skipped).toBe(0)
    expect(plan.budget).toBe(100)
  })

  it('excludes cards without a known price', () => {
    const missing = [
      mc({ name: 'No Price', priceUsd: null, missing: 2 }),
      mc({ name: 'Has Price', priceUsd: 5, missing: 1 }),
    ]
    const plan = optimizeBudget(missing, new Map(), 100)
    expect(plan.picks.map((p) => p.name)).toEqual(['Has Price'])
  })

  it('excludes cards with missing <= 0', () => {
    const missing = [
      mc({ name: 'Owned Fully', priceUsd: 5, missing: 0 }),
      mc({ name: 'Needed', priceUsd: 5, missing: 1 }),
    ]
    const plan = optimizeBudget(missing, new Map(), 100)
    expect(plan.picks.map((p) => p.name)).toEqual(['Needed'])
  })

  it('orders picks by impact-per-dollar (greedy)', () => {
    // Cheap high-impact card should rank ahead of expensive low-impact card.
    const missing = [
      mc({ name: 'Expensive Low', priceUsd: 50, missing: 1 }),
      mc({ name: 'Cheap High', priceUsd: 1, missing: 1 }),
    ]
    const impacts = new Map<string, number>([
      ['expensive low', 1],
      ['cheap high', 1],
    ])
    const plan = optimizeBudget(missing, impacts, 1000)
    // both affordable, but Cheap High has far higher impact/dollar -> first
    expect(plan.picks[0].name).toBe('Cheap High')
    expect(plan.picks[1].name).toBe('Expensive Low')
  })

  it('respects the budget cap and counts skipped affordable cards', () => {
    const missing = [
      mc({ name: 'A', priceUsd: 10, missing: 1 }), // lineCost 10
      mc({ name: 'B', priceUsd: 10, missing: 1 }), // lineCost 10
      mc({ name: 'C', priceUsd: 10, missing: 1 }), // lineCost 10
    ]
    // Equal price; differentiate impact so ordering is deterministic.
    const impacts = new Map<string, number>([
      ['a', 3],
      ['b', 2],
      ['c', 1],
    ])
    const plan = optimizeBudget(missing, impacts, 15)
    // Only A fits (10 <= 15); adding B would be 20 > 15.
    expect(plan.picks.map((p) => p.name)).toEqual(['A'])
    expect(plan.totalCost).toBe(10)
    expect(plan.skipped).toBe(2)
  })

  it('uses lineCost = price x missing and sums coverageGain by missing count', () => {
    const missing = [
      mc({ name: 'Triple', priceUsd: 2, missing: 3 }), // lineCost 6, gain 3
      mc({ name: 'Single', priceUsd: 4, missing: 1 }), // lineCost 4, gain 1
    ]
    const plan = optimizeBudget(missing, new Map(), 100)
    expect(plan.totalCost).toBe(10)
    expect(plan.coverageGain).toBe(4)
    const triple = plan.picks.find((p) => p.name === 'Triple')!
    expect(triple.lineCost).toBe(6)
  })

  it('skips everything when budget is too small for any card', () => {
    const missing = [
      mc({ name: 'A', priceUsd: 10, missing: 1 }),
      mc({ name: 'B', priceUsd: 20, missing: 1 }),
    ]
    const plan = optimizeBudget(missing, new Map(), 5)
    expect(plan.picks).toEqual([])
    expect(plan.totalCost).toBe(0)
    expect(plan.coverageGain).toBe(0)
    expect(plan.skipped).toBe(2)
  })

  it('falls back to a default impact of 0.05 when card not in score map', () => {
    const missing = [mc({ name: 'Unknown', priceUsd: 1, missing: 1 })]
    const plan = optimizeBudget(missing, new Map(), 100)
    expect(plan.picks[0].impact).toBe(0.05)
  })

  it('normalizes card names when looking up impact (front face, lowercase)', () => {
    const missing = [mc({ name: 'Fable of the Mirror-Breaker // Reflection of Kiki-Rikki', priceUsd: 5, missing: 1 })]
    const impacts = new Map<string, number>([['fable of the mirror-breaker', 0.8]])
    const plan = optimizeBudget(missing, impacts, 100)
    expect(plan.picks[0].impact).toBe(0.8)
  })
})
