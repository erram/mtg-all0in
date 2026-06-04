import { prisma } from '@/lib/prisma'
import type { Format } from '@/lib/tournaments/types'

export interface ArchetypeScore {
  archetype: string
  appearances: number
  performanceScore: number  // 0–1, higher = better historical results
}

export interface MatchupResult {
  opponent: string
  winRate: number           // 0–1
  confidence: 'high' | 'medium' | 'low'
  opponentAppearances: number
}

export interface MatchupAnalysis {
  yourDeck: string
  yourScore: ArchetypeScore | null
  matchups: MatchupResult[]
  overallWinRate: number
}

// Bradley-Terry pairwise win rate
function bradleyTerry(a: number, b: number): number {
  if (a + b === 0) return 0.5
  return a / (a + b)
}

export async function getArchetypeScores(format: Format): Promise<Map<string, ArchetypeScore>> {
  const rows = await prisma.tournamentDeck.findMany({
    where: {
      archetype: { not: null },
      rank: { not: null },
      event: { format },
    },
    include: { event: { select: { playerCount: true } } },
  })

  // Score = sum(1/rank) across all appearances.
  // This rewards consistency: multiple top finishes >> one lucky top-8.
  // 1st place contributes 1.0, 4th contributes 0.25, 8th contributes 0.125.
  const groups = new Map<string, { scoreSum: number; appearances: number; displayName: string }>()

  for (const row of rows) {
    const key = row.archetype!.toLowerCase()
    const g = groups.get(key) ?? { scoreSum: 0, appearances: 0, displayName: row.archetype! }
    g.scoreSum += 1 / row.rank!
    g.appearances++
    groups.set(key, g)
  }

  const scores = new Map<string, ArchetypeScore>()
  for (const [key, g] of Array.from(groups.entries())) {
    scores.set(key, {
      archetype: g.displayName,
      appearances: g.appearances,
      performanceScore: g.scoreSum,
    })
  }

  return scores
}

export async function getKnownArchetypes(format: Format): Promise<string[]> {
  const rows = await prisma.tournamentDeck.findMany({
    where: { archetype: { not: null }, event: { format }, rank: { not: null } },
    select: { archetype: true },
    distinct: ['archetype'],
    orderBy: { archetype: 'asc' },
  })
  return rows.map((r) => r.archetype!)
}

function findScore(
  scores: Map<string, ArchetypeScore>,
  name: string,
): ArchetypeScore | null {
  const key = name.toLowerCase()
  // Exact match first
  if (scores.has(key)) return scores.get(key)!
  // Prefix match: "Lumra" matches "lumra, bellow of the woods"
  for (const [k, v] of Array.from(scores.entries())) {
    if (k.startsWith(key) || key.startsWith(k)) return v
  }
  return null
}

export async function calculateMatchups(
  yourDeck: string,
  opponents: string[],
  format: Format,
): Promise<MatchupAnalysis> {
  const scores = await getArchetypeScores(format)

  const yourScore = findScore(scores, yourDeck)

  // Median of known scores as fallback for unknown archetypes
  const allScores = Array.from(scores.values()).map((s) => s.performanceScore).sort((a, b) => a - b)
  const medianScore = allScores.length > 0 ? allScores[Math.floor(allScores.length / 2)] : 1

  const yourPerf = yourScore?.performanceScore ?? medianScore

  const matchups: MatchupResult[] = opponents.map((opp) => {
    const oppScore = findScore(scores, opp)
    const oppPerf = oppScore?.performanceScore ?? medianScore

    const appearances = oppScore?.appearances ?? 0
    const confidence: MatchupResult['confidence'] =
      appearances >= 5 ? 'high' : appearances >= 2 ? 'medium' : 'low'

    return {
      opponent: oppScore?.archetype ?? opp, // use canonical name from DB if found
      winRate: bradleyTerry(yourPerf, oppPerf),
      confidence,
      opponentAppearances: appearances,
    }
  })

  const overallWinRate =
    matchups.length > 0
      ? matchups.reduce((s, m) => s + m.winRate, 0) / matchups.length
      : 0.5

  return {
    yourDeck,
    yourScore: yourScore
      ? { ...yourScore, archetype: yourDeck }
      : null,
    matchups,
    overallWinRate,
  }
}
