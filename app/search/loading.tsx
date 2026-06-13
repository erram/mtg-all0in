export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-sand-900">Card Search</h1>
      <div className="mb-8 h-10 w-full skeleton" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-[5/7] skeleton" />
        ))}
      </div>
    </main>
  )
}
