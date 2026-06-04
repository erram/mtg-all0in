'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useCallback } from 'react'

export type CollectionEntry = {
  id: string
  scryfallId: string
  quantity: number
  foil: boolean
  card: {
    scryfallId: string
    name: string
    setCode: string
    imageUri: string
  }
  price: {
    usd: string | null
    usdFoil: string | null
    eur: string | null
    eurFoil: string | null
  } | null
  listing?: {
    id: string
    price: string
    currency: string
  }
}

type Currency = 'USD' | 'EUR'

const CURRENCY_CONFIG: Record<Currency, { symbol: string; regular: keyof NonNullable<CollectionEntry['price']>; foil: keyof NonNullable<CollectionEntry['price']> }> = {
  USD: { symbol: '$', regular: 'usd', foil: 'usdFoil' },
  EUR: { symbol: '€', regular: 'eur', foil: 'eurFoil' },
}

function entryValue(entry: CollectionEntry, currency: Currency): number {
  const cfg = CURRENCY_CONFIG[currency]
  const priceStr = entry.foil ? entry.price?.[cfg.foil] : entry.price?.[cfg.regular]
  return priceStr ? parseFloat(priceStr as string) * entry.quantity : 0
}

function totalValue(entries: CollectionEntry[], currency: Currency): number {
  return entries.reduce((sum, e) => sum + entryValue(e, currency), 0)
}

export function CollectionGrid({ initialEntries }: { initialEntries: CollectionEntry[] }) {
  const [entries, setEntries] = useState<CollectionEntry[]>(initialEntries)
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [currency, setCurrency] = useState<Currency>('USD')

  const cfg = CURRENCY_CONFIG[currency]
  const sorted = [...entries].sort((a, b) => entryValue(b, currency) - entryValue(a, currency))
  const total = totalValue(sorted, currency)
  const totalCopies = entries.reduce((s, e) => s + e.quantity, 0)

  const updateQuantity = useCallback(async (id: string, delta: number) => {
    const entry = entries.find((e) => e.id === id)
    if (!entry) return
    const next = Math.max(1, entry.quantity + delta)
    if (next === entry.quantity) return

    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, quantity: next } : e)))
    setPending((p) => ({ ...p, [id]: true }))

    try {
      const res = await fetch(`/api/collection/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: next }),
      })
      if (!res.ok) {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, quantity: entry.quantity } : e)))
      }
    } catch {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, quantity: entry.quantity } : e)))
    } finally {
      setPending((p) => { const n = { ...p }; delete n[id]; return n })
    }
  }, [entries])

  const removeEntry = useCallback(async (id: string) => {
    const snapshot = entries
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setPending((p) => ({ ...p, [id]: true }))

    try {
      const res = await fetch(`/api/collection/${id}`, { method: 'DELETE' })
      if (!res.ok) setEntries(snapshot)
    } catch {
      setEntries(snapshot)
    } finally {
      setPending((p) => { const n = { ...p }; delete n[id]; return n })
    }
  }, [entries])

  const unlistCard = useCallback(async (entryId: string, listingId: string) => {
    const saved = entries.find((e) => e.id === entryId)?.listing
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, listing: undefined } : e))
    setPending((p) => ({ ...p, [entryId]: true }))

    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE' })
      if (!res.ok) setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, listing: saved } : e))
    } catch {
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, listing: saved } : e))
    } finally {
      setPending((p) => { const n = { ...p }; delete n[entryId]; return n })
    }
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center text-sand-400">
        <p className="text-lg">Your collection is empty.</p>
        <Link href="/search" className="mt-2 inline-block text-sm text-accent-500 hover:underline">
          Search for cards to add →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg bg-accent-50 px-5 py-3">
        <span className="text-sm font-medium text-accent-700">
          {entries.length} unique card{entries.length !== 1 ? 's' : ''}
          {totalCopies !== entries.length && (
            <span className="ml-1 font-normal text-accent-500">· {totalCopies} copies</span>
          )}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-accent-200 bg-white text-xs font-semibold overflow-hidden">
            {(['USD', 'EUR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 transition-colors ${
                  currency === c
                    ? 'bg-accent-500 text-white'
                    : 'text-accent-700 hover:bg-accent-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-xl font-bold text-accent-900">
            Total: {cfg.symbol}{total.toFixed(2)}
          </span>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((entry) => {
          const priceStr = entry.foil ? entry.price?.[cfg.foil] : entry.price?.[cfg.regular]
          const lineTotal = priceStr
            ? `${cfg.symbol}${(parseFloat(priceStr as string) * entry.quantity).toFixed(2)}`
            : '—'
          const busy = pending[entry.id] ?? false

          return (
            <li key={entry.id} className={`group relative ${busy ? 'opacity-60' : ''}`}>
              <div className="overflow-hidden rounded-lg border border-sand-200 bg-white shadow-sm">
                <Link href={`/cards/${entry.scryfallId}`} className="block">
                  <div className="relative aspect-[5/7] w-full bg-gray-100">
                    {entry.card.imageUri ? (
                      <Image
                        src={entry.card.imageUri}
                        alt={entry.card.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-sand-400">
                        No image
                      </div>
                    )}
                    {entry.foil && (
                      <span className="absolute top-1.5 right-1.5 rounded bg-yellow-400 px-1.5 py-0.5 text-xs font-bold text-yellow-900 shadow">
                        FOIL
                      </span>
                    )}
                  </div>

                  <div className="px-2 pt-2">
                    <p className="truncate text-xs font-medium text-sand-900 group-hover:text-accent-500">
                      {entry.card.name}
                    </p>
                    <p className="text-xs text-sand-500">{entry.card.setCode.toUpperCase()}</p>
                  </div>
                </Link>

                {entry.listing && (
                  <div className="mx-2 mb-1 flex items-center justify-between rounded bg-accent-50 px-2 py-1">
                    <span className="text-xs font-semibold text-accent-700">
                      {entry.listing.currency === 'EUR' ? '€' : '$'}{parseFloat(entry.listing.price).toFixed(2)} for sale
                    </span>
                    <button
                      onClick={() => unlistCard(entry.id, entry.listing!.id)}
                      disabled={busy}
                      className="ml-1 text-accent-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                      aria-label="Remove listing"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between px-2 pb-2 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(entry.id, -1)}
                      disabled={busy || entry.quantity <= 1}
                      className="flex h-5 w-5 items-center justify-center rounded border border-sand-300 text-xs hover:bg-sand-50 disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-medium">{entry.quantity}</span>
                    <button
                      onClick={() => updateQuantity(entry.id, 1)}
                      disabled={busy}
                      className="flex h-5 w-5 items-center justify-center rounded border border-sand-300 text-xs hover:bg-sand-50 disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-green-700">{lineTotal}</span>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      disabled={busy}
                      className="text-sand-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                      aria-label={`Remove ${entry.card.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
