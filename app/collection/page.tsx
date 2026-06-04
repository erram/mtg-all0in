import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CollectionGrid } from '@/components/CollectionGrid'
import type { CollectionEntry } from '@/components/CollectionGrid'

async function getCollection(userId: string): Promise<CollectionEntry[]> {
  const [rows, listings] = await Promise.all([
    prisma.collectionEntry.findMany({
      where: { userId },
      include: {
        card: {
          include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
        },
      },
    }),
    prisma.listing.findMany({
      where: { userId, active: true },
      select: { id: true, scryfallId: true, price: true, currency: true },
    }),
  ])

  const listingMap = new Map(
    listings.map((l) => [l.scryfallId, { id: l.id, price: l.price.toString(), currency: l.currency }])
  )

  // Group by scryfallId+foil — multiple rows for the same card get merged
  const groupMap = new Map<string, { primary: typeof rows[0]; dupeIds: string[]; totalQty: number }>()
  for (const row of rows) {
    const key = `${row.scryfallId}:${String(row.foil)}`
    const group = groupMap.get(key)
    if (group) {
      group.dupeIds.push(row.id)
      group.totalQty += row.quantity
    } else {
      groupMap.set(key, { primary: row, dupeIds: [], totalQty: row.quantity })
    }
  }

  // Persist the merge so duplicates don't accumulate
  const mergeOps: Promise<unknown>[] = []
  for (const { primary, dupeIds, totalQty } of Array.from(groupMap.values())) {
    if (dupeIds.length > 0) {
      mergeOps.push(
        prisma.collectionEntry.update({ where: { id: primary.id }, data: { quantity: totalQty } }),
        prisma.collectionEntry.deleteMany({ where: { id: { in: dupeIds } } }),
      )
    }
  }
  if (mergeOps.length > 0) await Promise.all(mergeOps)

  return Array.from(groupMap.values()).map(({ primary: e, totalQty }) => ({
    id: e.id,
    scryfallId: e.scryfallId,
    quantity: totalQty,
    foil: e.foil,
    card: {
      scryfallId: e.card.scryfallId,
      name: e.card.name,
      setCode: e.card.setCode,
      imageUri: e.card.imageUri,
    },
    price: e.card.prices[0]
      ? {
          usd: e.card.prices[0].usd?.toString() ?? null,
          usdFoil: e.card.prices[0].usdFoil?.toString() ?? null,
          eur: e.card.prices[0].eur?.toString() ?? null,
          eurFoil: e.card.prices[0].eurFoil?.toString() ?? null,
        }
      : null,
    listing: listingMap.get(e.scryfallId),
  }))
}

export default async function CollectionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const entries = await getCollection(session.user.id)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sand-900">My Collection</h1>
        <Link
          href="/search"
          className="rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
        >
          + Add Cards
        </Link>
      </div>

      <CollectionGrid initialEntries={entries} />
    </main>
  )
}
