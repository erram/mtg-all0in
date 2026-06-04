'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export type Venue = 'both' | 'paper' | 'online'

const OPTIONS: { value: Venue; label: string }[] = [
  { value: 'both', label: 'All' },
  { value: 'paper', label: '🃏 Paper' },
  { value: 'online', label: '🖥 Online' },
]

export function VenueFilter({ current }: { current: Venue }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function navigate(venue: Venue) {
    const params = new URLSearchParams(searchParams.toString())
    if (venue === 'both') params.delete('venue')
    else params.set('venue', venue)
    params.delete('page') // reset to page 1 on filter change
    startTransition(() => router.push(`/tournaments?${params.toString()}`))
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-sand-200 bg-sand-50 p-1">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          disabled={isPending}
          onClick={() => navigate(value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
            value === current
              ? 'bg-white text-sand-900 shadow-sm'
              : 'text-sand-500 hover:text-sand-700'
          } ${isPending && value === current ? 'opacity-60' : ''}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
