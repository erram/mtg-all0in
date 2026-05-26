import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Your MTG collection,{' '}
        <span className="text-blue-600">always up to date</span>
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Search thousands of Magic: The Gathering cards, view real-time pricing from Scryfall,
        and track every card in your collection.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/search"
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 sm:w-auto"
        >
          Search cards
        </Link>
        <Link
          href="/collection"
          className="w-full rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
        >
          My collection
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
        {[
          {
            title: 'Real-time prices',
            body: 'USD and EUR prices refreshed daily from the Scryfall API. Never overpay again.',
          },
          {
            title: 'Personal collection',
            body: 'Add cards with quantity and foil tracking. See total value at a glance.',
          },
          {
            title: 'Instant search',
            body: "Search by name across the full Scryfall database. Results in under 500 ms.",
          },
        ].map(({ title, body }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{body}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
