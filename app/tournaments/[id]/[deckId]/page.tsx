import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getDeckWithImages } from '@/lib/tournaments/cache'
import type { CardWithImage } from '@/lib/tournaments/cache'

interface PageProps {
  params: { id: string; deckId: string }
}

const PLACEHOLDER = 'https://cards.scryfall.io/normal/back/0/0/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg'

function CardStack({ card }: { card: CardWithImage }) {
  const multi = card.qty > 1

  return (
    <div className="group relative flex flex-col items-center gap-1">
      {/* Stack layers for multiples */}
      <div className="relative" style={{ width: 130, height: 181 }}>
        {multi && card.qty >= 3 && (
          <div
            className="absolute rounded-lg border border-sand-300 bg-sand-200"
            style={{ width: 130, height: 181, top: -4, left: 4, zIndex: 0 }}
          />
        )}
        {multi && (
          <div
            className="absolute rounded-lg border border-sand-300 bg-sand-300"
            style={{ width: 130, height: 181, top: -2, left: 2, zIndex: 1 }}
          />
        )}
        <div className="relative rounded-lg overflow-hidden shadow-md transition-transform group-hover:-translate-y-1 group-hover:shadow-xl" style={{ zIndex: 2 }}>
          <Image
            src={card.imageUri ?? PLACEHOLDER}
            alt={card.name}
            width={130}
            height={181}
            className="block"
            unoptimized
          />
        </div>

        {/* Quantity badge */}
        {card.qty > 1 && (
          <span className="absolute bottom-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white shadow-md ring-2 ring-white">
            {card.qty}
          </span>
        )}
      </div>

      <span className="max-w-[130px] truncate text-center text-xs text-sand-700">{card.name}</span>
    </div>
  )
}

function CardSection({ title, cards }: { title: string; cards: CardWithImage[] }) {
  if (cards.length === 0) return null
  const total = cards.reduce((s, c) => s + c.qty, 0)

  return (
    <section className="mb-8">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-sand-500">
        {title} <span className="text-sand-400">({total})</span>
      </h3>
      <div className="flex flex-wrap gap-3">
        {cards.map((c) => (
          <CardStack key={c.name} card={c} />
        ))}
      </div>
    </section>
  )
}

export default async function DeckPage({ params }: PageProps) {
  const deck = await getDeckWithImages(params.deckId)
  if (!deck) notFound()

  const event = deck.event

  const mainTotal = deck.mainboard.reduce((s, c) => s + c.qty, 0)
  const sbTotal = deck.sideboard.reduce((s, c) => s + c.qty, 0)
  const hasDecklist = deck.mainboard.length > 0

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-sm text-sand-400">
        <Link href="/tournaments" className="hover:text-accent-600">Tournaments</Link>
        <span>/</span>
        {event && (
          <>
            <Link href={`/tournaments/${params.id}`} className="hover:text-accent-600">
              {event.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-sand-700">{deck.archetype ?? 'Deck'}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sand-900">{deck.archetype ?? 'Decklist'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-sand-500">
            {deck.playerName && <span>{deck.playerName}</span>}
            {deck.rank != null && (
              <span className="rounded bg-sand-100 px-2 py-0.5 text-xs font-medium text-sand-600">
                #{deck.rank}
              </span>
            )}
            {hasDecklist && (
              <span className="text-xs text-sand-400">
                {mainTotal} cards mainboard · {sbTotal} sideboard
              </span>
            )}
          </div>
        </div>
        {deck.externalUrl && (
          <a
            href={deck.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-sand-300 px-3 py-1.5 text-sm text-sand-600 hover:border-accent-300 hover:text-accent-600"
          >
            View on MTGTop8 →
          </a>
        )}
      </div>

      {!hasDecklist ? (
        <div className="rounded-lg border border-sand-200 bg-sand-50 py-16 text-center">
          <p className="text-sand-500">Decklist not available.</p>
        </div>
      ) : (
        <>
          <CardSection title="Mainboard" cards={deck.mainboard} />
          {deck.sideboard.length > 0 && (
            <CardSection title="Sideboard" cards={deck.sideboard} />
          )}
        </>
      )}
    </main>
  )
}
