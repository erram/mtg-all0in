import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getDeckCompletion } from '@/lib/builder'
import { getCardImpactScores, optimizeBudget } from '@/lib/analyzer/upgrade'
import type { Format } from '@/lib/tournaments/types'

export async function GET(req: Request, { params }: { params: { deckId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const completion = await getDeckCompletion(session.user.id, params.deckId)
  if (!completion) return NextResponse.json({ error: 'Deck not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const budget = parseFloat(searchParams.get('budget') ?? '')

  let upgradePlan = null
  if (!isNaN(budget) && budget > 0) {
    const impact = await getCardImpactScores(completion.format as Format)
    upgradePlan = optimizeBudget(completion.missing, impact, budget)
  }

  return NextResponse.json({ completion, upgradePlan })
}
