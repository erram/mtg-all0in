import Image from 'next/image'
import Link from 'next/link'
import { getCardImageUri } from '@/lib/scryfall'
import type { ScryfallCard } from '@/lib/scryfall'

export function CardGrid({ cards }: { cards: ScryfallCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <li key={card.id}>
          <Link
            href={`/cards/${card.id}`}
            className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-[5/7] w-full bg-gray-100">
              {getCardImageUri(card) ? (
                <Image
                  src={getCardImageUri(card)}
                  alt={card.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                  No image
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium text-gray-900 group-hover:text-blue-600">
                {card.name}
              </p>
              <p className="text-xs text-gray-500">{card.set.toUpperCase()}</p>
              {card.prices.usd && (
                <p className="mt-1 text-xs font-semibold text-green-700">${card.prices.usd}</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
