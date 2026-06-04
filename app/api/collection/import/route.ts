import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCardByName, getCardImageUri, ScryfallApiError } from '@/lib/scryfall'

const MAX_CARDS = 75
const SCRYFALL_DELAY_MS = 200 // only applied when falling back to the API

const PRICE_MULTIPLIERS = { low: 0.85, mid: 1.0, high: 1.15 } as const
type PriceLevel = keyof typeof PRICE_MULTIPLIERS
type Market = 'USD' | 'EUR'

function resolveApiPrice(
  prices: { usd: string | null; eur: string | null },
  market: Market,
  level: PriceLevel,
): number | null {
  const base = market === 'EUR' ? prices.eur : prices.usd
  if (!base) return null
  return Math.round(parseFloat(base) * PRICE_MULTIPLIERS[level] * 100) / 100
}

function resolveDbPrice(
  price: { usd: { toString(): string } | null; eur: { toString(): string } | null },
  market: Market,
  level: PriceLevel,
): number | null {
  const base = market === 'EUR' ? price.eur : price.usd
  if (!base) return null
  return Math.round(parseFloat(base.toString()) * PRICE_MULTIPLIERS[level] * 100) / 100
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const body = await req.json() as {
    cards: { name: string; quantity: number }[]
    listForSale?: boolean
    market?: Market
    priceLevel?: PriceLevel
  }

  const cards = body.cards?.slice(0, MAX_CARDS) ?? []
  const listForSale = body.listForSale ?? false
  const market: Market = body.market ?? 'EUR'
  const priceLevel: PriceLevel = body.priceLevel ?? 'mid'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))

      const added: string[] = []
      const listed: string[] = []
      const skippedListing: string[] = []
      const failed: { name: string; reason: string }[] = []

      let lastApiCall = 0

      for (let i = 0; i < cards.length; i++) {
        const { name, quantity } = cards[i]
        send({ type: 'progress', current: i + 1, total: cards.length, card: name })

        try {
          // ── DB-first lookup (populated by bulk sync) ──────────────────────
          const dbCard = await prisma.card.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
            include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
          })

          if (dbCard) {
            // Fast path: no Scryfall API call needed
            const existing = await prisma.collectionEntry.findFirst({
              where: { userId: session.user.id, scryfallId: dbCard.scryfallId, foil: false },
            })
            if (existing) {
              await prisma.collectionEntry.update({
                where: { id: existing.id },
                data: { quantity: { increment: Math.max(1, quantity) } },
              })
            } else {
              await prisma.collectionEntry.create({
                data: { userId: session.user.id, scryfallId: dbCard.scryfallId, quantity: Math.max(1, quantity) },
              })
            }

            added.push(dbCard.name)

            if (listForSale) {
              const latestPrice = dbCard.prices[0] ?? null
              const price = latestPrice ? resolveDbPrice(latestPrice, market, priceLevel) : null
              if (price !== null) {
                await prisma.listing.create({
                  data: { userId: session.user.id, scryfallId: dbCard.scryfallId, price, currency: market, quantity: Math.max(1, quantity) },
                })
                listed.push(dbCard.name)
              } else {
                skippedListing.push(dbCard.name)
              }
            }

            send({ type: 'card_done', name: dbCard.name, status: 'added', source: 'db' })
            continue
          }

          // ── API fallback (card not yet in DB) ─────────────────────────────
          const elapsed = Date.now() - lastApiCall
          if (elapsed < SCRYFALL_DELAY_MS) {
            await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS - elapsed))
          }

          const c = await getCardByName(name)
          lastApiCall = Date.now()

          await prisma.card.upsert({
            where: { scryfallId: c.id },
            update: { name: c.name, setCode: c.set, imageUri: getCardImageUri(c), oracleText: c.oracle_text ?? '' },
            create: { scryfallId: c.id, name: c.name, setCode: c.set, imageUri: getCardImageUri(c), oracleText: c.oracle_text ?? '' },
          })

          await prisma.cardPrice.create({
            data: {
              scryfallId: c.id,
              usd: c.prices.usd ? parseFloat(c.prices.usd) : null,
              usdFoil: c.prices.usd_foil ? parseFloat(c.prices.usd_foil) : null,
              eur: c.prices.eur ? parseFloat(c.prices.eur) : null,
              eurFoil: c.prices.eur_foil ? parseFloat(c.prices.eur_foil) : null,
            },
          })

          const existingEntry = await prisma.collectionEntry.findFirst({
            where: { userId: session.user.id, scryfallId: c.id, foil: false },
          })
          if (existingEntry) {
            await prisma.collectionEntry.update({
              where: { id: existingEntry.id },
              data: { quantity: { increment: Math.max(1, quantity) } },
            })
          } else {
            await prisma.collectionEntry.create({
              data: { userId: session.user.id, scryfallId: c.id, quantity: Math.max(1, quantity) },
            })
          }

          added.push(c.name)

          if (listForSale) {
            const price = resolveApiPrice(c.prices, market, priceLevel)
            if (price !== null) {
              await prisma.listing.create({
                data: { userId: session.user.id, scryfallId: c.id, price, currency: market, quantity: Math.max(1, quantity) },
              })
              listed.push(c.name)
            } else {
              skippedListing.push(c.name)
            }
          }

          send({ type: 'card_done', name: c.name, status: 'added', source: 'api' })
        } catch (err) {
          let reason: string
          if (err instanceof ScryfallApiError) {
            reason = err.status === 404 ? 'Card not found' : `Scryfall ${err.status}: ${err.message}`
          } else if (err instanceof Error) {
            reason = err.message
          } else {
            reason = String(err)
          }
          console.error(`[import] "${name}":`, err)
          failed.push({ name, reason })
          send({ type: 'card_done', name, status: 'failed', reason })
        }
      }

      send({ type: 'done', added, listed, skippedListing, failed })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
