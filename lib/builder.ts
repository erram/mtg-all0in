import { prisma } from '@/lib/prisma'
import { getCardsByNames } from '@/lib/scryfall/client'
import type { Format } from '@/lib/tournaments/types'

// Basics are treated as owned — they cost pennies and skew coverage otherwise.
const BASIC_LANDS = new Set([
  'plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
  'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
  'snow-covered mountain', 'snow-covered forest',
])

/** Lowercase, front face only — tournament lists use front-face names for DFCs. */
export function normalizeCardName(name: string): string {
  return name.split(' // ')[0].trim().toLowerCase()
}

type StoredCard = { name: string; qty: number; img?: string | null }
type StoredDecklist = { mainboard?: StoredCard[]; sideboard?: StoredCard[]; enriched?: boolean }

export interface BuildableDeck {
  deckId: string
  archetype: string | null
  rank: number | null
  playerName: string | null
  eventId: string
  eventName: string
  eventDate: Date
  totalCards: number
  ownedCards: number
  coverage: number // 0–100
  missingUnique: number
}

export interface MissingCard {
  name: string
  needed: number
  owned: number
  missing: number
  img: string | null
  priceUsd: number | null
}

export interface DeckCompletion {
  deckId: string
  archetype: string | null
  eventId: string
  eventName: string
  format: string
  totalCards: number
  ownedCards: number
  coverage: number
  missing: MissingCard[]
  missingCostUsd: number // sum over cards with known prices
  unpricedCount: number
}

/** Collection aggregated by normalized card name → total quantity owned. */
export async function getOwnedCounts(userId: string): Promise<Map<string, number>> {
  const entries = await prisma.collectionEntry.findMany({
    where: { userId },
    select: { quantity: true, card: { select: { name: true } } },
  })
  const owned = new Map<string, number>()
  for (const e of entries) {
    const key = normalizeCardName(e.card.name)
    owned.set(key, (owned.get(key) ?? 0) + e.quantity)
  }
  return owned
}

function deckCards(decklist: StoredDecklist): StoredCard[] {
  // Merge duplicate names across main/side into single requirements
  const merged = new Map<string, StoredCard>()
  for (const c of [...(decklist.mainboard ?? []), ...(decklist.sideboard ?? [])]) {
    const key = normalizeCardName(c.name)
    const prev = merged.get(key)
    if (prev) prev.qty += c.qty
    else merged.set(key, { ...c })
  }
  return Array.from(merged.values())
}

function computeCoverage(cards: StoredCard[], owned: Map<string, number>) {
  let total = 0
  let have = 0
  let missingUnique = 0
  for (const c of cards) {
    const key = normalizeCardName(c.name)
    total += c.qty
    if (BASIC_LANDS.has(key)) {
      have += c.qty
      continue
    }
    const ownedQty = Math.min(owned.get(key) ?? 0, c.qty)
    have += ownedQty
    if (ownedQty < c.qty) missingUnique++
  }
  return { total, have, missingUnique }
}

export async function getBuildableDecks(userId: string, format: Format): Promise<BuildableDeck[]> {
  const [owned, decks] = await Promise.all([
    getOwnedCounts(userId),
    prisma.tournamentDeck.findMany({
      where: {
        decklist: { not: { equals: null } },
        event: { format },
      },
      include: { event: { select: { id: true, name: true, date: true } } },
      orderBy: { event: { date: 'desc' } },
      take: 80,
    }),
  ])

  const results: BuildableDeck[] = []
  for (const deck of decks) {
    const dl = deck.decklist as StoredDecklist | null
    if (!dl?.enriched) continue // only decks with full, image-enriched lists

    const cards = deckCards(dl)
    const { total, have, missingUnique } = computeCoverage(cards, owned)
    if (total < 40) continue // skip partial scrapes

    results.push({
      deckId: deck.id,
      archetype: deck.archetype,
      rank: deck.rank,
      playerName: deck.playerName,
      eventId: deck.event.id,
      eventName: deck.event.name,
      eventDate: deck.event.date,
      totalCards: total,
      ownedCards: have,
      coverage: Math.round((have / total) * 100),
      missingUnique,
    })
  }

  // Best coverage first; tie-break on better finish
  results.sort((a, b) => b.coverage - a.coverage || (a.rank ?? 99) - (b.rank ?? 99))
  return results
}

export async function getDeckCompletion(userId: string, deckId: string): Promise<DeckCompletion | null> {
  const deck = await prisma.tournamentDeck.findUnique({
    where: { id: deckId },
    include: { event: { select: { id: true, name: true, format: true } } },
  })
  if (!deck?.decklist) return null

  const dl = deck.decklist as StoredDecklist
  const owned = await getOwnedCounts(userId)
  const cards = deckCards(dl)
  const { total, have } = computeCoverage(cards, owned)

  // Cards the user is short on
  const shortfalls = cards.filter((c) => {
    const key = normalizeCardName(c.name)
    if (BASIC_LANDS.has(key)) return false
    return (owned.get(key) ?? 0) < c.qty
  })

  // One batched Scryfall call for prices of missing cards
  const cardMap = shortfalls.length > 0
    ? await getCardsByNames(shortfalls.map((c) => c.name))
    : new Map()

  let missingCostUsd = 0
  let unpricedCount = 0
  const missing: MissingCard[] = shortfalls.map((c) => {
    const key = normalizeCardName(c.name)
    const ownedQty = owned.get(key) ?? 0
    const missingQty = c.qty - ownedQty
    const sc = cardMap.get(key) ?? cardMap.get(c.name.toLowerCase())
    const price = sc?.prices?.usd ? parseFloat(sc.prices.usd) : null
    if (price != null) missingCostUsd += price * missingQty
    else unpricedCount++
    return {
      name: c.name,
      needed: c.qty,
      owned: ownedQty,
      missing: missingQty,
      img: c.img ?? null,
      priceUsd: price,
    }
  })

  missing.sort((a, b) => (b.priceUsd ?? 0) * b.missing - (a.priceUsd ?? 0) * a.missing)

  return {
    deckId: deck.id,
    archetype: deck.archetype,
    eventId: deck.event.id,
    eventName: deck.event.name,
    format: deck.event.format,
    totalCards: total,
    ownedCards: have,
    coverage: Math.round((have / total) * 100),
    missing,
    missingCostUsd: Math.round(missingCostUsd * 100) / 100,
    unpricedCount,
  }
}
