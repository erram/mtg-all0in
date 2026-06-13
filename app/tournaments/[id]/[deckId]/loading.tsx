export default function DeckLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2">
        <div className="h-4 w-48 skeleton rounded" />
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 skeleton rounded" />
          <div className="h-4 w-40 skeleton rounded" />
        </div>
        <div className="h-9 w-36 skeleton rounded-md" />
      </div>

      {/* Section label */}
      <div className="mb-3 h-3 w-24 skeleton rounded" />

      {/* Card grid */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="skeleton"
              style={{ width: 130, height: 181, animationDelay: `${(i % 8) * 60}ms` }}
            />
            <div
              className="h-3 w-20 skeleton rounded"
              style={{ animationDelay: `${(i % 8) * 60}ms` }}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
