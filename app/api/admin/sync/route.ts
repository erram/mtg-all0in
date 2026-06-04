import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncScryfall } from '@/lib/sync-scryfall'

// Allow up to 5 min on Vercel (Pro/Enterprise only; hobby is capped at 60s)
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (!process.env.SYNC_SECRET || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncScryfall(prisma)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/sync] failed:', err)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
