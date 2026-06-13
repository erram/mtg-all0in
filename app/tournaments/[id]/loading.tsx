export default function EventLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5 h-4 w-32 skeleton rounded" />

      <div className="mb-8 space-y-2">
        <div className="h-7 w-72 skeleton rounded" />
        <div className="flex gap-3">
          <div className="h-4 w-28 skeleton rounded" />
          <div className="h-4 w-20 skeleton rounded" />
          <div className="h-4 w-16 skeleton rounded" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 skeleton"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    </main>
  )
}
