export default function CollectionLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 skeleton rounded" />
        <div className="h-9 w-24 skeleton rounded-md" />
      </div>
      <div className="mb-4 h-5 w-32 skeleton rounded" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-sand-200 bg-white p-3">
            <div className="h-24 w-16 shrink-0 skeleton rounded" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-3/4 skeleton rounded" />
              <div className="h-3 w-12 skeleton rounded" />
              <div className="mt-auto h-3 w-20 skeleton rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
