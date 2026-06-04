export default function DeckLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2">
        <div className="h-4 w-48 animate-pulse rounded bg-sand-200" />
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse rounded bg-sand-200" />
          <div className="h-4 w-40 animate-pulse rounded bg-sand-200" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-md bg-sand-200" />
      </div>

      {/* Section label */}
      <div className="mb-3 h-3 w-24 animate-pulse rounded bg-sand-200" />

      {/* Card grid */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="animate-pulse rounded-lg bg-sand-200"
              style={{ width: 130, height: 181, animationDelay: `${(i % 8) * 60}ms` }}
            />
            <div
              className="h-3 w-20 animate-pulse rounded bg-sand-200"
              style={{ animationDelay: `${(i % 8) * 60}ms` }}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
