import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface Params {
  params: { entryId: string }
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entry = await prisma.collectionEntry.findUnique({ where: { id: params.entryId } })
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { quantity, foil, notes } = body as {
    quantity?: number
    foil?: boolean
    notes?: string
  }

  const updated = await prisma.collectionEntry.update({
    where: { id: params.entryId },
    data: {
      ...(quantity !== undefined && { quantity }),
      ...(foil !== undefined && { foil }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      card: {
        include: { prices: { orderBy: { fetchedAt: 'desc' }, take: 1 } },
      },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entry = await prisma.collectionEntry.findUnique({ where: { id: params.entryId } })
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.collectionEntry.delete({ where: { id: params.entryId } })
  return new NextResponse(null, { status: 204 })
}
