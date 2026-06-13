import { prisma } from '@/lib/prisma'
import type { Format } from '@/lib/tournaments/types'

export interface ArchetypeScore {
  archetype: string
  appearances: number
  performanceScore: number  // 0–1, higher = better historical results
}

export interface MatchupResult {
  opponent: string
  winRate: number           // 0–1, blended when personal data exists
  modelWinRate: number      // 0–1, pure Bradley-Terry
  confidence: 'high' | 'medium' | 'low'
  opponentAppearances: number
  personal: { wins: number; losses: number; draws: number } | null
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

// Pseudo-count weight for the model when blending with personal results.
// With K=4: after 4 logged games, personal data carries half the weight.
const MODEL_PSEUDO_COUNT = 4

export async function calculateMatchups(
  yourDeck: string,
  opponents: string[],
  format: Format,
  userId?: string,
): Promise<MatchupAnalysis> {
  const scores = await getArchetypeScores(format)

  // Personal match history vs each opponent archetype (feature: model calibration)
  const personalRecords = new Map<string, { wins: number; losses: number; draws: number }>()
  if (userId) {
    const logged = await prisma.matchResult.findMany({
      where: { userId, format },
      select: { oppArchetype: true, result: true },
    })
    for (const m of logged) {
      const key = m.oppArchetype.toLowerCase()
      const rec = personalRecords.get(key) ?? { wins: 0, losses: 0, draws: 0 }
      if (m.result === 'WIN') rec.wins++
      else if (m.result === 'LOSS') rec.losses++
      else rec.draws++
      personalRecords.set(key, rec)
    }
  }

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

    const modelWinRate = bradleyTerry(yourPerf, oppPerf)

    // Blend model with personal record: draws count half
    const canonical = (oppScore?.archetype ?? opp).toLowerCase()
    const personal = personalRecords.get(canonical) ?? personalRecords.get(opp.toLowerCase()) ?? null
    let winRate = modelWinRate
    if (personal) {
      const games = personal.wins + personal.losses + personal.draws
      if (games > 0) {
        const personalRate = (personal.wins + personal.draws * 0.5) / games
        winRate = (modelWinRate * MODEL_PSEUDO_COUNT + personalRate * games) / (MODEL_PSEUDO_COUNT + games)
      }
    }

    return {
      opponent: oppScore?.archetype ?? opp, // use canonical name from DB if found
      winRate,
      modelWinRate,
      confidence,
      opponentAppearances: appearances,
      personal,
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
