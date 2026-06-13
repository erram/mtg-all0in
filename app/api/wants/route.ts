import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wants = await prisma.wantListEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ wants })
}

// Accepts a single card or a bulk list (e.g. "add all missing" from the builder)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    cardName?: string
    maxPrice?: number
    cards?: { cardName: string; maxPrice?: number }[]
  }

  const items = body.cards ?? (body.cardName ? [{ cardName: body.cardName, maxPrice: body.maxPrice }] : [])
  const valid = items
    .map((c) => ({ cardName: c.cardName?.trim(), maxPrice: c.maxPrice }))
    .filter((c): c is { cardName: string; maxPrice: number | undefined } => !!c.cardName)

  if (valid.length === 0) {
    return NextResponse.json({ error: 'No cards provided' }, { status: 400 })
  }

  let added = 0
  for (const c of valid) {
    await prisma.wantListEntry.upsert({
      where: { userId_cardName: { userId: session.user.id, cardName: c.cardName } },
      update: { maxPrice: c.maxPrice ?? null },
      create: { userId: session.user.id, cardName: c.cardName, maxPrice: c.maxPrice ?? null },
    })
    added++
  }

  return NextResponse.json({ added }, { status: 201 })
}
