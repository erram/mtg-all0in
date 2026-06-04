import { NextResponse } from 'next/server'
import { getMetaSnapshot } from '@/lib/tournaments/cache'
import { FORMATS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = (searchParams.get('format') ?? 'modern') as Format

  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }

  try {
    const data = await getMetaSnapshot(format)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to load meta' }, { status: 500 })
  }
}
