import { prisma } from '@/lib/prisma'
import { getCardById, getCardImageUri } from '@/lib/scryfall'
import type { Card, CardPrice } from '@/app/generated/prisma/client'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type PricePoint = {
  date: Date
  usd: number | null
  eur: number | null
}

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
    eurFoil: string | null
    fetchedAt: Date
  }
  priceHistory: PricePoint[]
  fromCache: boolean
}

function toNum(d: { toString(): string } | null | undefined): number | null {
  return d ? parseFloat(d.toString()) : null
}

function toDisplayData(card: Card, allPrices: CardPrice[], fromCache: boolean): CardDisplayData {
  const latest = allPrices[0]
  const chronological = [...allPrices].reverse()
  return {
    scryfallId: card.scryfallId,
    name: card.name,
    setCode: card.setCode,
    imageUri: card.imageUri,
    oracleText: card.oracleText,
    prices: {
      usd: latest.usd?.toString() ?? null,
      usdFoil: latest.usdFoil?.toString() ?? null,
      eur: latest.eur?.toString() ?? null,
      eurFoil: latest.eurFoil?.toString() ?? null,
      fetchedAt: latest.fetchedAt,
    },
    priceHistory: chronological.map((p) => ({
      date: p.fetchedAt,
      usd: toNum(p.usd),
      eur: toNum(p.eur),
    })),
    fromCache,
  }
}

export async function getCachedCard(scryfallId: string): Promise<CardDisplayData | null> {
  const dbCard = await prisma.card.findUnique({
    where: { scryfallId },
    include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 30 } },
  })

  if (!dbCard || dbCard.prices.length === 0) return null

  const isStale = Date.now() - dbCard.prices[0].fetchedAt.getTime() > CACHE_TTL_MS
  if (isStale) void fetchAndStore(scryfallId)

  return toDisplayData(dbCard, dbCard.prices, true)
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

  await prisma.cardPrice.create({
    data: {
      scryfallId,
      usd: c.prices.usd ?? null,
      usdFoil: c.prices.usd_foil ?? null,
      eur: c.prices.eur ?? null,
      eurFoil: c.prices.eur_foil ?? null,
    },
  })

  const prices = await prisma.cardPrice.findMany({
    where: { scryfallId },
    orderBy: { fetchedAt: 'desc' },
    take: 30,
  })

  return toDisplayData(card, prices, false)
}

export async function getCardWithPrices(scryfallId: string): Promise<CardDisplayData> {
  const cached = await getCachedCard(scryfallId)
  if (cached) return cached
  return fetchAndStore(scryfallId)
}
