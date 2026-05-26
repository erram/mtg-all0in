'use client'

import Image from 'next/image'
import Link from 'next/link'

export type CollectionEntry = {
  id: string
  scryfallId: string
  quantity: number
  foil: boolean
  card: {
    scryfallId: string
    name: string
    setCode: string
    imageUri: string
  }
  price: {
    usd: string | null
    usdFoil: string | null
  } | null
}

function entryValue(entry: CollectionEntry): number {
  const priceStr = entry.foil ? entry.price?.usdFoil : entry.price?.usd
  return priceStr ? parseFloat(priceStr) * entry.quantity : 0
}

function totalValue(entries: CollectionEntry[]): number {
  return entries.reduce((sum, e) => sum + entryValue(e), 0)
}

export function CollectionGrid({ initialEntries }: { initialEntries: CollectionEntry[] }) {
  const sorted = [...initialEntries].sort((a, b) => entryValue(b) - entryValue(a))
  const total = totalValue(sorted)

  if (sorted.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p className="text-lg">Your collection is empty.</p>
        <Link href="/search" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Search for cards to add →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between rounded-lg bg-blue-50 px-5 py-3">
        <span className="text-sm font-medium text-blue-700">
          {sorted.length} card{sorted.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xl font-bold text-blue-900">
          Total: ${total.toFixed(2)}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((entry) => {
          const price = entry.foil ? entry.price?.usdFoil : entry.price?.usd

          return (
            <li key={entry.id} className="group relative">
              <Link
                href={`/cards/${entry.scryfallId}`}
                className="block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-[5/7] w-full bg-gray-100">
                  {entry.card.imageUri ? (
                    <Image
                      src={entry.card.imageUri}
                      alt={entry.card.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                  {entry.foil && (
                    <span className="absolute top-1.5 right-1.5 rounded bg-yellow-400 px-1.5 py-0.5 text-xs font-bold text-yellow-900 shadow">
                      FOIL
                    </span>
                  )}
                </div>

                <div className="p-2 space-y-0.5">
                  <p className="truncate text-xs font-medium text-gray-900 group-hover:text-blue-600">
                    {entry.card.name}
                  </p>
                  <p className="text-xs text-gray-500">{entry.card.setCode.toUpperCase()}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-600">×{entry.quantity}</span>
                    <span className="text-xs font-semibold text-green-700">
                      {price ? `$${(parseFloat(price) * entry.quantity).toFixed(2)}` : '—'}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
