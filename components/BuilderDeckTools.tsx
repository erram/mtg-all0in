'use client'

import { useState } from 'react'
import type { UpgradePlan } from '@/lib/analyzer/upgrade'
import type { MissingCard } from '@/lib/builder'

export function AddMissingToWants({ missing }: { missing: MissingCard[] }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function addAll() {
    if (status !== 'idle' || missing.length === 0) return
    setStatus('loading')
    try {
      const res = await fetch('/api/wants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: missing.map((m) => ({ cardName: m.name })) }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  return (
    <button
      onClick={addAll}
      disabled={status !== 'idle' || missing.length === 0}
      className="btn-secondary text-xs px-4 py-2"
    >
      {status === 'idle' && `♡ Add ${missing.length} missing to want list`}
      {status === 'loading' && 'Adding…'}
      {status === 'done' && '✓ Added to want list'}
      {status === 'error' && 'Failed — try again'}
    </button>
  )
}

export function BudgetOptimizer({ deckId }: { deckId: string }) {
  const [budget, setBudget] = useState('')
  const [plan, setPlan] = useState<UpgradePlan | null>(null)
  const [loading, setLoading] = useState(false)

  async function optimize() {
    const b = parseFloat(budget)
    if (isNaN(b) || b <= 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/builder/${deckId}?budget=${b}`)
      const data = await res.json()
      setPlan(data.upgradePlan ?? null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="surface p-5">
      <h3 className="text-sm font-semibold text-sand-700">Budget optimizer</h3>
      <p className="mt-1 text-xs text-sand-400">
        Spends your budget on the missing cards that appear most in winning decks — best impact per dollar first.
      </p>

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-sand-400">$</span>
          <input
            type="number"
            min="1"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && optimize()}
            placeholder="50"
            className="w-full rounded-lg border border-sand-300 py-2 pl-7 pr-3 text-sm focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>
        <button onClick={optimize} disabled={loading || !budget} className="btn-primary px-4 py-2 text-xs">
          {loading ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : 'Optimize'}
        </button>
      </div>

      {plan && (
        <div className="mt-4 animate-fade-up">
          <div className="mb-3 flex items-baseline justify-between text-sm">
            <span className="font-semibold text-sand-900">
              {plan.picks.length} purchase{plan.picks.length !== 1 ? 's' : ''} · +{plan.coverageGain} cards
            </span>
            <span className="font-bold text-accent-600">${plan.totalCost.toFixed(2)} / ${plan.budget}</span>
          </div>

          {plan.picks.length === 0 ? (
            <p className="text-xs text-sand-400">Nothing fits this budget — try a higher amount.</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {plan.picks.map((p) => (
                <li key={p.name} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="truncate text-sand-800">
                    {p.missing}× {p.name}
                    <span className="ml-1.5 rounded bg-accent-50 px-1 py-px text-[10px] text-accent-600" title="Format-wide impact score">
                      ◆ {p.impact}
                    </span>
                  </span>
                  <span className="ml-2 shrink-0 font-medium text-sand-600">${p.lineCost.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}

          {plan.skipped > 0 && (
            <p className="mt-2 text-[10px] text-sand-400">
              {plan.skipped} more card{plan.skipped !== 1 ? 's' : ''} didn&rsquo;t fit the budget.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
