vi.mock('@/lib/prisma', () => ({
  prisma: {
    tournamentDeck: { findMany: vi.fn() },
    matchResult: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { calculateMatchups, getArchetypeScores } from '@/lib/analyzer/matchup'

const deckMany = prisma.tournamentDeck.findMany as ReturnType<typeof vi.fn>
const matchMany = prisma.matchResult.findMany as ReturnType<typeof vi.fn>

// Rows shaped per the include in getArchetypeScores: { archetype, rank, event: { playerCount } }
function deck(archetype: string, rank: number, playerCount = 64) {
  return { archetype, rank, event: { playerCount } }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getArchetypeScores', () => {
  it('scores via sum(1/rank): two 1st places outscore a single 8th place', async () => {
    deckMany.mockResolvedValue([
      deck('Burn', 1),
      deck('Burn', 1),
      deck('Control', 8),
    ])
    const scores = await getArchetypeScores('modern')
    const burn = scores.get('burn')!
    const control = scores.get('control')!
    expect(burn.performanceScore).toBeCloseTo(2.0) // 1 + 1
    expect(control.performanceScore).toBeCloseTo(0.125) // 1/8
    expect(burn.performanceScore).toBeGreaterThan(control.performanceScore)
  })

  it('counts appearances per archetype', async () => {
    deckMany.mockResolvedValue([
      deck('Burn', 1),
      deck('Burn', 4),
      deck('Burn', 16),
    ])
    const scores = await getArchetypeScores('modern')
    expect(scores.get('burn')!.appearances).toBe(3)
  })

  it('groups case-insensitively but preserves a display name', async () => {
    deckMany.mockResolvedValue([
      deck('Burn', 1),
      deck('BURN', 2),
      deck('burn', 4),
    ])
    const scores = await getArchetypeScores('modern')
    expect(scores.size).toBe(1)
    const burn = scores.get('burn')!
    expect(burn.appearances).toBe(3)
    expect(burn.archetype.toLowerCase()).toBe('burn')
  })

  it('returns an empty map when there are no decks', async () => {
    deckMany.mockResolvedValue([])
    const scores = await getArchetypeScores('modern')
    expect(scores.size).toBe(0)
  })
})

describe('calculateMatchups', () => {
  it('win rate is 0.5 for equal-strength decks', async () => {
    deckMany.mockResolvedValue([
      deck('Burn', 1),
      deck('Control', 1),
    ])
    const analysis = await calculateMatchups('Burn', ['Control'], 'modern')
    expect(analysis.matchups[0].modelWinRate).toBeCloseTo(0.5)
    expect(analysis.matchups[0].winRate).toBeCloseTo(0.5)
  })

  it('a stronger deck beats a weaker opponent (> 0.5)', async () => {
    deckMany.mockResolvedValue([
      deck('Burn', 1),   // strong: score 1.0
      deck('Control', 8), // weak: score 0.125
    ])
    const analysis = await calculateMatchups('Burn', ['Control'], 'modern')
    // bradleyTerry(1.0, 0.125) = 1/1.125 ~ 0.889
    expect(analysis.matchups[0].modelWinRate).toBeGreaterThan(0.5)
    expect(analysis.matchups[0].modelWinRate).toBeCloseTo(0.889, 2)
  })

  it('falls back to the median score for an unknown opponent archetype', async () => {
    // Three archetypes -> median is the middle score.
    deckMany.mockResolvedValue([
      deck('Burn', 1),     // 1.0
      deck('Midrange', 2), // 0.5
      deck('Control', 4),  // 0.25
    ])
    // Your deck = Midrange (0.5), opponent unknown -> median (0.5) -> 0.5 win rate.
    const analysis = await calculateMatchups('Midrange', ['Mystery Brew'], 'modern')
    expect(analysis.matchups[0].opponentAppearances).toBe(0)
    expect(analysis.matchups[0].confidence).toBe('low')
    expect(analysis.matchups[0].modelWinRate).toBeCloseTo(0.5)
  })

  it('assigns confidence based on opponent appearances', async () => {
    deckMany.mockResolvedValue([
      deck('Burn', 1),
      // 5 Control appearances -> high
      deck('Control', 2),
      deck('Control', 3),
      deck('Control', 4),
      deck('Control', 5),
      deck('Control', 6),
    ])
    const analysis = await calculateMatchups('Burn', ['Control'], 'modern')
    expect(analysis.matchups[0].opponentAppearances).toBe(5)
    expect(analysis.matchups[0].confidence).toBe('high')
  })

  it('blends personal record toward the personal win rate and populates `personal`', async () => {
    deckMany.mockResolvedValue([
      deck('Burn', 1),
      deck('Control', 1),
    ])
    // Pure model would be 0.5. Personal record is dominated by wins.
    matchMany.mockResolvedValue([
      { oppArchetype: 'Control', result: 'WIN' },
      { oppArchetype: 'Control', result: 'WIN' },
      { oppArchetype: 'Control', result: 'WIN' },
      { oppArchetype: 'Control', result: 'WIN' },
      { oppArchetype: 'Control', result: 'WIN' },
      { oppArchetype: 'Control', result: 'WIN' },
      { oppArchetype: 'Control', result: 'LOSS' },
      { oppArchetype: 'Control', result: 'LOSS' },
    ])
    const analysis = await calculateMatchups('Burn', ['Control'], 'modern', 'user-1')
    const m = analysis.matchups[0]
    expect(m.modelWinRate).toBeCloseTo(0.5) // pure model unchanged
    expect(m.personal).toEqual({ wins: 6, losses: 2, draws: 0 })
    // blended: (0.5*4 + 0.75*8) / (4+8) = (2 + 6) / 12 = 0.6667
    expect(m.winRate).toBeCloseTo(0.6667, 3)
    expect(m.winRate).toBeGreaterThan(m.modelWinRate)
    // matchResult.findMany scoped to userId + format
    expect(matchMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1', format: 'modern' }) }),
    )
  })

  it('does not blend (personal is null) when no userId is provided', async () => {
    deckMany.mockResolvedValue([deck('Burn', 1), deck('Control', 1)])
    const analysis = await calculateMatchups('Burn', ['Control'], 'modern')
    expect(matchMany).not.toHaveBeenCalled()
    expect(analysis.matchups[0].personal).toBeNull()
    expect(analysis.matchups[0].winRate).toBe(analysis.matchups[0].modelWinRate)
  })

  it('computes overall win rate as the mean across matchups', async () => {
    deckMany.mockResolvedValue([
      deck('Burn', 1),    // 1.0
      deck('Control', 8), // 0.125
      deck('Aggro', 8),   // 0.125
    ])
    const analysis = await calculateMatchups('Burn', ['Control', 'Aggro'], 'modern')
    const mean =
      analysis.matchups.reduce((s, m) => s + m.winRate, 0) / analysis.matchups.length
    expect(analysis.overallWinRate).toBeCloseTo(mean)
  })
})
