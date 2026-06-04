'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function CardDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 text-sm text-sand-500">
        <Link href="/search" className="hover:text-blue-600">
          ← Back to search
        </Link>
      </nav>
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-lg font-semibold text-red-700">Failed to load card</p>
        <p className="mt-1 text-sm text-red-600">Could not retrieve card data. Please try again.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
        >
          Retry
        </button>
      </div>
    </main>
  )
}
