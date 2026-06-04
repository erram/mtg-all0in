import { NextResponse } from 'next/server'
import { getKnownArchetypes } from '@/lib/analyzer/matchup'
import { FORMATS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = (searchParams.get('format') ?? 'duel-commander') as Format
  if (!FORMATS.includes(format)) return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  const archetypes = await getKnownArchetypes(format)
  return NextResponse.json({ archetypes })
}
