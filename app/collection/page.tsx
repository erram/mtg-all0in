import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CollectionGrid } from '@/components/CollectionGrid'
import type { CollectionEntry } from '@/components/CollectionGrid'

async function getCollection(userId: string): Promise<CollectionEntry[]> {
  const entries = await prisma.collectionEntry.findMany({
    where: { userId },
    include: {
      card: {
        include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
      },
    },
  })

  return entries.map((e) => ({
    id: e.id,
    scryfallId: e.scryfallId,
    quantity: e.quantity,
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
        }
      : null,
  }))
}

export default async function CollectionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const entries = await getCollection(session.user.id)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Collection</h1>
        <Link
          href="/search"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Cards
        </Link>
      </div>

      <CollectionGrid initialEntries={entries} />
    </main>
  )
}
