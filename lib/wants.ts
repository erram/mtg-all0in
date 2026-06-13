import { prisma } from '@/lib/prisma'
import { normalizeCardName } from '@/lib/builder'

export interface WantMatch {
  listingId: string
  wantId: string
  cardName: string
  scryfallId: string
  imageUri: string | null
  price: number
  currency: string
  condition: string
  foil: boolean
  quantity: number
  seller: string
  maxPrice: number | null
  createdAt: Date
}

export async function getWantMatches(userId: string): Promise<WantMatch[]> {
  const wants = await prisma.wantListEntry.findMany({ where: { userId } })
  if (wants.length === 0) return []

  const listings = await prisma.listing.findMany({
    where: { active: true, userId: { not: userId } },
    include: {
      card: { select: { name: true, imageUri: true, scryfallId: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const wantMap = new Map<string, (typeof wants)[number]>(
    wants.map((w) => [normalizeCardName(w.cardName), w]),
  )

  return listings.flatMap((l) => {
    const want = wantMap.get(normalizeCardName(l.card.name))
    if (!want) return []
    const price = Number(l.price)
    if (want.maxPrice != null && price > Number(want.maxPrice)) return []
    return [{
      listingId: l.id,
      wantId: want.id,
      cardName: l.card.name,
      scryfallId: l.card.scryfallId,
      imageUri: l.card.imageUri,
      price,
      currency: l.currency,
      condition: l.condition,
      foil: l.foil,
      quantity: l.quantity,
      seller: l.user.email.split('@')[0],
      maxPrice: want.maxPrice != null ? Number(want.maxPrice) : null,
      createdAt: l.createdAt,
    }]
  })
}
