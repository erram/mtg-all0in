import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getBuildableDecks } from '@/lib/builder'
import { FORMATS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = (searchParams.get('format') ?? 'modern') as Format
  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }

  const decks = await getBuildableDecks(session.user.id, format)
  return NextResponse.json({ decks })
}
