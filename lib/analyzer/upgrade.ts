import { prisma } from '@/lib/prisma'
import { normalizeCardName } from '@/lib/builder'
import type { Format } from '@/lib/tournaments/types'
import type { MissingCard } from '@/lib/builder'

type StoredCard = { name: string; qty: number }
type StoredDecklist = { mainboard?: StoredCard[]; sideboard?: StoredCard[]; enriched?: boolean }

/**
 * Card impact across a format: Σ(1/rank) over every enriched tournament deck
 * that plays the card. Cards in many winning lists score high; fringe
 * one-offs score low. Same scoring philosophy as the matchup model.
 */
export async function getCardImpactScores(format: Format): Promise<Map<string, number>> {
  const decks = await prisma.tournamentDeck.findMany({
    where: { decklist: { not: { equals: null } }, rank: { not: null }, event: { format } },
    select: { rank: true, decklist: true },
  })

  const impact = new Map<string, number>()
  for (const deck of decks) {
    const dl = deck.decklist as StoredDecklist | null
    if (!dl?.enriched) continue
    const weight = 1 / deck.rank!
    const seen = new Set<string>()
    for (const c of [...(dl.mainboard ?? []), ...(dl.sideboard ?? [])]) {
      const key = normalizeCardName(c.name)
      if (seen.has(key)) continue // count each card once per deck
      seen.add(key)
      impact.set(key, (impact.get(key) ?? 0) + weight)
    }
  }
  return impact
}

export interface UpgradePick {
  name: string
  missing: number
  priceUsd: number
  lineCost: number     // priceUsd × missing
  impact: number       // format-wide impact score
  impactPerDollar: number
}

export interface UpgradePlan {
  budget: number
  picks: UpgradePick[]
  totalCost: number
  coverageGain: number // additional cards acquired
  skipped: number      // affordable cards left out (budget exhausted)
}

/**
 * Greedy knapsack: buy missing cards in impact-per-dollar order until the
 * budget runs out. Cards without a known price are excluded.
 */
export function optimizeBudget(
  missing: MissingCard[],
  impactScores: Map<string, number>,
  budget: number,
): UpgradePlan {
  const candidates: UpgradePick[] = missing
    .filter((m) => m.priceUsd != null && m.missing > 0)
    .map((m) => {
      const impact = impactScores.get(normalizeCardName(m.name)) ?? 0.05
      const lineCost = m.priceUsd! * m.missing
      return {
        name: m.name,
        missing: m.missing,
        priceUsd: m.priceUsd!,
        lineCost: Math.round(lineCost * 100) / 100,
        impact: Math.round(impact * 100) / 100,
        impactPerDollar: impact / Math.max(lineCost, 0.01),
      }
    })
    .sort((a, b) => b.impactPerDollar - a.impactPerDollar)

  const picks: UpgradePick[] = []
  let totalCost = 0
  let skipped = 0
  for (const c of candidates) {
    if (totalCost + c.lineCost <= budget) {
      picks.push(c)
      totalCost += c.lineCost
    } else {
      skipped++
    }
  }

  return {
    budget,
    picks,
    totalCost: Math.round(totalCost * 100) / 100,
    coverageGain: picks.reduce((s, p) => s + p.missing, 0),
    skipped,
  }
}
