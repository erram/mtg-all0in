import type { ScryfallCard, ScryfallList, ScryfallError } from './types'

const BASE_URL = 'https://api.scryfall.com'
const RATE_LIMIT_MS = 100
const UA = 'MTGVault/1.0 (mtg-trading-platform; https://github.com/erram/mtg-all0in)'

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
    headers: { Accept: 'application/json', 'User-Agent': UA },
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

export async function getCardByName(name: string): Promise<ScryfallCard> {
  const params = new URLSearchParams({ fuzzy: name })
  return scryfallFetch<ScryfallCard>(`/cards/named?${params}`)
}

export async function getCardsByNames(names: string[]): Promise<Map<string, ScryfallCard>> {
  const CHUNK = 75
  const result = new Map<string, ScryfallCard>()
  for (let i = 0; i < names.length; i += CHUNK) {
    await rateLimit()
    const chunk = names.slice(i, i + CHUNK)
    const res = await fetch(`${BASE_URL}/cards/collection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ identifiers: chunk.map((n) => ({ name: n })) }),
      next: { revalidate: 0 },
    })
    if (!res.ok) continue
    const json = (await res.json()) as { data: ScryfallCard[]; not_found: unknown[] }
    for (const card of json.data) {
      result.set(card.name.toLowerCase(), card)
      // DFC names are "Front // Back" — also index by front face alone
      if (card.name.includes(' // ')) {
        result.set(card.name.split(' // ')[0].toLowerCase(), card)
      }
    }
  }
  return result
}

export function getCardImageUri(card: ScryfallCard): string {
  if (card.image_uris?.normal) return card.image_uris.normal
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal
  return ''
}
