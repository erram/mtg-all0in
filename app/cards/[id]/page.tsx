import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ScryfallApiError } from '@/lib/scryfall'
import { getCardWithPrices } from '@/lib/price-cache'
import type { CardDisplayData, PricePoint } from '@/lib/price-cache'
import { AddToCollectionForm } from '@/components/AddToCollectionForm'
import { ListForSaleForm } from '@/components/ListForSaleForm'

interface CardDetailPageProps {
  params: { id: string }
}

// --- helpers ----------------------------------------------------------------

function priceStats(values: number[]) {
  if (values.length === 0) return null
  const low = Math.min(...values)
  const high = Math.max(...values)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return { low, avg, high }
}

function priceTrend(values: number[]) {
  if (values.length < 2) return null
  const first = values[0]
  const last = values[values.length - 1]
  const pct = ((last - first) / first) * 100
  const dir = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat'
  return { pct, dir } as const
}

// --- sub-components ---------------------------------------------------------

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const W = 96, H = 32
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 0.01
  const points = data
    .map((v, i) => {
      const x = ((i / (data.length - 1)) * W).toFixed(1)
      const y = (H - 2 - ((v - min) / range) * (H - 4)).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TrendBadge({ trend }: { trend: ReturnType<typeof priceTrend> }) {
  if (!trend) return <span className="text-xs text-sand-400">Not enough data</span>
  const { pct, dir } = trend
  const cfg = {
    up: { arrow: '↑', cls: 'text-green-600' },
    down: { arrow: '↓', cls: 'text-red-600' },
    flat: { arrow: '→', cls: 'text-sand-500' },
  }[dir]
  return (
    <span className={`text-xs font-medium ${cfg.cls}`}>
      {cfg.arrow} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function StatsRow({ stats, symbol }: { stats: ReturnType<typeof priceStats>; symbol: string }) {
  if (!stats) return <p className="text-xs text-sand-400">No history yet</p>
  return (
    <div className="flex gap-3 text-xs text-sand-600">
      <span>Low <strong className="text-sand-800">{symbol}{stats.low.toFixed(2)}</strong></span>
      <span>Avg <strong className="text-sand-800">{symbol}{stats.avg.toFixed(2)}</strong></span>
      <span>High <strong className="text-sand-800">{symbol}{stats.high.toFixed(2)}</strong></span>
    </div>
  )
}

type PanelProps = {
  label: string
  source: string
  symbol: string
  regular: string | null
  foil: string | null
  history: (number | null)[]
  trendColor: { up: string; down: string; flat: string }
}

function PricePanel({ label, source, symbol, regular, foil, history, trendColor }: PanelProps) {
  const valid = history.filter((v): v is number => v !== null)
  const trend = priceTrend(valid)
  const stats = priceStats(valid)
  const sparkColor =
    trend?.dir === 'up' ? trendColor.up : trend?.dir === 'down' ? trendColor.down : trendColor.flat

  return (
    <div className="flex-1 rounded-lg border border-sand-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-sand-900">{label}</span>
          <span className="ml-2 rounded bg-sand-100 px-1.5 py-0.5 text-xs text-sand-500">{source}</span>
        </div>
        <TrendBadge trend={trend} />
      </div>

      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-sand-900">
            {regular ? `${symbol}${regular}` : <span className="text-sand-400 text-base">N/A</span>}
          </p>
          {foil && (
            <p className="text-xs text-sand-500">
              Foil: <span className="font-medium text-gray-700">{symbol}{foil}</span>
            </p>
          )}
        </div>
        <Sparkline data={valid} color={sparkColor} />
      </div>

      <StatsRow stats={stats} symbol={symbol} />
    </div>
  )
}

// --- page -------------------------------------------------------------------

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const [cardResult, session] = await Promise.all([
    getCardWithPrices(params.id).catch((err) => {
      if (err instanceof ScryfallApiError && err.status === 404) notFound()
      throw err
    }),
    getServerSession(authOptions),
  ])
  const data: CardDisplayData = cardResult

  const usdHistory = data.priceHistory.map((p: PricePoint) => p.usd)
  const eurHistory = data.priceHistory.map((p: PricePoint) => p.eur)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 text-sm text-sand-500">
        <Link href="/search" className="hover:text-accent-500">← Back to search</Link>
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
            <div className="flex h-[420px] w-[300px] items-center justify-center rounded-xl bg-sand-100 text-sand-400">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-sand-900">{data.name}</h1>
            <p className="mt-1 text-sm text-sand-500">{data.setCode.toUpperCase()}</p>
          </div>

          {data.oracleText && (
            <div className="rounded-lg border border-sand-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-sand-500">
                Oracle Text
              </h2>
              <p className="whitespace-pre-wrap text-sm text-sand-800">{data.oracleText}</p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-sand-500">Prices</h2>
              {data.fromCache && (
                <span className="text-xs text-sand-400">
                  updated {new Date(data.prices.fetchedAt).toLocaleDateString()}
                  {data.priceHistory.length > 1 && ` · ${data.priceHistory.length} data points`}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PricePanel
                label="USD"
                source="TCGPlayer"
                symbol="$"
                regular={data.prices.usd}
                foil={data.prices.usdFoil}
                history={usdHistory}
                trendColor={{ up: '#16a34a', down: '#dc2626', flat: '#6b7280' }}
              />
              <PricePanel
                label="EUR"
                source="Cardmarket"
                symbol="€"
                regular={data.prices.eur}
                foil={data.prices.eurFoil}
                history={eurHistory}
                trendColor={{ up: '#16a34a', down: '#dc2626', flat: '#6b7280' }}
              />
            </div>
          </div>

          <AddToCollectionForm scryfallId={data.scryfallId} />
          {session && <ListForSaleForm scryfallId={data.scryfallId} />}
        </div>
      </div>
    </main>
  )
}
