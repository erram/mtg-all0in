import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

const CONDITIONS: Record<string, string> = {
  NM: 'Near Mint',
  LP: 'Light Play',
  MP: 'Moderate Play',
  HP: 'Heavy Play',
  DMG: 'Damaged',
}

async function getLatestListings() {
  return prisma.listing.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      card: true,
      user: { select: { email: true } },
    },
  })
}

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default async function HomePage() {
  const listings = await getLatestListings()

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-sand-900 sm:text-5xl">
          Your MTG collection,{' '}
          <span className="text-accent-500">always up to date</span>
        </h1>
        <p className="mt-4 text-lg text-sand-600">
          Search thousands of Magic: The Gathering cards, view real-time pricing from Scryfall,
          and track every card in your collection.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/search"
            className="w-full rounded-lg bg-accent-500 px-6 py-3 text-base font-semibold text-white hover:bg-accent-600 transition-colors sm:w-auto"
          >
            Search cards
          </Link>
          <Link
            href="/collection"
            className="w-full rounded-lg border border-sand-300 bg-white px-6 py-3 text-base font-semibold text-sand-700 hover:bg-sand-100 transition-colors sm:w-auto"
          >
            My collection
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          {
            title: 'Real-time prices',
            body: 'USD and EUR prices refreshed daily from Scryfall, sourced from TCGPlayer and Cardmarket.',
          },
          {
            title: 'Personal collection',
            body: 'Add cards with quantity and foil tracking. See total value at a glance.',
          },
          {
            title: 'Marketplace',
            body: 'List cards for sale and browse what other players are offering.',
          },
        ].map(({ title, body }) => (
          <div key={title} className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-sand-900">{title}</h2>
            <p className="mt-1 text-sm text-sand-600">{body}</p>
          </div>
        ))}
      </div>

      {/* Latest listings */}
      <div className="mt-16">
        <h2 className="mb-4 text-xl font-bold text-sand-900">Latest listings</h2>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-sand-200 bg-white px-6 py-12 text-center text-sand-400">
            <p>No cards for sale yet.</p>
            <p className="mt-1 text-sm">
              View a card and click <span className="font-medium text-sand-600">List for Sale</span> to be the first.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {listings.map((listing) => {
              const symbol = listing.currency === 'EUR' ? '€' : '$'
              const sellerHandle = listing.user.email.split('@')[0]

              return (
                <li key={listing.id}>
                  <Link
                    href={`/cards/${listing.scryfallId}`}
                    className="flex gap-4 rounded-xl border border-sand-200 bg-white p-3 shadow-sm hover:border-accent-300 hover:shadow-md transition-all"
                  >
                    <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-sand-100">
                      {listing.card.imageUri && (
                        <Image
                          src={listing.card.imageUri}
                          alt={listing.card.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <p className="truncate font-semibold text-sand-900">{listing.card.name}</p>
                        <p className="text-xs text-sand-500">{listing.card.setCode.toUpperCase()}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-sand-100 px-1.5 py-0.5 text-sand-600">
                          {CONDITIONS[listing.condition] ?? listing.condition}
                        </span>
                        {listing.foil && (
                          <span className="flex items-center gap-0.5 font-medium text-purple-700">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8)' }}
                            />
                            Foil
                          </span>
                        )}
                        <span className="text-sand-400">by {sellerHandle}</span>
                        <span className="text-sand-400">{timeAgo(new Date(listing.createdAt))}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-accent-600">
                        {symbol}{Number(listing.price).toFixed(2)}
                      </p>
                      {listing.quantity > 1 && (
                        <p className="text-xs text-sand-400">×{listing.quantity}</p>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
