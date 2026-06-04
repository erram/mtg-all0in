'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h2 className="text-2xl font-bold text-sand-900">Something went wrong</h2>
      <p className="mt-2 text-sand-600">An unexpected error occurred. Please try again.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-accent-500 px-5 py-2 text-sm font-semibold text-white hover:bg-accent-600"
      >
        Try again
      </button>
    </main>
  )
}
