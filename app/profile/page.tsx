'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type Listing = {
  id: string
  price: string
  currency: string
  condition: string
  foil: boolean
  quantity: number
  notes: string | null
  createdAt: string
  card: { name: string; setCode: string; imageUri: string; scryfallId: string }
}

const CONDITIONS: Record<string, string> = { NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DMG: 'Damaged' }

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  const fetchListings = useCallback(async () => {
    const res = await fetch('/api/listings/mine')
    if (res.ok) setListings(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchListings()
    if (status === 'unauthenticated') redirect('/login')
  }, [status, fetchListings])

  async function deleteListing(id: string) {
    setListings((prev) => prev.filter((l) => l.id !== id))
    await fetch(`/api/listings/${id}`, { method: 'DELETE' })
  }

  if (status === 'loading' || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      </main>
    )
  }

  if (!session) return null

  const handle = session.user.email!.split('@')[0]
  const publicUrl = `${window.location.origin}/seller/${session.user.id}`

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sand-900">{handle}</h1>
          <p className="mt-0.5 text-sm text-sand-500">{session.user.email}</p>
        </div>
        <Link
          href="/collection/import"
          className="rounded-md border border-sand-300 bg-white px-3 py-1.5 text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors"
        >
          Bulk import
        </Link>
      </div>

      {/* Public seller page link */}
      <div className="mb-8 rounded-xl border border-accent-200 bg-accent-50 p-4">
        <p className="text-sm font-semibold text-accent-800">Your public seller page</p>
        <p className="mt-0.5 text-xs text-accent-700 mb-3">Share this link — anyone can view your listings without an account.</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={publicUrl}
            className="flex-1 rounded-md border border-accent-200 bg-white px-3 py-1.5 text-xs text-sand-700 focus:outline-none"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(publicUrl)}
            className="rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-600 transition-colors"
          >
            Copy
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-accent-300 px-3 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-100 transition-colors"
          >
            Preview
          </a>
        </div>
      </div>

      {/* Listings */}
      <h2 className="mb-4 text-lg font-semibold text-sand-900">
        Your listings <span className="text-sand-400 font-normal text-base">({listings.length})</span>
      </h2>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-sand-200 bg-white px-6 py-12 text-center text-sand-400">
          <p>You have no active listings.</p>
          <p className="mt-1 text-sm">
            Open a card detail page and click <span className="font-medium text-sand-600">List for Sale</span>.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => {
            const symbol = l.currency === 'EUR' ? '€' : '$'
            return (
              <li key={l.id} className="flex gap-4 rounded-xl border border-sand-200 bg-white p-3">
                <Link href={`/cards/${l.card.scryfallId}`} className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-sand-100">
                  {l.card.imageUri && (
                    <Image src={l.card.imageUri} alt={l.card.name} fill sizes="44px" className="object-cover" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sand-900 truncate">{l.card.name}</p>
                      <p className="text-xs text-sand-500">{l.card.setCode.toUpperCase()}</p>
                    </div>
                    <p className="shrink-0 text-lg font-bold text-accent-600">{symbol}{Number(l.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="rounded bg-sand-100 px-1.5 py-0.5 text-sand-600">{CONDITIONS[l.condition] ?? l.condition}</span>
                      {l.foil && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">Foil</span>}
                      {l.quantity > 1 && <span className="rounded bg-sand-100 px-1.5 py-0.5 text-sand-600">×{l.quantity}</span>}
                      {l.notes && <span className="text-sand-400 italic">{l.notes}</span>}
                    </div>
                    <button
                      onClick={() => deleteListing(l.id)}
                      className="text-xs text-sand-300 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
