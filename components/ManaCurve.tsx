interface CurveBar { cmc: number; count: number; cards: string[] }

export function ManaCurve({ curve }: { curve: CurveBar[] }) {
  const max = Math.max(...curve.map((b) => b.count), 1)

  const COLOR: Record<number, string> = {
    0: 'bg-gray-300',
    1: 'bg-green-400',
    2: 'bg-blue-400',
    3: 'bg-red-400',
    4: 'bg-orange-400',
    5: 'bg-purple-400',
    6: 'bg-pink-400',
    7: 'bg-gray-500',
  }

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-24">
        {curve.map((bar) => (
          <div key={bar.cmc} className="group relative flex flex-1 flex-col items-center gap-0.5">
            <span className="text-[10px] font-medium text-sand-600">{bar.count || ''}</span>
            <div
              className={`w-full rounded-t transition-all ${COLOR[bar.cmc] ?? 'bg-gray-400'}`}
              style={{ height: `${(bar.count / max) * 72}px`, minHeight: bar.count ? 4 : 0 }}
            />
            {bar.count > 0 && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block w-40 rounded-md border border-sand-200 bg-white p-2 shadow-lg text-xs">
                <p className="font-semibold mb-1 text-sand-700">{bar.cmc === 7 ? '7+' : bar.cmc} mana</p>
                {bar.cards.slice(0, 5).map((c) => <p key={c} className="truncate text-sand-500">{c}</p>)}
                {bar.cards.length > 5 && <p className="text-sand-400">+{bar.cards.length - 5} more</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {curve.map((bar) => (
          <div key={bar.cmc} className="flex-1 text-center text-[10px] text-sand-400">
            {bar.cmc === 7 ? '7+' : bar.cmc}
          </div>
        ))}
      </div>
    </div>
  )
}
