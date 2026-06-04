'use client'

import { useState } from 'react'
import { FORMATS, FORMAT_LABELS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'
import type { MatchupAnalysis } from '@/lib/analyzer/matchup'

const CONFIDENCE_LABEL = { high: '✓ strong data', medium: '~ limited data', low: '? few results' }
const CONFIDENCE_COLOR = { high: 'text-green-600', medium: 'text-yellow-600', low: 'text-sand-400' }

function WinRateBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100)
  const color = pct >= 55 ? 'bg-green-400' : pct >= 45 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-sand-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-10 text-right text-sm font-semibold ${pct >= 55 ? 'text-green-700' : pct >= 45 ? 'text-yellow-700' : 'text-red-700'}`}>
        {pct}%
      </span>
    </div>
  )
}

export function MatchupCalculatorForm() {
  const [format, setFormat] = useState<Format>('duel-commander')
  const [yourDeck, setYourDeck] = useState('')
  const [opponents, setOpponents] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MatchupAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  function addOpponent() { setOpponents((o) => [...o, '']) }
  function removeOpponent(i: number) { setOpponents((o) => o.filter((_, idx) => idx !== i)) }
  function setOpponent(i: number, val: string) {
    setOpponents((o) => { const n = [...o]; n[i] = val; return n })
  }

  async function calculate() {
    const validOpponents = opponents.filter((o) => o.trim())
    if (!yourDeck.trim() || validOpponents.length === 0) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/analyzer/matchup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yourDeck: yourDeck.trim(), opponents: validOpponents, format }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Calculation failed'); return }
      setResult(data)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const overallPct = result ? Math.round(result.overallWinRate * 100) : null

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Input panel */}
      <div className="space-y-5">
        {/* Format */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-sand-700">Format</label>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => { setFormat(f); setResult(null) }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  f === format ? 'bg-accent-500 text-white' : 'border border-sand-300 text-sand-600 hover:border-accent-300'
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Your deck */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-sand-700">Your deck / commander</label>
          <input
            value={yourDeck}
            onChange={(e) => setYourDeck(e.target.value)}
            placeholder="e.g. Lumra, Bellow Of The Woods"
            className="w-full rounded-lg border border-sand-300 px-3 py-2 text-sm text-sand-800 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>

        {/* Opponents */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-sand-700">Opponent decks</label>
          <div className="space-y-2">
            {opponents.map((opp, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opp}
                  onChange={(e) => setOpponent(i, e.target.value)}
                  placeholder={`Opponent ${i + 1} deck / commander`}
                  className="flex-1 rounded-lg border border-sand-300 px-3 py-2 text-sm text-sand-800 focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400"
                />
                {opponents.length > 1 && (
                  <button
                    onClick={() => removeOpponent(i)}
                    className="px-2 text-sand-400 hover:text-red-500 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addOpponent}
            className="mt-2 text-sm text-accent-600 hover:text-accent-700"
          >
            + Add opponent
          </button>
        </div>

        <button
          onClick={calculate}
          disabled={loading || !yourDeck.trim() || !opponents.some((o) => o.trim())}
          className="w-full rounded-md bg-accent-500 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Calculating…
            </>
          ) : 'Calculate Win Rates'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="rounded-lg border border-sand-200 bg-sand-50 p-3 text-xs text-sand-500 space-y-1">
          <p className="font-medium text-sand-700">How it works</p>
          <p>Win rates are estimated using the Bradley-Terry model applied to historical tournament placements from MTGTop8. More tournament appearances = higher confidence.</p>
          <p>Unknown decks default to the median performance score for the format.</p>
        </div>
      </div>

      {/* Results panel */}
      {result && (
        <div className="space-y-4">
          {/* Overall score */}
          <div className={`rounded-xl p-6 text-center ${
            overallPct! >= 55 ? 'bg-green-50 border border-green-200' :
            overallPct! >= 45 ? 'bg-yellow-50 border border-yellow-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <p className="text-sm text-sand-600 mb-1">Overall win rate</p>
            <p className={`text-5xl font-bold ${
              overallPct! >= 55 ? 'text-green-700' : overallPct! >= 45 ? 'text-yellow-700' : 'text-red-700'
            }`}>{overallPct}%</p>
            <p className="text-xs text-sand-500 mt-1">{result.yourDeck}</p>
            {result.yourScore && (
              <p className="text-xs text-sand-400 mt-0.5">
                {result.yourScore.appearances} tournament appearance{result.yourScore.appearances !== 1 ? 's' : ''} on record
              </p>
            )}
            {!result.yourScore && (
              <p className="text-xs text-sand-400 mt-0.5">No tournament data — using format median</p>
            )}
          </div>

          {/* Per-matchup breakdown */}
          <div className="rounded-lg border border-sand-200 bg-white overflow-hidden">
            <div className="border-b border-sand-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-sand-700">Matchup breakdown</h3>
            </div>
            <div className="divide-y divide-sand-100">
              {result.matchups.map((m) => (
                <div key={m.opponent} className="px-4 py-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-sm font-medium text-sand-900 truncate mr-2">{m.opponent}</span>
                    <span className={`text-[10px] shrink-0 ${CONFIDENCE_COLOR[m.confidence]}`}>
                      {CONFIDENCE_LABEL[m.confidence]}
                    </span>
                  </div>
                  <WinRateBar rate={m.winRate} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
