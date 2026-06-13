'use client'

import { useState } from 'react'

interface Want {
  id: string
  cardName: string
  maxPrice: string | number | null
  createdAt: string
}

export function AddWantForm({ onAdded }: { onAdded?: () => void }) {
  const [name, setName] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/wants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardName: name.trim(),
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        }),
      })
      if (res.ok) {
        setName('')
        setMaxPrice('')
        onAdded?.()
        window.location.reload()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="Card name"
        className="flex-1 rounded-lg border border-sand-300 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
      />
      <div className="relative w-full sm:w-32">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sand-400">$</span>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="max (opt.)"
          className="w-full rounded-lg border border-sand-300 py-2 pl-7 pr-3 text-sm focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
        />
      </div>
      <button onClick={add} disabled={saving || !name.trim()} className="btn-primary px-5 py-2 text-sm">
        {saving ? 'Adding…' : '+ Add'}
      </button>
    </div>
  )
}

export function WantRow({ want }: { want: Want }) {
  const [removed, setRemoved] = useState(false)

  async function remove() {
    setRemoved(true)
    const res = await fetch(`/api/wants/${want.id}`, { method: 'DELETE' })
    if (!res.ok) setRemoved(false)
  }

  if (removed) return null

  return (
    <li className="group flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-sand-50">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-sand-900">{want.cardName}</p>
        <p className="text-[10px] text-sand-400">
          {want.maxPrice != null ? `max $${Number(want.maxPrice).toFixed(2)}` : 'any price'}
          {' · added '}{new Date(want.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </p>
      </div>
      <button
        onClick={remove}
        className="shrink-0 px-1 text-sand-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        title="Remove from want list"
      >
        ✕
      </button>
    </li>
  )
}
