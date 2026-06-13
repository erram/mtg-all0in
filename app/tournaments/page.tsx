import { Suspense } from 'react'
import Link from 'next/link'
import { getEventsByFormat, getMetaSnapshot } from '@/lib/tournaments/cache'
import { FORMAT_LABELS, FORMATS } from '@/lib/tournaments/types'
import { FormatTabs } from '@/components/FormatTabs'
import { VenueFilter } from '@/components/VenueFilter'
import type { Format } from '@/lib/tournaments/types'
import type { Venue } from '@/components/VenueFilter'

interface PageProps {
  searchParams: { format?: string; venue?: string; page?: string }
}

function ColorPips({ colors }: { colors?: string | null }) {
  if (!colors) return null
  const map: Record<string, string> = {
    W: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    U: 'bg-blue-100 border-blue-300 text-blue-700',
    B: 'bg-gray-800 border-gray-600 text-gray-100',
    R: 'bg-red-100 border-red-300 text-red-700',
    G: 'bg-green-100 border-green-300 text-green-700',
  }
  return (
    <span className="flex gap-0.5">
      {colors.split('').map((c, i) => (
        <span
          key={i}
          className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold ${map[c] ?? 'bg-sand-100 border-sand-300 text-sand-600'}`}
        >
          {c}
        </span>
      ))}
    </span>
  )
}

async function MetaSidebar({ format }: { format: Format }) {
  const { archetypes, fetchedAt, source } = await getMetaSnapshot(format)
  const sourceLabel = source === 'mtggoldfish' ? 'MTGGoldfish' : 'MTGTop8'

  if (archetypes.length === 0) {
    return (
      <div className="rounded-lg border border-sand-200 bg-sand-50 p-4">
        <p className="text-sm text-sand-500">Meta data not available for this format.</p>
      </div>
    )
  }

  return (
    <div className="surface animate-fade-up overflow-hidden">
      <div className="flex items-center justify-between border-b border-sand-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-sand-900">Meta Breakdown</h2>
        <span className="text-xs text-sand-400">via {sourceLabel}</span>
      </div>
      <ul className="divide-y divide-sand-100">
        {archetypes.map((a, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand-50">
            <span className="w-8 text-right text-xs font-medium tabular-nums text-sand-500">
              {a.share.toFixed(1)}%
            </span>
            <div
              className="h-1.5 animate-bar-grow rounded-full bg-gradient-to-r from-accent-400 to-accent-500"
              style={{
                width: `${Math.min(100, (a.share / archetypes[0].share) * 100)}%`,
                minWidth: 4,
                animationDelay: `${i * 40}ms`,
              }}
            />
            <span className="flex-1 truncate text-sm text-sand-800">
              {a.sampleDeckUrl ? (
                <a
                  href={a.sampleDeckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent-600 hover:underline"
                >
                  {a.name}
                </a>
              ) : (
                a.name
              )}
            </span>
            <ColorPips colors={a.colors} />
          </li>
        ))}
      </ul>
      {fetchedAt && (
        <p className="border-t border-sand-100 px-4 py-2 text-right text-xs text-sand-400">
          Updated {fetchedAt.toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function isOnlineEvent(name: string, location: string | null): boolean {
  return /\bMTGO\b/i.test(name) || (!location && /\b(league|challenge|qualifier)\b/i.test(name))
}

async function EventList({ format, venue, page }: { format: Format; venue: Venue; page: number }) {
  const { events, total, totalPages, stale } = await getEventsByFormat(format, page, venue)

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-sand-200 bg-sand-50 py-16 text-center">
        <p className="text-sand-500">No events found for {FORMAT_LABELS[format]}.</p>
        <p className="mt-1 text-sm text-sand-400">Data is fetched from MTG Top 8 — try again shortly.</p>
      </div>
    )
  }

  function pageHref(p: number) {
    const params = new URLSearchParams()
    params.set('format', format)
    if (venue !== 'both') params.set('venue', venue)
    if (p > 1) params.set('page', String(p))
    return `/tournaments?${params.toString()}`
  }

  return (
    <div className="space-y-2">
      {stale && (
        <p className="text-xs text-sand-400">Showing cached data — refreshing in background.</p>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-sand-200 bg-sand-50 py-10 text-center">
          <p className="text-sand-500">No {venue !== 'both' ? venue : ''} events found.</p>
        </div>
      ) : (
        <div className="stagger space-y-2">
          {events.map((ev) => {
            const online = isOnlineEvent(ev.name, ev.location)
            return (
              <Link
                key={ev.id}
                href={`/tournaments/${ev.id}`}
                className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-card transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:shadow-card-hover ${
                  online
                    ? 'border-blue-200 hover:border-blue-300'
                    : 'border-sand-200 hover:border-accent-300'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      online ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {online ? 'Online' : 'Paper'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-sand-900">{ev.name}</p>
                    {ev.location && (
                      <p className="truncate text-xs text-sand-500">{ev.location}</p>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-xs text-sand-500">
                    {new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {ev.playerCount != null && (
                    <span className="text-xs text-sand-400">{ev.playerCount} players</span>
                  )}
                </div>
              </Link>
            )
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-sand-400">
                {total} events · page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="rounded-md border border-sand-300 px-3 py-1.5 text-xs text-sand-600 hover:border-accent-300 hover:text-accent-600 transition-colors"
                  >
                    ← Prev
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={pageHref(p)}
                    className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                      p === page
                        ? 'bg-accent-500 text-white'
                        : 'border border-sand-300 text-sand-600 hover:border-accent-300 hover:text-accent-600'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
                {page < totalPages && (
                  <Link
                    href={pageHref(page + 1)}
                    className="rounded-md border border-sand-300 px-3 py-1.5 text-xs text-sand-600 hover:border-accent-300 hover:text-accent-600 transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TournamentsPage({ searchParams }: PageProps) {
  const format: Format = (FORMATS.includes(searchParams.format as Format)
    ? searchParams.format
    : 'modern') as Format

  const venue: Venue = (['paper', 'online', 'both'].includes(searchParams.venue ?? '')
    ? searchParams.venue
    : 'both') as Venue

  const page = Math.max(1, parseInt(searchParams.page ?? '1') || 1)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 animate-fade-up text-2xl font-bold tracking-tight text-sand-900">
        Tournament Statistics
      </h1>

      <FormatTabs current={format} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Event list — 2/3 width */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-sand-700">Recent Events</h2>
            <VenueFilter current={venue} />
          </div>
          <Suspense
            key={`events-${format}-${venue}-${page}`}
            fallback={
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-14 skeleton" />
                ))}
              </div>
            }
          >
            <EventList format={format} venue={venue} page={page} />
          </Suspense>
        </div>

        {/* Meta sidebar — 1/3 width */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-sand-700">Format Meta</h2>
          <Suspense
            key={`meta-${format}`}
            fallback={
              <div className="space-y-1.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-8 skeleton rounded" />
                ))}
              </div>
            }
          >
            <MetaSidebar format={format} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
