import { Suspense } from 'react'
import { searchCards, ScryfallApiError } from '@/lib/scryfall'
import { SearchForm } from '@/components/SearchForm'
import { CardGrid } from '@/components/CardGrid'

interface SearchPageProps {
  searchParams: { q?: string; page?: string }
}

async function SearchResults({ query, page }: { query: string; page: number }) {
  try {
    const results = await searchCards(query, page)
    if (results.data.length === 0) {
      return <p className="py-12 text-center text-gray-500">No cards found for &ldquo;{query}&rdquo;.</p>
    }
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {results.total_cards.toLocaleString()} results
        </p>
        <CardGrid cards={results.data} />
        {results.has_more && (
          <div className="flex justify-center pt-4">
            <a
              href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Next page
            </a>
          </div>
        )}
      </div>
    )
  } catch (err) {
    if (err instanceof ScryfallApiError && err.status === 404) {
      return <p className="py-12 text-center text-gray-500">No cards found for &ldquo;{query}&rdquo;.</p>
    }
    return (
      <p className="py-12 text-center text-red-600">
        Something went wrong. Please try again.
      </p>
    )
  }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q?.trim() ?? ''
  const page = Math.max(1, Number(searchParams.page ?? '1'))

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Card Search</h1>
      <div className="mb-8">
        <SearchForm defaultValue={query} />
      </div>

      {!query ? (
        <p className="py-12 text-center text-gray-400">Enter a card name to search.</p>
      ) : (
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg bg-gray-200 aspect-[5/7]" />
              ))}
            </div>
          }
        >
          <SearchResults query={query} page={page} />
        </Suspense>
      )}
    </main>
  )
}
