'use client'

import { FormEvent, useState } from 'react'

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const
type Status = 'idle' | 'loading' | 'success' | 'error'

export function ListForSaleForm({ scryfallId }: { scryfallId: string }) {
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [condition, setCondition] = useState('NM')
  const [foil, setFoil] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = parseFloat(price)
    if (!parsed || parsed <= 0) {
      setError('Enter a valid price')
      return
    }
    setStatus('loading')

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scryfallId, price: parsed, currency, condition, foil, quantity, notes: notes || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed')
      }
      setStatus('success')
      setPrice('')
      setNotes('')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('idle')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-sand-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-sand-500">List for Sale</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-sand-700 mb-1">Price</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
              className="w-full rounded-md border border-sand-300 bg-white px-2 py-1.5 text-sm text-sand-900 placeholder:text-sand-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-md border border-sand-300 bg-white px-2 py-1.5 text-sm text-sand-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            >
              <option>EUR</option>
              <option>USD</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-sand-700 mb-1">Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded-md border border-sand-300 bg-white px-2 py-1.5 text-sm text-sand-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          >
            {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-sand-700 mb-1">Qty</label>
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-16 rounded-md border border-sand-300 bg-white px-2 py-1.5 text-center text-sm text-sand-900 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-sand-700 mt-4">
          <input
            type="checkbox"
            checked={foil}
            onChange={(e) => setFoil(e.target.checked)}
            className="rounded border-sand-300 text-accent-500"
          />
          Foil
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-sand-700 mb-1">Notes <span className="text-sand-400">(optional)</span></label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. light play, English, signed"
          className="w-full rounded-md border border-sand-300 bg-white px-2 py-1.5 text-sm text-sand-900 placeholder:text-sand-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === 'loading' || status === 'success'}
        className="w-full rounded-md bg-accent-500 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60 transition-colors"
      >
        {status === 'loading' && 'Listing…'}
        {status === 'success' && '✓ Listed!'}
        {status === 'idle' && 'List for Sale'}
      </button>
    </form>
  )
}
