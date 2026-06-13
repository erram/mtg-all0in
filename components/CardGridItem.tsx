'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { ScryfallCard } from '@/lib/scryfall'
import { getCardImageUri } from '@/lib/scryfall'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function CardGridItem({ card }: { card: ScryfallCard }) {
  const [status, setStatus] = useState<Status>('idle')
  const imageUri = getCardImageUri(card)

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (status !== 'idle') return
    setStatus('loading')

    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scryfallId: card.id, quantity: 1, foil: false }),
      })

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) throw new Error()

      setStatus('success')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  const btnTitle =
    status === 'success' ? 'Added!' :
    status === 'error' ? 'Failed — try again' :
    'Add 1× to collection'

  return (
    <div className="surface-hover group relative overflow-hidden rounded-xl">
      <Link href={`/cards/${card.id}`} className="block">
        <div className="foil-shine relative aspect-[5/7] w-full overflow-hidden bg-sand-100">
          {imageUri ? (
            <Image
              src={imageUri}
              alt={card.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-sand-400">
              No image
            </div>
          )}
        </div>
        <div className="px-2.5 pt-2 pb-1">
          <p className="truncate text-xs font-semibold text-sand-900 transition-colors group-hover:text-accent-600">
            {card.name}
          </p>
          <p className="text-xs text-sand-500">{card.set.toUpperCase()}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {card.prices.usd ? (
              <span className="text-xs font-semibold text-green-700">${card.prices.usd}</span>
            ) : (
              <span className="rounded bg-purple-100 px-1 py-0.5 text-xs font-bold text-purple-700">
                FOIL ONLY
              </span>
            )}
            {card.prices.usd_foil && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-purple-700">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8)' }}
                  aria-hidden
                />
                ${card.prices.usd_foil}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5">
        <button
          onClick={handleAdd}
          disabled={status === 'loading' || status === 'success'}
          title={btnTitle}
          className={`w-full rounded-lg py-1.5 text-xs font-semibold transition-all duration-300 ease-out-expo disabled:opacity-70 ${
            status === 'success'
              ? 'bg-green-100 text-green-700'
              : status === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-sand-100 text-sand-600 hover:bg-accent-500 hover:text-white hover:shadow-card'
          }`}
        >
          {status === 'idle' && '+ Add'}
          {status === 'loading' && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sand-400 border-t-transparent align-middle" />
          )}
          {status === 'success' && '✓ Added'}
          {status === 'error' && 'Failed'}
        </button>
      </div>
    </div>
  )
}
