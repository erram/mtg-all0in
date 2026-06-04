import { NextResponse } from 'next/server'
import { getEventById } from '@/lib/tournaments/cache'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { event, stale } = await getEventById(params.id)
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    return NextResponse.json({ event, stale })
  } catch {
    return NextResponse.json({ error: 'Failed to load event' }, { status: 500 })
  }
}
