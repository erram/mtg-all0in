'use client'

export default function TournamentsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-700">Failed to load tournament data.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
