import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getBuildableDecks } from '@/lib/builder'
import { FORMATS, FORMAT_LABELS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

interface PageProps {
  searchParams: { format?: string }
}

function CoverageBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? 'bg-green-400' : pct >= 60 ? 'bg-accent-400' : 'bg-sand-400'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-sand-100">
      <div className={`h-full animate-bar-grow rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function BuilderPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const format: Format = (FORMATS.includes(searchParams.format as Format)
    ? searchParams.format
    : 'modern') as Format

  const decks = await getBuildableDecks(session.user.id, format)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-sand-900">What can I build?</h1>
        <p className="mt-1 text-sm text-sand-500">
          Recent tournament decks ranked by how much of each you already own. Basic lands count as owned.
        </p>
      </div>

      {/* Format tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <Link
            key={f}
            href={`/builder?format=${f}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              f === format
                ? 'bg-accent-500 text-white'
                : 'border border-sand-300 text-sand-600 hover:border-accent-300 hover:text-accent-600'
            }`}
          >
            {FORMAT_LABELS[f]}
          </Link>
        ))}
      </div>

      {decks.length === 0 ? (
        <div className="surface px-6 py-14 text-center">
          <p className="text-sand-500">No analyzable decks for {FORMAT_LABELS[format]} yet.</p>
          <p className="mt-1 text-sm text-sand-400">
            Decklists are collected as you browse{' '}
            <Link href={`/tournaments?format=${format}`} className="text-accent-600 hover:underline">
              tournament results
            </Link>
            {' '}— open a few decklists and they&rsquo;ll appear here.
          </p>
        </div>
      ) : (
        <div className="stagger space-y-2">
          {decks.map((d) => (
            <Link
              key={d.deckId}
              href={`/builder/${d.deckId}`}
              className="surface-hover flex items-center gap-4 px-4 py-3"
            >
              <div className="w-16 shrink-0 text-center">
                <p className={`text-xl font-bold ${d.coverage >= 85 ? 'text-green-600' : d.coverage >= 60 ? 'text-accent-600' : 'text-sand-500'}`}>
                  {d.coverage}%
                </p>
                <p className="text-[10px] text-sand-400">owned</p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sand-900">{d.archetype ?? 'Unknown'}</p>
                <p className="truncate text-xs text-sand-500">
                  {d.rank != null && <span className="font-medium">#{d.rank}</span>}
                  {' · '}{d.eventName}
                  {' · '}{new Date(d.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
                <div className="mt-1.5"><CoverageBar pct={d.coverage} /></div>
              </div>

              <div className="shrink-0 text-right text-xs text-sand-500">
                <p className="font-semibold text-sand-700">{d.ownedCards}/{d.totalCards}</p>
                <p>{d.missingUnique} card{d.missingUnique !== 1 ? 's' : ''} to buy</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
