import type { ScryfallCard } from '@/lib/scryfall'
import { CardGridItem } from './CardGridItem'

export function CardGrid({ cards }: { cards: ScryfallCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <li key={card.id}>
          <CardGridItem card={card} />
        </li>
      ))}
    </ul>
  )
}
