import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ScryfallApiError } from '@/lib/scryfall'
import { getCardWithPrices } from '@/lib/price-cache'
import type { CardDisplayData } from '@/lib/price-cache'
import { AddToCollectionForm } from '@/components/AddToCollectionForm'

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

function PriceTable({ prices, fromCache }: { prices: CardDisplayData['prices']; fromCache: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Prices</h2>
        {fromCache && (
          <span className="text-xs text-gray-400">
            cached {new Date(prices.fetchedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <table className="w-full">
        <tbody>
          <PriceRow label="USD" value={prices.usd} />
          <PriceRow label="USD Foil" value={prices.usdFoil} />
          <PriceRow label="EUR" value={prices.eur} />
        </tbody>
      </table>
    </div>
  )
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  let data: CardDisplayData

  try {
    data = await getCardWithPrices(params.id)
  } catch (err) {
    if (err instanceof ScryfallApiError && err.status === 404) {
      notFound()
    }
    throw err
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/search" className="hover:text-blue-600">
          ← Back to search
        </Link>
      </nav>

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="shrink-0">
          {data.imageUri ? (
            <Image
              src={data.imageUri}
              alt={data.name}
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

        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{data.setCode.toUpperCase()}</p>
          </div>

          {data.oracleText && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Oracle Text
              </h2>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{data.oracleText}</p>
            </div>
          )}

          <PriceTable prices={data.prices} fromCache={data.fromCache} />
          <AddToCollectionForm scryfallId={data.scryfallId} />
        </div>
      </div>
    </main>
  )
}
