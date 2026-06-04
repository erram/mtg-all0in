import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchAndStore } from '@/lib/price-cache'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entries = await prisma.collectionEntry.findMany({
    where: { userId: session.user.id },
    include: {
      card: {
        include: {
          prices: { orderBy: { fetchedAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { addedAt: 'desc' },
  })

  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { scryfallId, quantity, foil, notes } = body as {
    scryfallId: string
    quantity?: number
    foil?: boolean
    notes?: string
  }

  if (!scryfallId) {
    return NextResponse.json({ error: 'scryfallId is required' }, { status: 400 })
  }

  // Ensure the Card row exists before creating the FK-dependent CollectionEntry.
  // If the user adds from search (never visited the detail page), the card won't be cached yet.
  const cardExists = await prisma.card.findUnique({ where: { scryfallId }, select: { scryfallId: true } })
  if (!cardExists) {
    await fetchAndStore(scryfallId)
  }

  const foilVal = foil ?? false
  const existing = await prisma.collectionEntry.findFirst({
    where: { userId: session.user.id, scryfallId, foil: foilVal },
  })

  const entry = existing
    ? await prisma.collectionEntry.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity ?? 1 }, notes: notes ?? existing.notes },
        include: { card: { include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 1 } } } },
      })
    : await prisma.collectionEntry.create({
        data: { userId: session.user.id, scryfallId, quantity: quantity ?? 1, foil: foilVal, notes: notes ?? null },
        include: { card: { include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 1 } } } },
      })

  return NextResponse.json(entry, { status: existing ? 200 : 201 })
}
