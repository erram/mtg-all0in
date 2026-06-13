import Link from 'next/link'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWantMatches } from '@/lib/wants'
import { AddWantForm, WantRow } from '@/components/WantsClient'

export default async function WantsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [wants, matches] = await Promise.all([
    prisma.wantListEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    getWantMatches(session.user.id),
  ])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-sand-900">Want List</h1>
        <p className="mt-1 text-sm text-sand-500">
          Cards you&rsquo;re hunting for. When another player lists one within your price, it shows up here.
        </p>
      </div>

      {/* Live matches */}
      {matches.length > 0 && (
        <div className="mb-8 animate-scale-in">
          <h2 className="mb-3 text-sm font-semibold text-green-700">
            🎯 {matches.length} match{matches.length !== 1 ? 'es' : ''} available now
          </h2>
          <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
            {matches.map((m) => (
              <li key={m.listingId}>
                <Link
                  href={`/cards/${m.scryfallId}`}
                  className="surface-hover flex gap-3 border-green-200 p-3"
                >
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-sand-100">
                    {m.imageUri && (
                      <Image src={m.imageUri} alt={m.cardName} fill sizes="48px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-sand-900">{m.cardName}</p>
                    <p className="text-xs text-sand-500">
                      {m.condition}{m.foil && ' · Foil'} · by {m.seller}
                    </p>
                    {m.maxPrice != null && (
                      <p className="text-[10px] text-green-600">under your ${m.maxPrice.toFixed(2)} limit</p>
                    )}
                  </div>
                  <p className="shrink-0 text-lg font-bold text-green-600">
                    {m.currency === 'EUR' ? '€' : '$'}{m.price.toFixed(2)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add form */}
      <div className="surface mb-6 p-4">
        <AddWantForm />
      </div>

      {/* Want list */}
      {wants.length === 0 ? (
        <div className="surface px-6 py-14 text-center text-sand-400">
          <p>Your want list is empty.</p>
          <p className="mt-1 text-sm">
            Add cards above, or open a deck in the{' '}
            <Link href="/builder" className="text-accent-600 hover:underline">Builder</Link>{' '}
            and add everything you&rsquo;re missing in one click.
          </p>
        </div>
      ) : (
        <div className="surface overflow-hidden">
          <div className="border-b border-sand-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-sand-700">
              Wanted <span className="font-normal text-sand-400">({wants.length})</span>
            </h2>
          </div>
          <ul className="divide-y divide-sand-100">
            {wants.map((w) => (
              <WantRow
                key={w.id}
                want={{
                  id: w.id,
                  cardName: w.cardName,
                  maxPrice: w.maxPrice != null ? Number(w.maxPrice) : null,
                  createdAt: w.createdAt.toISOString(),
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}
