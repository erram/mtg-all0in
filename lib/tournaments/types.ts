export type Format = 'modern' | 'pioneer' | 'standard' | 'duel-commander' | 'pauper'

export const FORMATS: Format[] = ['modern', 'pioneer', 'standard', 'duel-commander', 'pauper']

export const FORMAT_LABELS: Record<Format, string> = {
  modern: 'Modern',
  pioneer: 'Pioneer',
  standard: 'Standard',
  'duel-commander': 'Duel Commander',
  pauper: 'Pauper',
}

export interface ScrapedEvent {
  source: string
  externalId: string
  format: Format
  name: string
  date: Date
  location?: string
  playerCount?: number
}

export interface ScrapedDeck {
  rank?: number
  playerName?: string
  archetype?: string
  colors?: string
  externalUrl?: string
}

export interface MetaArchetype {
  name: string
  share: number
  colors?: string
  sampleDeckUrl?: string
}
