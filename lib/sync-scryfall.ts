import type { PrismaClient } from '../app/generated/prisma/client'

const BATCH_SIZE = 500

type BulkEntry = { type: string; download_uri: string; updated_at: string }
type BulkCard = {
  id: string
  name: string
  set: string
  oracle_text?: string
  image_uris?: { normal?: string }
  card_faces?: Array<{ image_uris?: { normal?: string } }>
  prices: { usd: string | null; usd_foil: string | null; eur: string | null; eur_foil: string | null }
}

export type SyncProgress =
  | { phase: 'download'; message: string }
  | { phase: 'cards' | 'prices'; current: number; total: number }
  | { phase: 'cleanup' | 'done'; message: string }

function getImageUri(card: BulkCard): string {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? ''
}

export async function syncScryfall(
  prisma: PrismaClient,
  onProgress?: (p: SyncProgress) => void,
): Promise<{ cards: number; removedPrices: number }> {
  const emit = (p: SyncProgress) => onProgress?.(p)

  emit({ phase: 'download', message: 'Fetching bulk-data manifest…' })
  const manifest = await fetch('https://api.scryfall.com/bulk-data', {
    headers: { 'User-Agent': 'MTGVault/1.0' },
  }).then((r) => r.json()) as { data: BulkEntry[] }

  const entry = manifest.data.find((e) => e.type === 'oracle_cards')
  if (!entry) throw new Error('oracle_cards not found in Scryfall bulk-data manifest')

  emit({ phase: 'download', message: `Downloading default_cards (updated ${entry.updated_at})…` })
  const res = await fetch(entry.download_uri, { headers: { 'User-Agent': 'MTGVault/1.0' } })
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)

  const cards = (await res.json()) as BulkCard[]
  emit({ phase: 'cards', current: 0, total: cards.length })

  // Upsert all Card records in parallel batches
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map((c) =>
        prisma.card.upsert({
          where: { scryfallId: c.id },
          update: { name: c.name, setCode: c.set, imageUri: getImageUri(c), oracleText: c.oracle_text ?? '' },
          create: { scryfallId: c.id, name: c.name, setCode: c.set, imageUri: getImageUri(c), oracleText: c.oracle_text ?? '' },
        })
      )
    )
    emit({ phase: 'cards', current: i + batch.length, total: cards.length })
  }

  // Insert latest CardPrice records in bulk
  emit({ phase: 'prices', current: 0, total: cards.length })
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE)
    await prisma.cardPrice.createMany({
      data: batch.map((c) => ({
        scryfallId: c.id,
        usd: c.prices.usd != null ? parseFloat(c.prices.usd) : null,
        usdFoil: c.prices.usd_foil != null ? parseFloat(c.prices.usd_foil) : null,
        eur: c.prices.eur != null ? parseFloat(c.prices.eur) : null,
        eurFoil: c.prices.eur_foil != null ? parseFloat(c.prices.eur_foil) : null,
      })),
    })
    emit({ phase: 'prices', current: i + batch.length, total: cards.length })
  }

  // Remove price history older than 30 days
  emit({ phase: 'cleanup', message: 'Removing price entries older than 30 days…' })
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const { count: removedPrices } = await prisma.cardPrice.deleteMany({
    where: { fetchedAt: { lt: cutoff } },
  })

  emit({
    phase: 'done',
    message: `Synced ${cards.length.toLocaleString()} cards. Removed ${removedPrices.toLocaleString()} stale price entries.`,
  })
  return { cards: cards.length, removedPrices }
}
