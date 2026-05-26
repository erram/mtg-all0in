import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const entry = await prisma.collectionEntry.create({
    data: {
      userId: session.user.id,
      scryfallId,
      quantity: quantity ?? 1,
      foil: foil ?? false,
      notes: notes ?? null,
    },
    include: {
      card: {
        include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
      },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
