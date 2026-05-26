import type { ScryfallCard, ScryfallList, ScryfallError } from './types'

const BASE_URL = 'https://api.scryfall.com'
const RATE_LIMIT_MS = 100

let lastCallAt = 0

async function rateLimit() {
  const now = Date.now()
  const elapsed = now - lastCallAt
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed))
  }
  lastCallAt = Date.now()
}

async function scryfallFetch<T>(path: string): Promise<T> {
  await rateLimit()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  })
  const json = (await res.json()) as T | ScryfallError
  if (!res.ok) {
    const err = json as ScryfallError
    throw new ScryfallApiError(err.details ?? 'Scryfall request failed', res.status, err.code)
  }
  return json as T
}

export class ScryfallApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message)
    this.name = 'ScryfallApiError'
  }
}

export async function searchCards(query: string, page = 1): Promise<ScryfallList> {
  const params = new URLSearchParams({ q: query, page: String(page) })
  return scryfallFetch<ScryfallList>(`/cards/search?${params}`)
}

export async function getCardById(id: string): Promise<ScryfallCard> {
  return scryfallFetch<ScryfallCard>(`/cards/${id}`)
}

export function getCardImageUri(card: ScryfallCard): string {
  if (card.image_uris?.normal) return card.image_uris.normal
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal
  return ''
}
