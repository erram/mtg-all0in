export interface ScryfallImageUris {
  small: string
  normal: string
  large: string
  png: string
  art_crop: string
  border_crop: string
}

export interface ScryfallPrices {
  usd: string | null
  usd_foil: string | null
  usd_etched: string | null
  eur: string | null
  eur_foil: string | null
}

export interface ScryfallCard {
  object: 'card'
  id: string
  name: string
  set: string
  set_name: string
  collector_number: string
  oracle_text?: string
  mana_cost?: string
  cmc: number
  type_line: string
  colors?: string[]
  color_identity: string[]
  keywords: string[]
  image_uris?: ScryfallImageUris
  card_faces?: Array<{
    name: string
    oracle_text?: string
    mana_cost?: string
    type_line?: string
    image_uris?: ScryfallImageUris
  }>
  prices: ScryfallPrices
  scryfall_uri: string
}

export interface ScryfallList {
  object: 'list'
  total_cards: number
  has_more: boolean
  next_page?: string
  data: ScryfallCard[]
}

export interface ScryfallError {
  object: 'error'
  code: string
  status: number
  details: string
}
