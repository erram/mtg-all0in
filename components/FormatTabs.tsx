'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { FORMATS, FORMAT_LABELS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

export function FormatTabs({ current }: { current: Format }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="relative mb-6 flex flex-wrap gap-2">
      {FORMATS.map((f) => (
        <button
          key={f}
          disabled={isPending}
          onClick={() => startTransition(() => router.push(`/tournaments?format=${f}`))}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            f === current
              ? 'bg-accent-500 text-white'
              : 'border border-sand-300 text-sand-600 hover:border-accent-300 hover:text-accent-600'
          } ${isPending && f === current ? 'opacity-70' : ''}`}
        >
          {f === current && isPending ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {FORMAT_LABELS[f]}
            </span>
          ) : (
            FORMAT_LABELS[f]
          )}
        </button>
      ))}
    </div>
  )
}
