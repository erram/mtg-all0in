'use client'

import { useRouter } from 'next/navigation'
import { FormEvent } from 'react'

export function SearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q') as string
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search cards… e.g. lightning bolt"
        className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Search
      </button>
    </form>
  )
}
