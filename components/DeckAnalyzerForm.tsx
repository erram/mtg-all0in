'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ManaCurve } from '@/components/ManaCurve'
import type { DeckStats } from '@/lib/analyzer/stats'

const PLACEHOLDER_DECK = `1 Lumra, Bellow Of The Woods
1 Sol Ring
1 Command Tower
...`

const COLOR_MAP: Record<string, { bg: string; text: string; label: string }> = {
  W: { bg: 'bg-yellow-50', text: 'text-yellow-800', label: 'White' },
  U: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Blue' },
  B: { bg: 'bg-gray-700', text: 'text-gray-100', label: 'Black' },
  R: { bg: 'bg-red-100', text: 'text-red-800', label: 'Red' },
  G: { bg: 'bg-green-100', text: 'text-green-800', label: 'Green' },
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-sand-200 bg-white p-4">
      <p className="text-xs text-sand-500">{label}</p>
      <p className="text-2xl font-bold text-sand-900">{value}</p>
      {sub && <p className="text-xs text-sand-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? 'bg-green-400' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-sand-600">{label}</span>
        <span className="font-semibold text-sand-900">{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-sand-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function InteractionRow({ label, group }: { label: string; group: { count: number; cards: string[] } }) {
  const [open, setOpen] = useState(false)
  if (group.count === 0) return null
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-1.5 text-sm hover:text-accent-600"
      >
        <span className="text-sand-700">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-sand-100 px-1.5 py-0.5 text-xs font-medium text-sand-700">{group.count}</span>
          <span className="text-sand-400">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div className="pl-3 pb-2 flex flex-wrap gap-1">
          {group.cards.map((c) => (
            <span key={c} className="rounded bg-sand-100 px-2 py-0.5 text-xs text-sand-600">{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export function DeckAnalyzerForm() {
  const [decklist, setDecklist] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ stats: DeckStats; notFound: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyze() {
    if (!decklist.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decklist }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Analysis failed'); return }
      setResult(data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const stats = result?.stats

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Input panel */}
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-sand-700">
            Paste your decklist
          </label>
          <p className="mb-2 text-xs text-sand-400">
            Supports MTGA export, MTGO format, or plain &ldquo;4 Card Name&rdquo; per line.
            Put &ldquo;Commander&rdquo; on its own line before the commander card for DC decks.
          </p>
          <textarea
            value={decklist}
            onChange={(e) => setDecklist(e.target.value)}
            placeholder={PLACEHOLDER_DECK}
            rows={18}
            className="w-full rounded-lg border border-sand-300 bg-white p-3 font-mono text-sm text-sand-800 placeholder:text-sand-300 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400 resize-none"
          />
        </div>
        <button
          onClick={analyze}
          disabled={loading || !decklist.trim()}
          className="w-full rounded-md bg-accent-500 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Analyzing…
            </>
          ) : 'Analyze Deck'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result?.notFound && result.notFound.length > 0 && (
          <p className="text-xs text-sand-400">
            Cards not found on Scryfall: {result.notFound.join(', ')}
          </p>
        )}
      </div>

      {/* Results panel */}
      {stats && (
        <div className="space-y-6">
          {/* Commander + colors */}
          {stats.commander && (
            <div className="flex items-start gap-4">
              <div className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-lg shadow">
                <Image src={stats.commander.imageUri} alt={stats.commander.name} fill className="object-cover object-top" unoptimized />
              </div>
              <div>
                <p className="font-semibold text-sand-900">{stats.commander.name}</p>
                <p className="text-xs text-sand-500 mb-2">Commander</p>
                <div className="flex gap-1">
                  {stats.colorIdentity.map((c) => {
                    const s = COLOR_MAP[c]
                    return (
                      <span key={c} className={`rounded px-2 py-0.5 text-xs font-semibold ${s?.bg} ${s?.text}`}>
                        {s?.label ?? c}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Total cards" value={stats.totalCards} />
            <StatCard label="Lands" value={stats.landCount} sub={`${Math.round((stats.landCount / stats.totalCards) * 100)}% of deck`} />
            <StatCard label="Avg mana value" value={stats.avgManaValue} sub="non-land spells" />
            <StatCard label="Interaction" value={stats.interaction.total} sub="unique spells" />
          </div>

          {/* Mana curve */}
          <div className="rounded-lg border border-sand-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-sand-700">Mana Curve</h3>
            <ManaCurve curve={stats.curve} />
          </div>

          {/* Type breakdown */}
          <div className="rounded-lg border border-sand-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-sand-700">Card Types</h3>
            <div className="space-y-1.5">
              {Object.entries(stats.typeBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="w-24 text-xs text-sand-500">{type}</span>
                    <div className="flex-1 h-2 rounded-full bg-sand-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-400"
                        style={{ width: `${(count / stats.totalCards) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-medium text-sand-700">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Interaction breakdown */}
          <div className="rounded-lg border border-sand-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-sand-700">
              Interaction <span className="font-normal text-sand-400">({stats.interaction.total} spells)</span>
            </h3>
            <div className="divide-y divide-sand-100">
              <InteractionRow label="Removal" group={stats.interaction.removal} />
              <InteractionRow label="Counterspells" group={stats.interaction.counterspells} />
              <InteractionRow label="Hand disruption" group={stats.interaction.discard} />
              <InteractionRow label="Board wipes" group={stats.interaction.boardwipes} />
              <InteractionRow label="Bounce" group={stats.interaction.bounce} />
            </div>
          </div>

          {/* Themes + synergy */}
          <div className="rounded-lg border border-sand-200 bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-sand-700">Themes & Synergy</h3>
            {stats.themes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stats.themes.map((t) => (
                  <span
                    key={t.key}
                    className="rounded-full bg-accent-50 border border-accent-200 px-3 py-1 text-xs font-medium text-accent-700"
                    title={t.cards.join(', ')}
                  >
                    {t.label} · {t.count}
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-2.5">
              <ScoreGauge score={stats.synergyScore} label="Deck synergy" />
              {stats.commanderSynergyScore != null && (
                <ScoreGauge score={stats.commanderSynergyScore} label="Commander synergy" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
