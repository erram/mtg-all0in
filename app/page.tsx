import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

// ISR: serve instantly from static cache, refresh listings at most every 60s
export const revalidate = 60

const CONDITIONS: Record<string, string> = {
  NM: 'Near Mint',
  LP: 'Light Play',
  MP: 'Moderate Play',
  HP: 'Heavy Play',
  DMG: 'Damaged',
}

async function getLatestListings() {
  try {
    return await prisma.listing.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        card: true,
        user: { select: { email: true } },
      },
    })
  } catch {
    // DB may be unreachable during build-time prerender; ISR refreshes at runtime
    return []
  }
}

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const FEATURES = [
  {
    title: 'Real-time prices',
    body: 'USD and EUR prices refreshed daily from Scryfall, sourced from TCGPlayer and Cardmarket.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 17l5-5 4 4 8-8" />
        <path d="M14 8h6v6" />
      </svg>
    ),
  },
  {
    title: 'Personal collection',
    body: 'Add cards with quantity and foil tracking. See total value at a glance.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="6" width="13" height="16" rx="2" transform="rotate(-8 3 6)" />
        <rect x="8" y="4" width="13" height="16" rx="2" transform="rotate(4 8 4)" />
      </svg>
    ),
  },
  {
    title: 'Tournament insights',
    body: 'Recent events, metagame breakdowns, deck analysis, and matchup win-rate predictions.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" />
        <path d="M7 6H4a1 1 0 00-1 1c0 2 1.5 3.5 4 3.5M17 6h3a1 1 0 011 1c0 2-1.5 3.5-4 3.5" />
      </svg>
    ),
  },
]

export default async function HomePage() {
  const listings = await getLatestListings()

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      {/* Hero */}
      <div className="animate-fade-up text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3.5 py-1 text-xs font-medium text-accent-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-500" />
          </span>
          Prices &amp; tournament data refreshed daily
        </span>

        <h1 className="text-balance text-4xl font-bold tracking-tight text-sand-900 sm:text-6xl">
          Your MTG collection,
          <br />
          <span className="text-gradient">always up to date</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-sand-600">
          Search thousands of Magic: The Gathering cards, view real-time pricing,
          track your collection, and study the competitive metagame.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/search" className="btn-primary w-full px-7 py-3 text-base sm:w-auto">
            Search cards
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link href="/collection" className="btn-secondary w-full px-7 py-3 text-base sm:w-auto">
            My collection
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="stagger mt-20 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {FEATURES.map(({ title, body, icon }) => (
          <div key={title} className="surface-hover group p-6">
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-all duration-300 ease-out-expo group-hover:scale-110 group-hover:bg-accent-500 group-hover:text-white">
              {icon}
            </span>
            <h2 className="font-semibold text-sand-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-sand-600">{body}</p>
          </div>
        ))}
      </div>

      {/* Latest listings */}
      <div className="mt-20">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-bold text-sand-900">Latest listings</h2>
          {listings.length > 0 && (
            <span className="text-xs text-sand-400">{listings.length} active</span>
          )}
        </div>

        {listings.length === 0 ? (
          <div className="surface px-6 py-14 text-center text-sand-400">
            <p>No cards for sale yet.</p>
            <p className="mt-1 text-sm">
              View a card and click <span className="font-medium text-sand-600">List for Sale</span> to be the first.
            </p>
          </div>
        ) : (
          <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
            {listings.map((listing) => {
              const symbol = listing.currency === 'EUR' ? '€' : '$'
              const sellerHandle = listing.user.email.split('@')[0]

              return (
                <li key={listing.id}>
                  <Link
                    href={`/cards/${listing.scryfallId}`}
                    className="surface-hover flex gap-4 p-3"
                  >
                    <div className={`relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-sand-100 ${listing.foil ? 'foil-shine' : ''}`}>
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

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <p className="truncate font-semibold text-sand-900">{listing.card.name}</p>
                        <p className="text-xs text-sand-500">{listing.card.setCode.toUpperCase()}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-sand-100 px-1.5 py-0.5 text-sand-600">
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
