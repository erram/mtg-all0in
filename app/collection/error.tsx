'use client'

import { useEffect } from 'react'

export default function CollectionError({
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-sand-900">My Collection</h1>
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-lg font-semibold text-red-700">Failed to load your collection</p>
        <p className="mt-1 text-sm text-red-600">Please try again or refresh the page.</p>
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
