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
  } | null
}

function entryValue(entry: CollectionEntry): number {
  const priceStr = entry.foil ? entry.price?.usdFoil : entry.price?.usd
  return priceStr ? parseFloat(priceStr) * entry.quantity : 0
}

function totalValue(entries: CollectionEntry[]): number {
  return entries.reduce((sum, e) => sum + entryValue(e), 0)
}

export function CollectionGrid({ initialEntries }: { initialEntries: CollectionEntry[] }) {
  const [entries, setEntries] = useState<CollectionEntry[]>(initialEntries)
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const sorted = [...entries].sort((a, b) => entryValue(b) - entryValue(a))
  const total = totalValue(sorted)

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

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p className="text-lg">Your collection is empty.</p>
        <Link href="/search" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          Search for cards to add →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between rounded-lg bg-blue-50 px-5 py-3">
        <span className="text-sm font-medium text-blue-700">
          {entries.length} card{entries.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xl font-bold text-blue-900">
          Total: ${total.toFixed(2)}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((entry) => {
          const price = entry.foil ? entry.price?.usdFoil : entry.price?.usd
          const busy = pending[entry.id] ?? false

          return (
            <li key={entry.id} className={`group relative ${busy ? 'opacity-60' : ''}`}>
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
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
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
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
                    <p className="truncate text-xs font-medium text-gray-900 group-hover:text-blue-600">
                      {entry.card.name}
                    </p>
                    <p className="text-xs text-gray-500">{entry.card.setCode.toUpperCase()}</p>
                  </div>
                </Link>

                <div className="flex items-center justify-between px-2 pb-2 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(entry.id, -1)}
                      disabled={busy || entry.quantity <= 1}
                      className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-xs hover:bg-gray-50 disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-medium">{entry.quantity}</span>
                    <button
                      onClick={() => updateQuantity(entry.id, 1)}
                      disabled={busy}
                      className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 text-xs hover:bg-gray-50 disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-green-700">
                      {price ? `$${(parseFloat(price) * entry.quantity).toFixed(2)}` : '—'}
                    </span>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      disabled={busy}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
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
