import Link from 'next/link'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getDeckCompletion } from '@/lib/builder'
import { FORMAT_LABELS } from '@/lib/tournaments/types'
import { AddMissingToWants, BudgetOptimizer } from '@/components/BuilderDeckTools'
import type { Format } from '@/lib/tournaments/types'

interface PageProps {
  params: { deckId: string }
}

export default async function BuilderDeckPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const completion = await getDeckCompletion(session.user.id, params.deckId)
  if (!completion) notFound()

  const formatLabel = FORMAT_LABELS[completion.format as Format] ?? completion.format
  const complete = completion.missing.length === 0

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-sm text-sand-400">
        <Link href="/builder" className="hover:text-accent-600">Builder</Link>
        <span>/</span>
        <span className="text-sand-700">{completion.archetype ?? 'Deck'}</span>
      </div>

      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-sand-900">
              {completion.archetype ?? 'Decklist'}
            </h1>
            <p className="mt-1 text-sm text-sand-500">
              {completion.eventName} · {formatLabel} ·{' '}
              <Link href={`/tournaments/${completion.eventId}/${completion.deckId}`} className="text-accent-600 hover:underline">
                view full decklist →
              </Link>
            </p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-bold ${completion.coverage >= 85 ? 'text-green-600' : 'text-accent-600'}`}>
              {completion.coverage}%
            </p>
            <p className="text-xs text-sand-400">{completion.ownedCards}/{completion.totalCards} cards owned</p>
          </div>
        </div>
      </div>

      {complete ? (
        <div className="surface animate-scale-in border-green-200 bg-green-50 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-green-700">You can build this deck right now 🎉</p>
          <p className="mt-1 text-sm text-green-600">Every card is already in your collection.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Missing cards — 2/3 */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-sand-700">
                Missing cards
                <span className="ml-2 font-normal text-sand-400">
                  est. ${completion.missingCostUsd.toFixed(2)}
                  {completion.unpricedCount > 0 && ` + ${completion.unpricedCount} unpriced`}
                </span>
              </h2>
              <AddMissingToWants missing={completion.missing} />
            </div>

            <div className="surface overflow-hidden">
              <ul className="divide-y divide-sand-100">
                {completion.missing.map((m) => (
                  <li key={m.name} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand-50">
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-sand-100">
                      {m.img && (
                        <Image src={m.img} alt={m.name} fill sizes="36px" className="object-cover object-top" unoptimized />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-sand-900">{m.name}</p>
                      <p className="text-xs text-sand-400">
                        need {m.needed} · own {m.owned} ·{' '}
                        <span className="font-medium text-accent-600">buy {m.missing}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      {m.priceUsd != null ? (
                        <>
                          <p className="font-semibold text-sand-900">${(m.priceUsd * m.missing).toFixed(2)}</p>
                          {m.missing > 1 && (
                            <p className="text-[10px] text-sand-400">${m.priceUsd.toFixed(2)} each</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-sand-400">no price</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Budget optimizer — 1/3 */}
          <div className="space-y-4">
            <BudgetOptimizer deckId={completion.deckId} />
            <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 text-xs text-sand-500">
              <p className="font-medium text-sand-700 mb-1">Tip</p>
              <p>
                Adding missing cards to your want list means you&rsquo;ll see them on the{' '}
                <Link href="/wants" className="text-accent-600 hover:underline">Wants page</Link>{' '}
                whenever another player lists one for sale.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
