import { NextResponse } from 'next/server'
import { calculateMatchups } from '@/lib/analyzer/matchup'
import { FORMATS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

export async function POST(req: Request) {
  try {
    const { yourDeck, opponents, format } = (await req.json()) as {
      yourDeck: string
      opponents: string[]
      format: Format
    }

    if (!yourDeck?.trim()) return NextResponse.json({ error: 'Your deck is required' }, { status: 400 })
    if (!opponents?.length) return NextResponse.json({ error: 'Add at least one opponent' }, { status: 400 })
    if (!FORMATS.includes(format)) return NextResponse.json({ error: 'Invalid format' }, { status: 400 })

    const result = await calculateMatchups(yourDeck.trim(), opponents.map((o) => o.trim()).filter(Boolean), format)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[matchup]', e)
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}
