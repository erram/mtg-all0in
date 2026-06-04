'use client'

import { FormEvent, useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function AddToCollectionForm({ scryfallId }: { scryfallId: string }) {
  const [quantity, setQuantity] = useState(1)
  const [foil, setFoil] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scryfallId, quantity, foil }),
      })

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) throw new Error('Failed to add')

      setStatus('success')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-sand-200 bg-white p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-sand-500">
        Add to Collection
      </h2>

      <div className="flex items-center gap-3">
        <label className="text-sm text-sand-700">Qty</label>
        <input
          type="number"
          min={1}
          max={999}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-16 rounded-md border border-sand-300 bg-white px-2 py-1 text-center text-sm text-sand-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
        />

        <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-sand-700">
          <input
            type="checkbox"
            checked={foil}
            onChange={(e) => setFoil(e.target.checked)}
            className="rounded border-sand-300 text-accent-500 focus:ring-accent-500/20"
          />
          Foil
        </label>
      </div>

      <button
        type="submit"
        disabled={status === 'loading' || status === 'success'}
        className="w-full rounded-md bg-accent-500 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60 transition-colors"
      >
        {status === 'loading' && 'Adding…'}
        {status === 'success' && '✓ Added!'}
        {status === 'error' && 'Failed — try again'}
        {status === 'idle' && 'Add to Collection'}
      </button>
    </form>
  )
}
