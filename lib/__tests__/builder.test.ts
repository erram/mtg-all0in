import { describe, it, expect, vi, beforeEach } from 'vitest'

// Prisma is mocked so getOwnedCounts / getDeckCompletion never touch a DB.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    collectionEntry: { findMany: vi.fn() },
    tournamentDeck: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}))

// getDeckCompletion batches a Scryfall lookup for prices — stub it.
vi.mock('@/lib/scryfall/client', () => ({
  getCardsByNames: vi.fn().mockResolvedValue(new Map()),
  getCardImageUri: vi.fn(() => ''),
}))

import { normalizeCardName, getOwnedCounts, getDeckCompletion } from '../builder'
import { prisma } from '@/lib/prisma'
import { getCardsByNames } from '@/lib/scryfall/client'

const findMany = prisma.collectionEntry.findMany as ReturnType<typeof vi.fn>
const findUnique = prisma.tournamentDeck.findUnique as ReturnType<typeof vi.fn>
const mockGetCardsByNames = getCardsByNames as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCardsByNames.mockResolvedValue(new Map())
})

describe('normalizeCardName', () => {
  it('lowercases the name', () => {
    expect(normalizeCardName('Lightning Bolt')).toBe('lightning bolt')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeCardName('  Llanowar Elves  ')).toBe('llanowar elves')
  })

  it('keeps only the front face of a DFC split on " // "', () => {
    expect(normalizeCardName('Fable of the Mirror-Breaker // Reflection of Kiki-Rik')).toBe(
      'fable of the mirror-breaker'
    )
  })

  it('lowercases and trims the extracted front face together', () => {
    expect(normalizeCardName('  Delver of Secrets // Insectile Aberration  ')).toBe(
      'delver of secrets'
    )
  })

  it('returns a plain name unchanged aside from casing', () => {
    expect(normalizeCardName('Island')).toBe('island')
  })
})

describe('getOwnedCounts', () => {
  it('aggregates quantities by normalized card name', async () => {
    findMany.mockResolvedValue([
      { quantity: 2, card: { name: 'Lightning Bolt' } },
      { quantity: 1, card: { name: 'lightning bolt' } }, // different casing, same card
      { quantity: 4, card: { name: 'Island' } },
    ])

    const owned = await getOwnedCounts('user-1')

    expect(owned.get('lightning bolt')).toBe(3)
    expect(owned.get('island')).toBe(4)
    expect(owned.size).toBe(2)
  })

  it('normalizes DFC entries to their front-face key when aggregating', async () => {
    findMany.mockResolvedValue([
      { quantity: 1, card: { name: 'Delver of Secrets // Insectile Aberration' } },
      { quantity: 2, card: { name: 'Delver of Secrets' } },
    ])

    const owned = await getOwnedCounts('user-1')

    expect(owned.get('delver of secrets')).toBe(3)
    expect(owned.size).toBe(1)
  })

  it('queries collection entries for the given user', async () => {
    findMany.mockResolvedValue([])
    await getOwnedCounts('user-42')
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-42' } }))
  })

  it('returns an empty map when the collection is empty', async () => {
    findMany.mockResolvedValue([])
    const owned = await getOwnedCounts('user-1')
    expect(owned.size).toBe(0)
  })
})

describe('getDeckCompletion', () => {
  it('returns null when the deck has no decklist', async () => {
    findUnique.mockResolvedValue({
      id: 'd1',
      archetype: 'Burn',
      decklist: null,
      event: { id: 'e1', name: 'Event', format: 'modern' },
    })
    const result = await getDeckCompletion('user-1', 'd1')
    expect(result).toBeNull()
  })

  it('returns null when the deck is not found', async () => {
    findUnique.mockResolvedValue(null)
    const result = await getDeckCompletion('user-1', 'missing')
    expect(result).toBeNull()
  })

  it('treats basic lands as owned and excludes them from missing/cost', async () => {
    findUnique.mockResolvedValue({
      id: 'd1',
      archetype: 'Mono Red',
      decklist: {
        mainboard: [
          { name: 'Mountain', qty: 20 },
          { name: 'Lightning Bolt', qty: 4 },
        ],
        sideboard: [],
      },
      event: { id: 'e1', name: 'Modern Challenge', format: 'modern' },
    })
    // User owns no spells, but Mountains should count as owned.
    findMany.mockResolvedValue([])

    const result = await getDeckCompletion('user-1', 'd1')!

    expect(result).not.toBeNull()
    expect(result!.totalCards).toBe(24)
    expect(result!.ownedCards).toBe(20) // 20 mountains owned, 0 bolts
    expect(result!.coverage).toBe(Math.round((20 / 24) * 100))
    // Only the non-basic shortfall appears in missing.
    expect(result!.missing).toHaveLength(1)
    expect(result!.missing[0].name).toBe('Lightning Bolt')
    expect(result!.missing[0].missing).toBe(4)
  })

  it('computes owned vs needed coverage with partial ownership', async () => {
    findUnique.mockResolvedValue({
      id: 'd1',
      archetype: 'Control',
      decklist: {
        mainboard: [{ name: 'Counterspell', qty: 4 }],
        sideboard: [],
      },
      event: { id: 'e1', name: 'Event', format: 'modern' },
    })
    findMany.mockResolvedValue([{ quantity: 1, card: { name: 'Counterspell' } }])

    const result = await getDeckCompletion('user-1', 'd1')

    expect(result!.totalCards).toBe(4)
    expect(result!.ownedCards).toBe(1)
    expect(result!.coverage).toBe(25)
    expect(result!.missing[0]).toMatchObject({
      name: 'Counterspell',
      needed: 4,
      owned: 1,
      missing: 3,
    })
  })

  it('merges duplicate names across mainboard and sideboard requirements', async () => {
    findUnique.mockResolvedValue({
      id: 'd1',
      archetype: 'Burn',
      decklist: {
        mainboard: [{ name: 'Lightning Bolt', qty: 4 }],
        sideboard: [{ name: 'Lightning Bolt', qty: 2 }],
      },
      event: { id: 'e1', name: 'Event', format: 'modern' },
    })
    findMany.mockResolvedValue([{ quantity: 4, card: { name: 'Lightning Bolt' } }])

    const result = await getDeckCompletion('user-1', 'd1')

    expect(result!.totalCards).toBe(6) // 4 + 2 merged into one requirement of 6
    expect(result!.ownedCards).toBe(4) // capped at need
    expect(result!.missing).toHaveLength(1)
    expect(result!.missing[0].missing).toBe(2)
  })

  it('sums missing cost from Scryfall prices and counts unpriced cards', async () => {
    findUnique.mockResolvedValue({
      id: 'd1',
      archetype: 'Combo',
      decklist: {
        mainboard: [
          { name: 'Ragavan, Nimble Pilferer', qty: 2 },
          { name: 'Mystery Card', qty: 1 },
        ],
        sideboard: [],
      },
      event: { id: 'e1', name: 'Event', format: 'modern' },
    })
    findMany.mockResolvedValue([]) // owns nothing

    // getCardsByNames returns a Map keyed by normalized name.
    mockGetCardsByNames.mockResolvedValue(
      new Map<string, unknown>([
        ['ragavan, nimble pilferer', { prices: { usd: '50.00' } }],
        // 'mystery card' deliberately absent → unpriced
      ])
    )

    const result = await getDeckCompletion('user-1', 'd1')

    // 2 Ragavan × $50 = $100; Mystery Card has no price.
    expect(result!.missingCostUsd).toBe(100)
    expect(result!.unpricedCount).toBe(1)
    expect(result!.missing).toHaveLength(2)
    // Most expensive missing first.
    expect(result!.missing[0].name).toBe('Ragavan, Nimble Pilferer')
    expect(result!.missing[0].priceUsd).toBe(50)
  })

  it('produces no missing entries when the deck is fully owned', async () => {
    findUnique.mockResolvedValue({
      id: 'd1',
      archetype: 'Aggro',
      decklist: {
        mainboard: [{ name: 'Goblin Guide', qty: 4 }],
        sideboard: [],
      },
      event: { id: 'e1', name: 'Event', format: 'modern' },
    })
    findMany.mockResolvedValue([{ quantity: 4, card: { name: 'Goblin Guide' } }])

    const result = await getDeckCompletion('user-1', 'd1')

    expect(result!.coverage).toBe(100)
    expect(result!.missing).toHaveLength(0)
    expect(result!.missingCostUsd).toBe(0)
    expect(result!.unpricedCount).toBe(0)
    // No shortfalls → no Scryfall call.
    expect(mockGetCardsByNames).not.toHaveBeenCalled()
  })
})
