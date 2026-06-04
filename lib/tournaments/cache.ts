import { prisma } from '@/lib/prisma'
import { scrapeFormatPage, scrapeEventDecks, scrapeDeckList, scrapePlayerCount, type EventDeckScrapeResult } from './mtgtop8'
import { scrapeMetaSnapshot } from './mtggoldfish'
import { getCardsByNames, getCardImageUri } from '@/lib/scryfall/client'
import type { Format } from './types'

// Formats where Goldfish has dedicated metagame pages (better data than MTGTop8)
const GOLDFISH_META_FORMATS: Format[] = ['modern', 'pioneer', 'standard', 'duel-commander']

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

    // Eagerly fetch player counts for events that don't have one yet (up to 10, sequential to respect rate limits)
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
    console.error('[tournaments] format refresh failed:', e)
  }
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
  mainboard: CardWithImage[]
  sideboard: CardWithImage[]
}

export async function getDeckWithImages(deckId: string): Promise<DeckWithImages | null> {
  const deck = await prisma.tournamentDeck.findUnique({ where: { id: deckId } })
  if (!deck) return null

  // If no decklist yet, scrape it now
  if (!deck.decklist && deck.externalUrl) {
    try {
      const parsed = await scrapeDeckList(deck.externalUrl)
      await prisma.tournamentDeck.update({
        where: { id: deckId },
        data: { decklist: parsed as object },
      })
      deck.decklist = parsed as unknown as typeof deck.decklist
    } catch (e) {
      console.error('[tournaments] decklist scrape failed:', e)
    }
  }

  const raw = deck.decklist as { mainboard?: { name: string; qty: number }[]; sideboard?: { name: string; qty: number }[] } | null
  const mainboard = raw?.mainboard ?? []
  const sideboard = raw?.sideboard ?? []

  // Batch-fetch images from Scryfall
  const allNames = Array.from(new Set([...mainboard, ...sideboard].map((c) => c.name)))
  const cardMap = allNames.length > 0 ? await getCardsByNames(allNames) : new Map()

  function toCardWithImage(c: { name: string; qty: number }): CardWithImage {
    const card = cardMap.get(c.name.toLowerCase())
    return {
      name: c.name,
      qty: c.qty,
      imageUri: card ? getCardImageUri(card) : null,
    }
  }

  return {
    id: deck.id,
    rank: deck.rank,
    archetype: deck.archetype,
    playerName: deck.playerName,
    externalUrl: deck.externalUrl,
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
