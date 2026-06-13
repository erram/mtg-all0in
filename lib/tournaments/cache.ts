import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { scrapeFormatPage, scrapeEventDecks, scrapeDeckList, scrapePlayerCount, type EventDeckScrapeResult } from './mtgtop8'
import { scrapeMetaSnapshot } from './mtggoldfish'
import { getCardsByNames, getCardImageUri } from '@/lib/scryfall/client'
import type { Format } from './types'

// Formats where Goldfish has dedicated metagame pages (better data than MTGTop8)
const GOLDFISH_META_FORMATS: Format[] = ['modern', 'pioneer', 'standard', 'duel-commander', 'pauper']

const EVENT_TTL_MS = 6 * 60 * 60 * 1000   // 6 hours
const META_TTL_MS = 12 * 60 * 60 * 1000   // 12 hours

export type EventRow = {
  id: string
  name: string
  format: string
  date: Date
  location: string | null
  playerCount: number | null
  fetchedAt: Date
  source: string
  externalId: string
}

export type DeckRow = {
  id: string
  rank: number | null
  playerName: string | null
  archetype: string | null
  colors: string | null
  externalUrl: string | null
}

export type MetaArchetypeRow = {
  name: string
  share: number
  colors?: string
  sampleDeckUrl?: string
}

async function refreshFormat(format: Format): Promise<void> {
  try {
    const { events, meta } = await scrapeFormatPage(format)

    for (const ev of events) {
      await prisma.tournamentEvent.upsert({
        where: { source_externalId: { source: ev.source, externalId: ev.externalId } },
        update: {
          name: ev.name,
          date: ev.date,
          location: ev.location ?? null,
          fetchedAt: new Date(),
        },
        create: {
          source: ev.source,
          externalId: ev.externalId,
          format: ev.format,
          name: ev.name,
          date: ev.date,
          location: ev.location ?? null,
          playerCount: null,
        },
      })
    }

    if (meta.length > 0) {
      await prisma.metaSnapshot.upsert({
        where: { source_format: { source: 'mtgtop8', format } },
        update: { archetypes: meta as object[], fetchedAt: new Date() },
        create: { source: 'mtgtop8', format, archetypes: meta as object[] },
      })
    }

    // Goldfish meta for supported formats (richer data, covers duel-commander)
    if (GOLDFISH_META_FORMATS.includes(format)) {
      try {
        const gfMeta = await scrapeMetaSnapshot(format)
        if (gfMeta.length > 0) {
          await prisma.metaSnapshot.upsert({
            where: { source_format: { source: 'mtggoldfish', format } },
            update: { archetypes: gfMeta as object[], fetchedAt: new Date() },
            create: { source: 'mtggoldfish', format, archetypes: gfMeta as object[] },
          })
        }
      } catch (e) {
        console.error('[tournaments] goldfish meta failed:', e)
      }
    }

    // Backfills run in the background — never block page rendering
    void backfillPlayerCounts(format)
    void backfillDecklists(format)
  } catch (e) {
    console.error('[tournaments] format refresh failed:', e)
  }
}

/**
 * Gradually populates decklists so the Builder fills up without anyone
 * having to click through every deck page. Each format refresh processes
 * a small batch: scrape missing event decks, then enrich a few decklists.
 */
async function backfillDecklists(format: Format): Promise<void> {
  try {
    // 1. Events with no decks yet → scrape their deck lists (also fixes player counts)
    const emptyEvents = await prisma.tournamentEvent.findMany({
      where: { format, decks: { none: {} } },
      orderBy: [{ date: 'desc' }, { name: 'asc' }],
      take: 3,
      select: { id: true, externalId: true },
    })
    for (const ev of emptyEvents) {
      await refreshDecks(ev.id, ev.externalId, format)
      await new Promise((r) => setTimeout(r, 250))
    }

    // 2. Decks without an enriched decklist → scrape + attach Scryfall images.
    // Filter enriched-status in JS: Prisma JSON-path null handling is fiddly.
    const candidates = await prisma.tournamentDeck.findMany({
      where: { event: { format }, externalUrl: { not: null } },
      orderBy: { event: { date: 'desc' } },
      take: 60,
      select: { id: true, externalUrl: true, decklist: true },
    })
    const pending = candidates
      .filter((d) => {
        const dl = d.decklist as { enriched?: boolean } | null
        return !dl?.enriched
      })
      .slice(0, 5)

    for (const deck of pending) {
      try {
        const parsed = await scrapeDeckList(deck.externalUrl!)
        if (parsed.mainboard.length === 0 && parsed.sideboard.length === 0) continue

        const allNames = Array.from(new Set(
          [...parsed.mainboard, ...parsed.sideboard].map((c) => c.name),
        ))
        const cardMap = await getCardsByNames(allNames)

        const enrich = (c: { name: string; qty: number }) => {
          const card = cardMap.get(c.name.toLowerCase())
          return { ...c, img: card ? getCardImageUri(card) : null }
        }

        await prisma.tournamentDeck.update({
          where: { id: deck.id },
          data: {
            decklist: {
              mainboard: parsed.mainboard.map(enrich),
              sideboard: parsed.sideboard.map(enrich),
              enriched: cardMap.size > 0,
            } as object,
          },
        })
      } catch (e) {
        console.error('[tournaments] decklist backfill failed for deck:', deck.id, e)
      }
      await new Promise((r) => setTimeout(r, 250))
    }
  } catch (e) {
    console.error('[tournaments] decklist backfill failed:', e)
  }
}

async function backfillPlayerCounts(format: Format): Promise<void> {
  try {
    const missing = await prisma.tournamentEvent.findMany({
      where: { format, playerCount: null },
      orderBy: [{ date: 'desc' }, { name: 'asc' }],
      take: 10,
      select: { id: true, externalId: true },
    })
    for (const ev of missing) {
      const count = await scrapePlayerCount(ev.externalId, format)
      if (count != null) {
        await prisma.tournamentEvent.update({ where: { id: ev.id }, data: { playerCount: count } })
      }
      await new Promise((r) => setTimeout(r, 150))
    }
  } catch (e) {
    console.error('[tournaments] player count backfill failed:', e)
  }
}

// Archetype art crops for event pages — cached 24h per event so repeat
// views never hit Scryfall. Cheap to store: just name → URL pairs.
export async function getArchetypeArt(
  eventId: string,
  names: string[],
): Promise<Record<string, string | null>> {
  if (names.length === 0) return {}

  const cached = unstable_cache(
    async (): Promise<Record<string, string | null>> => {
      const cardMap = await getCardsByNames(names)
      const result: Record<string, string | null> = {}
      for (const name of names) {
        const card = cardMap.get(name.toLowerCase())
        result[name.toLowerCase()] =
          card?.image_uris?.art_crop ??
          card?.card_faces?.[0]?.image_uris?.art_crop ??
          null
      }
      return result
    },
    ['archetype-art', eventId],
    { revalidate: 86400 },
  )

  return cached()
}

async function refreshDecks(eventId: string, externalId: string, format: Format): Promise<void> {
  try {
    const { decks, playerCount }: EventDeckScrapeResult = await scrapeEventDecks(externalId, format)

    if (playerCount != null) {
      await prisma.tournamentEvent.update({ where: { id: eventId }, data: { playerCount } })
    }

    await prisma.tournamentDeck.deleteMany({ where: { eventId } })
    if (decks.length > 0) {
      await prisma.tournamentDeck.createMany({
        data: decks.map((d) => ({
          eventId,
          rank: d.rank ?? null,
          playerName: d.playerName ?? null,
          archetype: d.archetype ?? null,
          colors: null,
          externalUrl: d.externalUrl ?? null,
        })),
      })
    }
  } catch (e) {
    console.error('[tournaments] deck refresh failed:', e)
  }
}

const PER_PAGE = 10

function isOnline(name: string, location: string | null): boolean {
  return /\bMTGO\b/i.test(name) || (!location && /\b(league|challenge|qualifier)\b/i.test(name))
}

export async function getEventsByFormat(
  format: Format,
  page = 1,
  venue: 'both' | 'paper' | 'online' = 'both',
): Promise<{ events: EventRow[]; total: number; totalPages: number; stale: boolean }> {
  const all = await prisma.tournamentEvent.findMany({
    where: { format },
    orderBy: [{ date: 'desc' }, { name: 'asc' }],
  })

  const stale = all.length === 0 || Date.now() - all[0].fetchedAt.getTime() > EVENT_TTL_MS

  if (all.length === 0) {
    await refreshFormat(format)
    const fresh = await prisma.tournamentEvent.findMany({
      where: { format },
      orderBy: [{ date: 'desc' }, { name: 'asc' }],
    })
    const filtered = fresh
    return { events: filtered.slice(0, PER_PAGE), total: filtered.length, totalPages: Math.ceil(filtered.length / PER_PAGE), stale: false }
  }

  if (stale) void refreshFormat(format)

  const filtered = venue === 'both' ? all : all.filter((ev) => {
    const online = isOnline(ev.name, ev.location)
    return venue === 'online' ? online : !online
  })

  const offset = (page - 1) * PER_PAGE
  return {
    events: filtered.slice(offset, offset + PER_PAGE),
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / PER_PAGE),
    stale,
  }
}

export async function getEventById(id: string): Promise<{
  event: (EventRow & { decks: DeckRow[] }) | null
  stale: boolean
}> {
  const event = await prisma.tournamentEvent.findUnique({
    where: { id },
    include: { decks: { orderBy: { rank: 'asc' } } },
  })

  if (!event) return { event: null, stale: false }

  const stale = Date.now() - event.fetchedAt.getTime() > EVENT_TTL_MS

  if (event.decks.length === 0) {
    await refreshDecks(event.id, event.externalId, event.format as Format)
    const fresh = await prisma.tournamentEvent.findUnique({
      where: { id },
      include: { decks: { orderBy: { rank: 'asc' } } },
    })
    return { event: fresh, stale: false }
  }

  if (stale) void refreshDecks(event.id, event.externalId, event.format as Format)

  return { event, stale }
}

export type CardWithImage = {
  name: string
  qty: number
  imageUri: string | null
}

export type DeckWithImages = {
  id: string
  rank: number | null
  archetype: string | null
  playerName: string | null
  externalUrl: string | null
  event: { id: string; name: string; format: string } | null
  mainboard: CardWithImage[]
  sideboard: CardWithImage[]
}

type StoredCard = { name: string; qty: number; img?: string | null }
type StoredDecklist = { mainboard?: StoredCard[]; sideboard?: StoredCard[]; enriched?: boolean }

export async function getDeckWithImages(deckId: string): Promise<DeckWithImages | null> {
  const deck = await prisma.tournamentDeck.findUnique({
    where: { id: deckId },
    include: { event: { select: { id: true, name: true, format: true } } },
  })
  if (!deck) return null

  // If no decklist yet, scrape it now
  if (!deck.decklist && deck.externalUrl) {
    try {
      const parsed = await scrapeDeckList(deck.externalUrl)
      deck.decklist = parsed as unknown as typeof deck.decklist
    } catch (e) {
      console.error('[tournaments] decklist scrape failed:', e)
    }
  }

  const raw = deck.decklist as StoredDecklist | null
  let mainboard = raw?.mainboard ?? []
  let sideboard = raw?.sideboard ?? []

  // Enrich with Scryfall images exactly once, then persist — later views skip Scryfall entirely
  if (raw && !raw.enriched && (mainboard.length > 0 || sideboard.length > 0)) {
    const allNames = Array.from(new Set([...mainboard, ...sideboard].map((c) => c.name)))
    const cardMap = await getCardsByNames(allNames)

    const enrich = (c: StoredCard): StoredCard => {
      const card = cardMap.get(c.name.toLowerCase())
      return { ...c, img: card ? getCardImageUri(card) : null }
    }
    mainboard = mainboard.map(enrich)
    sideboard = sideboard.map(enrich)

    // Only mark enriched if Scryfall actually answered — otherwise retry next view
    const enriched = cardMap.size > 0
    await prisma.tournamentDeck.update({
      where: { id: deckId },
      data: { decklist: { mainboard, sideboard, enriched } as object },
    })
  }

  const toCardWithImage = (c: StoredCard): CardWithImage => ({
    name: c.name,
    qty: c.qty,
    imageUri: c.img ?? null,
  })

  return {
    id: deck.id,
    rank: deck.rank,
    archetype: deck.archetype,
    playerName: deck.playerName,
    externalUrl: deck.externalUrl,
    event: deck.event,
    mainboard: mainboard.map(toCardWithImage),
    sideboard: sideboard.map(toCardWithImage),
  }
}

export async function getMetaSnapshot(format: Format): Promise<{
  archetypes: MetaArchetypeRow[]
  fetchedAt: Date | null
  stale: boolean
  source: string
}> {
  // Prefer Goldfish when available, fall back to MTGTop8
  const preferredSource = GOLDFISH_META_FORMATS.includes(format) ? 'mtggoldfish' : 'mtgtop8'

  const snapshot = await prisma.metaSnapshot.findFirst({
    where: { format, source: preferredSource },
  }) ?? await prisma.metaSnapshot.findFirst({ where: { format } })

  const stale = !snapshot || Date.now() - snapshot.fetchedAt.getTime() > META_TTL_MS

  if (!snapshot) {
    await refreshFormat(format)
    const fresh = await prisma.metaSnapshot.findFirst({
      where: { format, source: preferredSource },
    }) ?? await prisma.metaSnapshot.findFirst({ where: { format } })
    return {
      archetypes: (fresh?.archetypes as MetaArchetypeRow[]) ?? [],
      fetchedAt: fresh?.fetchedAt ?? null,
      stale: false,
      source: fresh?.source ?? preferredSource,
    }
  }

  if (stale) void refreshFormat(format)

  return {
    archetypes: (snapshot.archetypes as MetaArchetypeRow[]) ?? [],
    fetchedAt: snapshot.fetchedAt,
    stale,
    source: snapshot.source,
  }
}
