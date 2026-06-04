import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchAndStore } from '@/lib/price-cache'

export async function GET() {
  const listings = await prisma.listing.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      card: true,
      user: { select: { email: true } },
    },
  })
  return NextResponse.json(listings)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { scryfallId, price, currency, condition, foil, quantity, notes } = body as {
    scryfallId: string
    price: number
    currency?: string
    condition?: string
    foil?: boolean
    quantity?: number
    notes?: string
  }

  if (!scryfallId || price == null || price <= 0) {
    return NextResponse.json({ error: 'scryfallId and a positive price are required' }, { status: 400 })
  }

  const cardExists = await prisma.card.findUnique({ where: { scryfallId }, select: { scryfallId: true } })
  if (!cardExists) await fetchAndStore(scryfallId)

  const listing = await prisma.listing.create({
    data: {
      userId: session.user.id,
      scryfallId,
      price,
      currency: currency ?? 'USD',
      condition: condition ?? 'NM',
      foil: foil ?? false,
      quantity: quantity ?? 1,
      notes: notes ?? null,
    },
    include: { card: true },
  })

  return NextResponse.json(listing, { status: 201 })
}
