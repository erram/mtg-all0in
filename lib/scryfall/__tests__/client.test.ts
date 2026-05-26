import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchCards, getCardById, getCardImageUri, ScryfallApiError } from '../client'
import type { ScryfallCard, ScryfallList } from '../types'

const mockCard: ScryfallCard = {
  object: 'card',
  id: 'abc-123',
  name: 'Lightning Bolt',
  set: 'lea',
  set_name: 'Limited Edition Alpha',
  collector_number: '161',
  oracle_text: 'Lightning Bolt deals 3 damage to any target.',
  image_uris: {
    small: 'https://cards.scryfall.io/small/abc.jpg',
    normal: 'https://cards.scryfall.io/normal/abc.jpg',
    large: 'https://cards.scryfall.io/large/abc.jpg',
    png: 'https://cards.scryfall.io/png/abc.png',
    art_crop: 'https://cards.scryfall.io/art_crop/abc.jpg',
    border_crop: 'https://cards.scryfall.io/border_crop/abc.jpg',
  },
  prices: { usd: '1.50', usd_foil: '3.00', usd_etched: null, eur: '1.20', eur_foil: null },
  scryfall_uri: 'https://scryfall.com/card/lea/161',
}

const mockList: ScryfallList = {
  object: 'list',
  total_cards: 1,
  has_more: false,
  data: [mockCard],
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('searchCards', () => {
  it('returns a list of cards on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockList,
      })
    )

    const result = await searchCards('lightning bolt')

    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('Lightning Bolt')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cards/search?'),
      expect.any(Object)
    )
  })

  it('includes the query and page in the request URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => mockList })
    )

    await searchCards('bolt', 2)

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(url).toContain('q=bolt')
    expect(url).toContain('page=2')
  })

  it('throws ScryfallApiError on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ object: 'error', code: 'not_found', status: 404, details: 'No cards found' }),
      })
    )

    await expect(searchCards('zzzzz')).rejects.toThrow(ScryfallApiError)
    await expect(searchCards('zzzzz')).rejects.toMatchObject({ status: 404 })
  })
})

describe('getCardById', () => {
  it('returns a single card by id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => mockCard })
    )

    const card = await getCardById('abc-123')

    expect(card.id).toBe('abc-123')
    expect(card.name).toBe('Lightning Bolt')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cards/abc-123'),
      expect.any(Object)
    )
  })

  it('throws ScryfallApiError on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ object: 'error', code: 'not_found', status: 404, details: 'Card not found' }),
      })
    )

    await expect(getCardById('bad-id')).rejects.toThrow(ScryfallApiError)
  })
})

describe('getCardImageUri', () => {
  it('returns normal image_uri when present', () => {
    expect(getCardImageUri(mockCard)).toBe('https://cards.scryfall.io/normal/abc.jpg')
  })

  it('falls back to first card face image when no top-level image_uris', () => {
    const dfc: ScryfallCard = {
      ...mockCard,
      image_uris: undefined,
      card_faces: [
        { name: 'Front', image_uris: { ...mockCard.image_uris!, normal: 'https://cards.scryfall.io/normal/front.jpg' } },
        { name: 'Back', image_uris: { ...mockCard.image_uris!, normal: 'https://cards.scryfall.io/normal/back.jpg' } },
      ],
    }
    expect(getCardImageUri(dfc)).toBe('https://cards.scryfall.io/normal/front.jpg')
  })

  it('returns empty string when no image available', () => {
    const noImg: ScryfallCard = { ...mockCard, image_uris: undefined, card_faces: undefined }
    expect(getCardImageUri(noImg)).toBe('')
  })
})
