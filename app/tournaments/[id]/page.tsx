import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getEventById, getArchetypeArt } from '@/lib/tournaments/cache'
import { FORMAT_LABELS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

interface PageProps {
  params: { id: string }
}

function RankBadge({ rank }: { rank: number | null }) {
  if (!rank) return null
  const style =
    rank === 1 ? 'bg-yellow-400/90 text-yellow-900 ring-1 ring-yellow-300'
    : rank === 2 ? 'bg-white/80 text-gray-700 ring-1 ring-gray-300'
    : rank === 3 ? 'bg-orange-400/90 text-orange-900 ring-1 ring-orange-300'
    : 'bg-black/40 text-white'
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold backdrop-blur-sm ${style}`}>
      {rank}
    </span>
  )
}

export default async function EventPage({ params }: PageProps) {
  const { event, stale } = await getEventById(params.id)
  if (!event) notFound()

  // Art crops are cached 24h per event — only the first view hits Scryfall
  const names = Array.from(new Set(event.decks.map((d) => d.archetype).filter(Boolean) as string[]))
  const artMap = await getArchetypeArt(event.id, names)

  const formatLabel = FORMAT_LABELS[event.format as Format] ?? event.format

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/tournaments?format=${event.format}`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-sand-500 hover:text-accent-600"
        >
          ← {formatLabel} Events
        </Link>
        <h1 className="text-2xl font-bold text-sand-900">{event.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-sand-500">
          <span>
            {new Date(event.date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </span>
          {event.location && <span>{event.location}</span>}
          {event.playerCount != null && <span>{event.playerCount} players</span>}
          <span className="rounded bg-sand-100 px-2 py-0.5 text-xs font-medium text-sand-600">
            {formatLabel}
          </span>
        </div>
        {stale && (
          <p className="mt-2 text-xs text-sand-400">Showing cached data — refreshing in background.</p>
        )}
      </div>

      {event.decks.length === 0 ? (
        <div className="rounded-lg border border-sand-200 bg-sand-50 py-16 text-center">
          <p className="text-sand-500">Deck data not available for this event.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {event.decks.map((deck) => {
            const art = deck.archetype ? artMap[deck.archetype.toLowerCase()] ?? null : null

            return (
              <Link
                key={deck.id}
                href={`/tournaments/${event.id}/${deck.id}`}
                className="group relative overflow-hidden rounded-lg border border-sand-200 transition-all hover:shadow-lg"
                style={{ minHeight: 160 }}
              >
                {/* Art background */}
                {art ? (
                  <>
                    <Image
                      src={art}
                      alt={deck.archetype ?? ''}
                      fill
                      unoptimized
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* gradient darkens bottom for text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/75" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-white" />
                )}

                {/* Content */}
                <div className="relative z-10 flex h-full flex-col justify-between p-3" style={{ minHeight: 160 }}>
                  <div className="flex items-start justify-between">
                    <RankBadge rank={deck.rank} />
                  </div>

                  <div>
                    <p className={`font-semibold leading-tight ${art ? 'text-white drop-shadow' : 'text-sand-900'}`}>
                      {deck.archetype ?? 'Unknown'}
                    </p>
                    {deck.playerName && (
                      <p className={`mt-0.5 text-xs ${art ? 'text-white/80 drop-shadow' : 'text-sand-500'}`}>
                        {deck.playerName}
                      </p>
                    )}
                    <span className={`mt-1 inline-block text-xs ${art ? 'text-white/70' : 'text-accent-600'}`}>
                      View decklist →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
