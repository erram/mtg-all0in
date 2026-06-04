import { NextResponse } from 'next/server'
import { getEventsByFormat } from '@/lib/tournaments/cache'
import { FORMATS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = (searchParams.get('format') ?? 'modern') as Format

  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }

  try {
    const { events, stale } = await getEventsByFormat(format)
    return NextResponse.json({ events, stale })
  } catch {
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 })
  }
}
