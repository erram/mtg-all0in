import { prisma } from '@/lib/prisma'
import { getCardById, getCardImageUri } from '@/lib/scryfall'
import type { Card, CardPrice } from '@/app/generated/prisma/client'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type CardDisplayData = {
  scryfallId: string
  name: string
  setCode: string
  imageUri: string
  oracleText: string
  prices: {
    usd: string | null
    usdFoil: string | null
    eur: string | null
    fetchedAt: Date
  }
  fromCache: boolean
}

function toDisplayData(card: Card, price: CardPrice, fromCache: boolean): CardDisplayData {
  return {
    scryfallId: card.scryfallId,
    name: card.name,
    setCode: card.setCode,
    imageUri: card.imageUri,
    oracleText: card.oracleText,
    prices: {
      usd: price.usd?.toString() ?? null,
      usdFoil: price.usdFoil?.toString() ?? null,
      eur: price.eur?.toString() ?? null,
      fetchedAt: price.fetchedAt,
    },
    fromCache,
  }
}

export async function getCachedCard(scryfallId: string): Promise<CardDisplayData | null> {
  const dbCard = await prisma.card.findUnique({
    where: { scryfallId },
    include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
  })

  const latestPrice = dbCard?.prices[0]
  if (!dbCard || !latestPrice) return null

  const isStale = Date.now() - latestPrice.fetchedAt.getTime() > CACHE_TTL_MS

  if (isStale) {
    void fetchAndStore(scryfallId)
  }

  return toDisplayData(dbCard, latestPrice, true)
}

export async function fetchAndStore(scryfallId: string): Promise<CardDisplayData> {
  const c = await getCardById(scryfallId)

  const card = await prisma.card.upsert({
    where: { scryfallId },
    update: {
      name: c.name,
      setCode: c.set,
      imageUri: getCardImageUri(c),
      oracleText: c.oracle_text ?? '',
    },
    create: {
      scryfallId: c.id,
      name: c.name,
      setCode: c.set,
      imageUri: getCardImageUri(c),
      oracleText: c.oracle_text ?? '',
    },
  })

  const price = await prisma.cardPrice.create({
    data: {
      scryfallId,
      usd: c.prices.usd ?? null,
      usdFoil: c.prices.usd_foil ?? null,
      eur: c.prices.eur ?? null,
    },
  })

  return toDisplayData(card, price, false)
}

export async function getCardWithPrices(scryfallId: string): Promise<CardDisplayData> {
  const cached = await getCachedCard(scryfallId)
  if (cached) return cached
  return fetchAndStore(scryfallId)
}
