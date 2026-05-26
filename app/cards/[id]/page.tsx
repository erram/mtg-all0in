import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCardById, getCardImageUri, ScryfallApiError } from '@/lib/scryfall'
import type { ScryfallCard, ScryfallPrices } from '@/lib/scryfall'

interface CardDetailPageProps {
  params: { id: string }
}

function PriceRow({ label, value }: { label: string; value: string | null }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-2 pr-4 text-sm text-gray-600">{label}</td>
      <td className="py-2 text-sm font-medium text-gray-900">
        {value ? `$${value}` : <span className="text-gray-400">—</span>}
      </td>
    </tr>
  )
}

function PriceTable({ prices }: { prices: ScryfallPrices }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Prices
      </h2>
      <table className="w-full">
        <tbody>
          <PriceRow label="USD" value={prices.usd} />
          <PriceRow label="USD Foil" value={prices.usd_foil} />
          <PriceRow label="USD Etched" value={prices.usd_etched} />
          <PriceRow label="EUR" value={prices.eur} />
          <PriceRow label="EUR Foil" value={prices.eur_foil} />
        </tbody>
      </table>
    </div>
  )
}

function OracleText({ card }: { card: ScryfallCard }) {
  const text =
    card.oracle_text ??
    card.card_faces?.map((f) => `${f.name}\n${f.oracle_text ?? ''}`).join('\n\n——\n\n')

  if (!text) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Oracle Text
      </h2>
      <p className="whitespace-pre-wrap text-sm text-gray-800">{text}</p>
    </div>
  )
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  let card: ScryfallCard

  try {
    card = await getCardById(params.id)
  } catch (err) {
    if (err instanceof ScryfallApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  const imageUri = getCardImageUri(card)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/search" className="hover:text-blue-600">
          ← Back to search
        </Link>
      </nav>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Card image */}
        <div className="shrink-0">
          {imageUri ? (
            <Image
              src={imageUri}
              alt={card.name}
              width={300}
              height={420}
              className="rounded-xl shadow-lg"
              priority
            />
          ) : (
            <div className="flex h-[420px] w-[300px] items-center justify-center rounded-xl bg-gray-100 text-gray-400">
              No image
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{card.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {card.set_name} · #{card.collector_number}
            </p>
          </div>

          <OracleText card={card} />
          <PriceTable prices={card.prices} />

          <a
            href={card.scryfall_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View on Scryfall ↗
          </a>
        </div>
      </div>
    </main>
  )
}
