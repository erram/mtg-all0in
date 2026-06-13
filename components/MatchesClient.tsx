'use client'

import { useState, useEffect, useCallback } from 'react'
import { FORMATS, FORMAT_LABELS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

interface Match {
  id: string
  format: string
  yourArchetype: string
  oppArchetype: string
  result: 'WIN' | 'LOSS' | 'DRAW'
  predicted: number | null
  eventName: string | null
  playedAt: string
}

const RESULT_STYLE = {
  WIN: 'bg-green-100 text-green-700',
  LOSS: 'bg-red-100 text-red-700',
  DRAW: 'bg-sand-100 text-sand-600',
}

function ArchetypeField({
  value, onChange, placeholder, suggestions,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  suggestions: string[]
}) {
  const [open, setOpen] = useState(false)
  const filtered = value.length >= 2
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
    : []

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-sand-300 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-sand-200 bg-white shadow-float">
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent-50 hover:text-accent-700"
                onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false) }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function MatchesClient() {
  const [matches, setMatches] = useState<Match[]>([])
  const [archetypes, setArchetypes] = useState<string[]>([])
  const [format, setFormat] = useState<Format>('duel-commander')
  const [yourDeck, setYourDeck] = useState('')
  const [oppDeck, setOppDeck] = useState('')
  const [result, setResult] = useState<'WIN' | 'LOSS' | 'DRAW'>('WIN')
  const [eventName, setEventName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch('/api/matches').then((r) => r.json()).then((d) => setMatches(d.matches ?? []))
  }, [])

  useEffect(load, [load])
  useEffect(() => {
    fetch(`/api/analyzer/archetypes?format=${format}`)
      .then((r) => r.json())
      .then((d) => setArchetypes(d.archetypes ?? []))
      .catch(() => {})
  }, [format])

  async function logMatch() {
    if (!yourDeck.trim() || !oppDeck.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format, yourArchetype: yourDeck, oppArchetype: oppDeck, result,
          eventName: eventName || undefined,
        }),
      })
      if (res.ok) {
        setOppDeck('')
        setEventName('')
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/matches/${id}`, { method: 'DELETE' })
    setMatches((m) => m.filter((x) => x.id !== id))
  }

  // You vs. model — group by opponent archetype
  const byOpp = new Map<string, { games: number; wins: number; draws: number; predSum: number; predCount: number }>()
  for (const m of matches) {
    const key = m.oppArchetype
    const g = byOpp.get(key) ?? { games: 0, wins: 0, draws: 0, predSum: 0, predCount: 0 }
    g.games++
    if (m.result === 'WIN') g.wins++
    if (m.result === 'DRAW') g.draws++
    if (m.predicted != null) { g.predSum += m.predicted; g.predCount++ }
    byOpp.set(key, g)
  }
  const calibration = Array.from(byOpp.entries())
    .map(([opp, g]) => ({
      opp,
      games: g.games,
      actual: (g.wins + g.draws * 0.5) / g.games,
      predicted: g.predCount > 0 ? g.predSum / g.predCount : null,
    }))
    .filter((c) => c.games >= 2)
    .sort((a, b) => b.games - a.games)

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Log form — 2/5 */}
      <div className="space-y-4 lg:col-span-2">
        <div className="surface p-5 space-y-4">
          <h2 className="text-sm font-semibold text-sand-700">Log a match</h2>

          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  f === format ? 'bg-accent-500 text-white' : 'border border-sand-300 text-sand-600 hover:border-accent-300'
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>

          <ArchetypeField value={yourDeck} onChange={setYourDeck} placeholder="Your deck" suggestions={archetypes} />
          <ArchetypeField value={oppDeck} onChange={setOppDeck} placeholder="Opponent's deck" suggestions={archetypes} />

          <div className="grid grid-cols-3 gap-1.5">
            {(['WIN', 'LOSS', 'DRAW'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResult(r)}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  result === r
                    ? r === 'WIN' ? 'bg-green-500 text-white' : r === 'LOSS' ? 'bg-red-500 text-white' : 'bg-sand-500 text-white'
                    : 'border border-sand-300 text-sand-600 hover:border-sand-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Event name (optional)"
            className="w-full rounded-lg border border-sand-300 px-3 py-2 text-sm focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
          />

          <button onClick={logMatch} disabled={saving || !yourDeck.trim() || !oppDeck.trim()} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Log match'}
          </button>
        </div>

        {/* Calibration table */}
        {calibration.length > 0 && (
          <div className="surface overflow-hidden">
            <div className="border-b border-sand-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-sand-700">You vs. the model</h2>
              <p className="text-[10px] text-sand-400">Matchups with 2+ logged games</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-sand-400">
                  <th className="px-4 py-2 font-medium">Opponent</th>
                  <th className="px-2 py-2 text-right font-medium">Games</th>
                  <th className="px-2 py-2 text-right font-medium">You</th>
                  <th className="px-4 py-2 text-right font-medium">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {calibration.map((c) => {
                  const diff = c.predicted != null ? c.actual - c.predicted : null
                  return (
                    <tr key={c.opp}>
                      <td className="truncate px-4 py-2 text-sand-800">{c.opp}</td>
                      <td className="px-2 py-2 text-right text-sand-500">{c.games}</td>
                      <td className={`px-2 py-2 text-right font-semibold ${diff != null && diff > 0.05 ? 'text-green-600' : diff != null && diff < -0.05 ? 'text-red-600' : 'text-sand-700'}`}>
                        {Math.round(c.actual * 100)}%
                      </td>
                      <td className="px-4 py-2 text-right text-sand-500">
                        {c.predicted != null ? `${Math.round(c.predicted * 100)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History — 3/5 */}
      <div className="lg:col-span-3">
        <h2 className="mb-3 text-sm font-semibold text-sand-700">
          Match history <span className="font-normal text-sand-400">({matches.length})</span>
        </h2>
        {matches.length === 0 ? (
          <div className="surface px-6 py-14 text-center text-sand-400">
            <p>No matches logged yet.</p>
            <p className="mt-1 text-sm">Your results sharpen the matchup calculator&rsquo;s predictions.</p>
          </div>
        ) : (
          <div className="surface overflow-hidden">
            <ul className="divide-y divide-sand-100">
              {matches.map((m) => (
                <li key={m.id} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand-50">
                  <span className={`w-12 shrink-0 rounded-md py-0.5 text-center text-[10px] font-bold ${RESULT_STYLE[m.result]}`}>
                    {m.result}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-sand-900">
                      <span className="font-medium">{m.yourArchetype}</span>
                      <span className="text-sand-400"> vs </span>
                      <span className="font-medium">{m.oppArchetype}</span>
                    </p>
                    <p className="text-[10px] text-sand-400">
                      {FORMAT_LABELS[m.format as Format] ?? m.format}
                      {m.eventName && ` · ${m.eventName}`}
                      {' · '}{new Date(m.playedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {m.predicted != null && ` · model said ${Math.round(m.predicted * 100)}%`}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(m.id)}
                    className="shrink-0 px-1 text-sand-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    title="Delete"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
