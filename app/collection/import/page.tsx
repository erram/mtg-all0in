'use client'

import { ChangeEvent, useState } from 'react'
import Link from 'next/link'

type ParsedCard = { name: string; quantity: number }
type Market = 'USD' | 'EUR'
type PriceLevel = 'low' | 'mid' | 'high'
type ImportResult = {
  added: string[]
  listed: string[]
  skippedListing: string[]
  failed: { name: string; reason: string }[]
}
type Progress = { current: number; total: number; currentCard: string }

const PRICE_LABELS: Record<PriceLevel, string> = {
  low: 'Low  (−15%)',
  mid: 'Mid  (market)',
  high: 'High (+15%)',
}

function parseList(text: string): ParsedCard[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('#'))
    .filter((l) => !/^(deck|sideboard|commander|companion)$/i.test(l))
    .flatMap((line) => {
      const clean = line.replace(/\s*[\[(][^\])\n]+[\])].*$/, '').trim()
      const match = clean.match(/^(\d+)[x×]?\s+(.+)$/)
      if (match) return [{ quantity: parseInt(match[1], 10), name: match[2].trim() }]
      if (clean.length > 0) return [{ quantity: 1, name: clean }]
      return []
    })
    .filter((c) => c.name.length > 0)
    .slice(0, 75)
}

type Status = 'idle' | 'loading' | 'done'

export default function ImportPage() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)

  // listing options
  const [listForSale, setListForSale] = useState(false)
  const [market, setMarket] = useState<Market>('EUR')
  const [priceLevel, setPriceLevel] = useState<PriceLevel>('mid')

  const parsed = parseList(text)
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setText(ev.target?.result as string ?? '')
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!parsed.length) return
    setStatus('loading')
    setProgress({ current: 0, total: parsed.length, currentCard: '' })
    setResult(null)

    try {
      const res = await fetch('/api/collection/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: parsed, listForSale, market, priceLevel }),
      })
      if (res.status === 401) { window.location.href = '/login'; return }
      if (!res.body) { setStatus('done'); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            if (msg.type === 'progress') {
              setProgress({ current: msg.current, total: msg.total, currentCard: msg.card })
            } else if (msg.type === 'done') {
              setResult({ added: msg.added, listed: msg.listed, skippedListing: msg.skippedListing, failed: msg.failed })
              setStatus('done')
            }
          } catch { /* ignore malformed lines */ }
        }
      }
    } catch {
      setStatus('done')
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sand-900">Bulk Import</h1>
          <p className="mt-1 text-sm text-sand-500">Paste a card list or upload a .txt file. Max 75 cards per import.</p>
        </div>
        <Link href="/collection" className="text-sm text-accent-500 hover:underline">← Collection</Link>
      </div>

      <div className="space-y-4">
        {/* Format hint */}
        <div className="rounded-lg border border-sand-200 bg-sand-50 px-4 py-3 text-xs text-sand-600">
          <p className="font-medium text-sand-700 mb-1">Supported formats</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 font-mono">
            <span>4 Lightning Bolt</span>
            <span>4x Counterspell</span>
            <span>Thoughtseize</span>
            <span>2 Snapcaster Mage (ISD)</span>
          </div>
        </div>

        {/* File upload */}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-md border border-sand-300 bg-white px-3 py-2 text-sm font-medium text-sand-700 hover:bg-sand-100 transition-colors">
            Upload .txt file
            <input type="file" accept=".txt,.csv" className="hidden" onChange={handleFile} />
          </label>
          {text && (
            <button
              onClick={() => { setText(''); setResult(null); setStatus('idle'); setProgress(null) }}
              className="text-xs text-sand-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); setStatus('idle'); setProgress(null) }}
          placeholder={'4 Lightning Bolt\n2x Counterspell\nThoughtseize'}
          rows={10}
          className="w-full rounded-lg border border-sand-300 bg-white px-4 py-3 font-mono text-sm text-sand-900 placeholder:text-sand-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 resize-y"
        />

        {/* Preview count */}
        {parsed.length > 0 && status === 'idle' && (
          <p className="text-sm text-sand-600">
            <span className="font-semibold text-sand-900">{parsed.length}</span> card{parsed.length !== 1 ? 's' : ''} detected
            {parsed.length === 75 && <span className="ml-1 text-amber-600">(limit — remaining lines ignored)</span>}
          </p>
        )}

        {/* ── List for sale toggle ── */}
        <div className="rounded-xl border border-sand-200 bg-white p-4 space-y-4">
          <label className="flex cursor-pointer items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-sand-900">List imported cards for sale</p>
              <p className="text-xs text-sand-500 mt-0.5">Auto-price each card based on Scryfall market data</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={listForSale}
              onClick={() => setListForSale((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500/30 ${listForSale ? 'bg-accent-500' : 'bg-sand-300'}`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${listForSale ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </label>

          {listForSale && (
            <div className="space-y-3 pt-1 border-t border-sand-100">
              {/* Market */}
              <div>
                <p className="text-xs font-medium text-sand-600 mb-1.5">Market</p>
                <div className="flex gap-2">
                  {(['EUR', 'USD'] as Market[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMarket(m)}
                      className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                        market === m
                          ? 'border-accent-500 bg-accent-50 text-accent-700'
                          : 'border-sand-300 bg-white text-sand-600 hover:bg-sand-50'
                      }`}
                    >
                      {m === 'EUR' ? '€ EUR — Cardmarket' : '$ USD — TCGPlayer'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price level */}
              <div>
                <p className="text-xs font-medium text-sand-600 mb-1.5">Price point</p>
                <div className="flex gap-2">
                  {(['low', 'mid', 'high'] as PriceLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPriceLevel(lvl)}
                      className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                        priceLevel === lvl
                          ? 'border-accent-500 bg-accent-50 text-accent-700'
                          : 'border-sand-300 bg-white text-sand-600 hover:bg-sand-50'
                      }`}
                    >
                      {PRICE_LABELS[lvl]}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-sand-400">
                  Cards with no {market} price on Scryfall will be imported but not listed.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={!parsed.length || status === 'loading'}
          className="w-full rounded-md bg-accent-500 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
        >
          {status === 'loading'
            ? `Importing… ${progress ? `${progress.current} / ${progress.total}` : ''}`
            : `Import ${parsed.length} card${parsed.length !== 1 ? 's' : ''}${listForSale ? ' & list for sale' : ''}`}
        </button>

        {/* Progress bar */}
        {status === 'loading' && progress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-sand-500">
              <span className="truncate max-w-[70%]">
                {progress.currentCard
                  ? <><span className="text-sand-400">Looking up</span> <span className="font-medium text-sand-700">{progress.currentCard}</span></>
                  : 'Starting…'}
              </span>
              <span className="font-semibold text-sand-700 tabular-nums">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-sand-200">
              <div
                className="h-full rounded-full bg-accent-500 transition-all duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 rounded-xl border border-sand-200 bg-white p-5">
            {/* Stat row */}
            <div className="flex flex-wrap gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{result.added.length}</p>
                <p className="text-xs text-sand-500">added to collection</p>
              </div>
              {listForSale && (
                <>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent-500">{result.listed.length}</p>
                    <p className="text-xs text-sand-500">listed for sale</p>
                  </div>
                  {result.skippedListing.length > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-500">{result.skippedListing.length}</p>
                      <p className="text-xs text-sand-500">no {market} price</p>
                    </div>
                  )}
                </>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{result.failed.length}</p>
                <p className="text-xs text-sand-500">not found</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {result.added.length > 0 && (
                  <Link href="/collection" className="text-sm font-medium text-accent-500 hover:underline">
                    Collection →
                  </Link>
                )}
                {listForSale && result.listed.length > 0 && (
                  <Link href="/profile" className="text-sm font-medium text-accent-500 hover:underline">
                    My listings →
                  </Link>
                )}
              </div>
            </div>

            {/* Skipped listings */}
            {listForSale && result.skippedListing.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-500">
                  Imported but not listed (no {market} price)
                </p>
                <p className="text-sm text-sand-700">{result.skippedListing.join(', ')}</p>
              </div>
            )}

            {/* Failed */}
            {result.failed.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sand-500">Not imported</p>
                <ul className="space-y-1">
                  {result.failed.map(({ name, reason }) => (
                    <li key={name} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-sand-800">{name}</span>
                      <span className="text-xs text-red-500">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
