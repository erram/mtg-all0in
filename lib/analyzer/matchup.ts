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
      event: { format, playerCount: { not: null } },
    },
    include: { event: { select: { playerCount: true } } },
  })

  // Group by archetype
  const groups = new Map<string, { rankRatios: number[]; appearances: number }>()

  for (const row of rows) {
    const key = row.archetype!.toLowerCase()
    const playerCount = row.event.playerCount!
    // rank 1 in a 56-player event → ratio 0.018 (lower = better finish)
    const rankRatio = row.rank! / playerCount
    const g = groups.get(key) ?? { rankRatios: [], appearances: 0 }
    g.rankRatios.push(rankRatio)
    g.appearances++
    groups.set(key, g)
  }

  const scores = new Map<string, ArchetypeScore>()
  for (const [key, g] of Array.from(groups.entries())) {
    const avgRatio = g.rankRatios.reduce((s: number, r: number) => s + r, 0) / g.rankRatios.length
    scores.set(key, {
      archetype: key,
      appearances: g.appearances,
      // Invert: lower rank ratio = better performance = higher score
      performanceScore: Math.max(0, 1 - avgRatio),
    })
  }

  return scores
}

export async function calculateMatchups(
  yourDeck: string,
  opponents: string[],
  format: Format,
): Promise<MatchupAnalysis> {
  const scores = await getArchetypeScores(format)

  const yourKey = yourDeck.toLowerCase()
  const yourScore = scores.get(yourKey) ?? null

  // Default score for unknown archetypes: median of known scores
  const allScores = Array.from(scores.values()).map((s) => s.performanceScore)
  const medianScore = allScores.length > 0
    ? allScores.sort((a, b) => a - b)[Math.floor(allScores.length / 2)]
    : 0.5
  const yourPerf = yourScore?.performanceScore ?? medianScore

  const matchups: MatchupResult[] = opponents.map((opp) => {
    const oppKey = opp.toLowerCase()
    const oppScore = scores.get(oppKey)
    const oppPerf = oppScore?.performanceScore ?? medianScore

    const appearances = oppScore?.appearances ?? 0
    const confidence: MatchupResult['confidence'] =
      appearances >= 5 ? 'high' : appearances >= 2 ? 'medium' : 'low'

    return {
      opponent: opp,
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
