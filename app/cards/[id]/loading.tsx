export default function CardDetailLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 h-4 w-24 skeleton rounded" />
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="h-[420px] w-[300px] shrink-0 skeleton rounded-xl" />
        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-2">
            <div className="h-8 w-3/4 skeleton rounded" />
            <div className="h-4 w-16 skeleton rounded" />
          </div>
          <div className="rounded-lg border border-sand-200 bg-white p-4">
            <div className="mb-3 h-3 w-20 skeleton rounded" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full skeleton rounded" />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-sand-200 bg-white p-4">
            <div className="mb-3 h-3 w-16 skeleton rounded" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-20 skeleton rounded" />
                  <div className="h-4 w-16 skeleton rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
