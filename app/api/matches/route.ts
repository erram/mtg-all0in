import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateMatchups } from '@/lib/analyzer/matchup'
import { FORMATS } from '@/lib/tournaments/types'
import type { Format } from '@/lib/tournaments/types'

const RESULTS = ['WIN', 'LOSS', 'DRAW']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const matches = await prisma.matchResult.findMany({
    where: { userId: session.user.id },
    orderBy: { playedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ matches })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    format: Format
    yourArchetype: string
    oppArchetype: string
    result: string
    eventName?: string
    notes?: string
  }

  if (!FORMATS.includes(body.format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }
  if (!body.yourArchetype?.trim() || !body.oppArchetype?.trim()) {
    return NextResponse.json({ error: 'Both archetypes are required' }, { status: 400 })
  }
  if (!RESULTS.includes(body.result)) {
    return NextResponse.json({ error: 'Result must be WIN, LOSS, or DRAW' }, { status: 400 })
  }

  // Snapshot the pure model prediction at log time (no personal blending —
  // we want to compare your real results against the uncalibrated model)
  let predicted: number | null = null
  try {
    const analysis = await calculateMatchups(
      body.yourArchetype.trim(),
      [body.oppArchetype.trim()],
      body.format,
    )
    predicted = analysis.matchups[0]?.modelWinRate ?? null
  } catch {
    // prediction is best-effort
  }

  const match = await prisma.matchResult.create({
    data: {
      userId: session.user.id,
      format: body.format,
      yourArchetype: body.yourArchetype.trim(),
      oppArchetype: body.oppArchetype.trim(),
      result: body.result,
      predicted,
      eventName: body.eventName?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  })

  return NextResponse.json({ match }, { status: 201 })
}
