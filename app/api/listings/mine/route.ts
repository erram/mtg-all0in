import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const listings = await prisma.listing.findMany({
    where: { userId: session.user.id, active: true },
    orderBy: { createdAt: 'desc' },
    include: { card: true },
  })

  return NextResponse.json(listings)
}
