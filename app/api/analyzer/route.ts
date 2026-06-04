import { NextResponse } from 'next/server'
import { parseDecklist, detectCommander } from '@/lib/analyzer/parser'
import { calculateStats } from '@/lib/analyzer/stats'
import { getCardsByNames } from '@/lib/scryfall/client'

export async function POST(req: Request) {
  try {
    const { decklist } = (await req.json()) as { decklist: string }
    if (!decklist?.trim()) {
      return NextResponse.json({ error: 'No decklist provided' }, { status: 400 })
    }

    const parsed = parseDecklist(decklist)
    if (parsed.length === 0) {
      return NextResponse.json({ error: 'Could not parse any cards' }, { status: 400 })
    }

    const uniqueNames = Array.from(new Set(parsed.map((c) => c.name)))
    const cardMap = await getCardsByNames(uniqueNames)

    const entries = parsed
      .map(({ name, qty }) => {
        const card = cardMap.get(name.toLowerCase())
        return card ? { card, qty } : null
      })
      .filter(Boolean) as { card: import('@/lib/scryfall/types').ScryfallCard; qty: number }[]

    const notFound = parsed
      .filter(({ name }) => !cardMap.get(name.toLowerCase()))
      .map(({ name }) => name)

    const commanderName = detectCommander(parsed)
    const stats = calculateStats(entries, commanderName)

    return NextResponse.json({ stats, notFound })
  } catch (e) {
    console.error('[analyzer]', e)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
