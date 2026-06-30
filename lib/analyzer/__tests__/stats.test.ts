import { describe, it, expect } from 'vitest'
import { calculateStats } from '@/lib/analyzer/stats'
import type { CardEntry } from '@/lib/analyzer/stats'
import type { ScryfallCard } from '@/lib/scryfall/types'

function makeCard(overrides: Partial<ScryfallCard> & { name: string }): ScryfallCard {
  return {
    object: 'card',
    id: `id-${overrides.name}`,
    set: 'tst',
    set_name: 'Test Set',
    collector_number: '1',
    oracle_text: '',
    cmc: 0,
    type_line: 'Instant',
    color_identity: [],
    keywords: [],
    image_uris: {
      small: 'https://cards.scryfall.io/small/x.jpg',
      normal: 'https://cards.scryfall.io/normal/x.jpg',
      large: 'https://cards.scryfall.io/large/x.jpg',
      png: 'https://cards.scryfall.io/png/x.png',
      art_crop: 'https://cards.scryfall.io/art_crop/x.jpg',
      border_crop: 'https://cards.scryfall.io/border_crop/x.jpg',
    },
    prices: { usd: null, usd_foil: null, usd_etched: null, eur: null, eur_foil: null },
    scryfall_uri: 'https://scryfall.com/card/tst/1',
    ...overrides,
  }
}

function entry(card: ScryfallCard, qty = 1): CardEntry {
  return { card, qty }
}

describe('calculateStats - totals and land/spell counting', () => {
  it('counts total cards by quantity', () => {
    const stats = calculateStats(
      [
        entry(makeCard({ name: 'Forest', type_line: 'Basic Land — Forest' }), 10),
        entry(makeCard({ name: 'Bolt', type_line: 'Instant', cmc: 1 }), 4),
      ],
      null
    )
    expect(stats.totalCards).toBe(14)
  })

  it('separates lands from spells', () => {
    const stats = calculateStats(
      [
        entry(makeCard({ name: 'Forest', type_line: 'Basic Land — Forest' }), 12),
        entry(makeCard({ name: 'Bolt', type_line: 'Instant', cmc: 1 }), 3),
        entry(makeCard({ name: 'Bear', type_line: 'Creature — Bear', cmc: 2 }), 2),
      ],
      null
    )
    expect(stats.landCount).toBe(12)
    expect(stats.spellCount).toBe(5)
  })
})

describe('calculateStats - mana value and curve', () => {
  it('computes average mana value excluding lands, rounded to 2 decimals', () => {
    const stats = calculateStats(
      [
        entry(makeCard({ name: 'A', type_line: 'Instant', cmc: 1 }), 1),
        entry(makeCard({ name: 'B', type_line: 'Sorcery', cmc: 2 }), 1),
        entry(makeCard({ name: 'C', type_line: 'Creature — X', cmc: 3 }), 1),
        entry(makeCard({ name: 'Forest', type_line: 'Land', cmc: 0 }), 5),
      ],
      null
    )
    // (1 + 2 + 3) / 3 = 2
    expect(stats.avgManaValue).toBe(2)
  })

  it('rounds avg mana value to two decimal places', () => {
    const stats = calculateStats(
      [
        entry(makeCard({ name: 'A', type_line: 'Instant', cmc: 1 }), 1),
        entry(makeCard({ name: 'B', type_line: 'Instant', cmc: 2 }), 1),
        entry(makeCard({ name: 'C', type_line: 'Instant', cmc: 2 }), 1),
      ],
      null
    )
    // 5 / 3 = 1.666... -> 1.67
    expect(stats.avgManaValue).toBe(1.67)
  })

  it('returns avg mana value 0 when there are no non-land spells', () => {
    const stats = calculateStats(
      [entry(makeCard({ name: 'Forest', type_line: 'Land', cmc: 0 }), 5)],
      null
    )
    expect(stats.avgManaValue).toBe(0)
  })

  it('builds an 8-bucket curve (0..7) with counts by quantity', () => {
    const stats = calculateStats(
      [
        entry(makeCard({ name: 'OneDrop', type_line: 'Instant', cmc: 1 }), 4),
        entry(makeCard({ name: 'ThreeDrop', type_line: 'Creature — X', cmc: 3 }), 2),
      ],
      null
    )
    expect(stats.curve).toHaveLength(8)
    expect(stats.curve.map((c) => c.cmc)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(stats.curve[1].count).toBe(4)
    expect(stats.curve[1].cards).toEqual(['OneDrop'])
    expect(stats.curve[3].count).toBe(2)
    expect(stats.curve[0].count).toBe(0)
  })

  it('caps high mana values into the 7+ bucket', () => {
    const stats = calculateStats(
      [
        entry(makeCard({ name: 'Eldrazi', type_line: 'Creature — Eldrazi', cmc: 10 }), 1),
        entry(makeCard({ name: 'BigSpell', type_line: 'Sorcery', cmc: 8 }), 2),
      ],
      null
    )
    expect(stats.curve[7].count).toBe(3)
    expect(stats.curve[7].cards.sort()).toEqual(['BigSpell', 'Eldrazi'])
  })
})

describe('calculateStats - color identity', () => {
  it('collects color identity in WUBRG order', () => {
    const stats = calculateStats(
      [
        entry(makeCard({ name: 'A', color_identity: ['G', 'W'] })),
        entry(makeCard({ name: 'B', color_identity: ['B'] })),
      ],
      null
    )
    expect(stats.colorIdentity).toEqual(['W', 'B', 'G'])
  })
})

describe('calculateStats - type breakdown', () => {
  it('counts the first matching type per card by quantity', () => {
    const stats = calculateStats(
      [
        entry(makeCard({ name: 'Bear', type_line: 'Creature — Bear', cmc: 2 }), 3),
        entry(makeCard({ name: 'Bolt', type_line: 'Instant', cmc: 1 }), 2),
        entry(makeCard({ name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0 }), 10),
      ],
      null
    )
    expect(stats.typeBreakdown).toEqual({ Creature: 3, Instant: 2, Land: 10 })
  })

  it('uses the first type in priority order for multi-type cards', () => {
    // Artifact Creature -> Creature wins (Creature is earlier in the list)
    const stats = calculateStats(
      [
        entry(
          makeCard({ name: 'Construct', type_line: 'Artifact Creature — Construct', cmc: 4 }),
          1
        ),
      ],
      null
    )
    expect(stats.typeBreakdown).toEqual({ Creature: 1 })
  })
})

describe('calculateStats - interaction detection', () => {
  it('detects removal via "destroy target" and "deals N damage to any target"', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({
            name: 'Murder',
            type_line: 'Instant',
            cmc: 3,
            oracle_text: 'Destroy target creature.',
          })
        ),
        entry(
          makeCard({
            name: 'Bolt',
            type_line: 'Instant',
            cmc: 1,
            oracle_text: 'Lightning Bolt deals 3 damage to any target.',
          })
        ),
      ],
      null
    )
    expect(stats.interaction.removal.count).toBe(2)
    expect(stats.interaction.removal.cards.sort()).toEqual(['Bolt', 'Murder'])
  })

  it('detects counterspells via "counter target spell"', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({
            name: 'Counterspell',
            type_line: 'Instant',
            cmc: 2,
            oracle_text: 'Counter target spell.',
          })
        ),
      ],
      null
    )
    expect(stats.interaction.counterspells.count).toBe(1)
    expect(stats.interaction.counterspells.cards).toEqual(['Counterspell'])
  })

  it('detects discard via "target player discards"', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({
            name: 'Mind Rot',
            type_line: 'Sorcery',
            cmc: 3,
            oracle_text: 'Target player discards two cards.',
          })
        ),
      ],
      null
    )
    expect(stats.interaction.discard.count).toBe(1)
  })

  it('detects board wipes via "destroy all"', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({
            name: 'Wrath',
            type_line: 'Sorcery',
            cmc: 4,
            oracle_text: 'Destroy all creatures.',
          })
        ),
      ],
      null
    )
    expect(stats.interaction.boardwipes.count).toBe(1)
  })

  it('detects bounce via "return target creature to"', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({
            name: 'Boomerang',
            type_line: 'Instant',
            cmc: 2,
            oracle_text: 'Return target permanent to its owner’s hand.',
          })
        ),
      ],
      null
    )
    expect(stats.interaction.bounce.count).toBe(1)
  })

  it('counts interaction total as unique cards across all groups', () => {
    // A card matching two groups should be counted once in total.
    const wrath = makeCard({
      name: 'Damnation',
      type_line: 'Sorcery',
      cmc: 4,
      oracle_text: 'Destroy all creatures. They can’t be regenerated.',
    })
    const bolt = makeCard({
      name: 'Bolt',
      type_line: 'Instant',
      cmc: 1,
      oracle_text: 'Bolt deals 3 damage to any target.',
    })
    const stats = calculateStats([entry(wrath), entry(bolt)], null)
    expect(stats.interaction.boardwipes.count).toBe(1)
    expect(stats.interaction.removal.count).toBe(1)
    expect(stats.interaction.total).toBe(2)
  })
})

describe('calculateStats - theme detection', () => {
  it('detects a theme only when at least two cards (by qty) match', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({
            name: 'Divination',
            type_line: 'Sorcery',
            cmc: 3,
            oracle_text: 'Draw two cards.',
          })
        ),
        entry(
          makeCard({
            name: 'Opt',
            type_line: 'Instant',
            cmc: 1,
            oracle_text: 'Scry 1. Draw a card.',
          })
        ),
      ],
      null
    )
    const draw = stats.themes.find((t) => t.key === 'draw')
    expect(draw).toBeDefined()
    expect(draw!.count).toBe(2)
  })

  it('does not surface a theme matched by only one card', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({
            name: 'Divination',
            type_line: 'Sorcery',
            cmc: 3,
            oracle_text: 'Draw two cards.',
          })
        ),
        entry(
          makeCard({ name: 'Bear', type_line: 'Creature — Bear', cmc: 2, oracle_text: 'Vanilla.' })
        ),
      ],
      null
    )
    expect(stats.themes.find((t) => t.key === 'draw')).toBeUndefined()
  })

  it('counts theme by quantity, so a single 2-copy card qualifies', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({
            name: 'Divination',
            type_line: 'Sorcery',
            cmc: 3,
            oracle_text: 'Draw two cards.',
          }),
          2
        ),
      ],
      null
    )
    const draw = stats.themes.find((t) => t.key === 'draw')
    expect(draw).toBeDefined()
    expect(draw!.count).toBe(2)
    expect(draw!.cards).toEqual(['Divination'])
  })

  it('sorts themes by count descending and caps at 6', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({ name: 'Draw1', type_line: 'Sorcery', cmc: 2, oracle_text: 'Draw a card.' }),
          5
        ),
        entry(
          makeCard({
            name: 'Token1',
            type_line: 'Sorcery',
            cmc: 2,
            oracle_text: 'Create a 1/1 token.',
          }),
          2
        ),
      ],
      null
    )
    expect(stats.themes.length).toBeLessThanOrEqual(6)
    expect(stats.themes[0].key).toBe('draw')
    expect(stats.themes[0].count).toBeGreaterThanOrEqual(stats.themes[1]?.count ?? 0)
  })
})

describe('calculateStats - synergy score', () => {
  it('is 0 when there are no spells', () => {
    const stats = calculateStats(
      [entry(makeCard({ name: 'Forest', type_line: 'Land', cmc: 0 }), 5)],
      null
    )
    expect(stats.synergyScore).toBe(0)
  })

  it('is a 0-100 value derived from top-theme concentration', () => {
    // 2 draw spells out of 2 spells -> top3 cards = 2, spellCount = 2
    // round(2/2 * 100 * 1.5) = 150 -> capped at 100
    const stats = calculateStats(
      [
        entry(
          makeCard({ name: 'Draw1', type_line: 'Sorcery', cmc: 2, oracle_text: 'Draw a card.' })
        ),
        entry(
          makeCard({ name: 'Draw2', type_line: 'Sorcery', cmc: 2, oracle_text: 'Draw two cards.' })
        ),
      ],
      null
    )
    expect(stats.synergyScore).toBe(100)
    expect(stats.synergyScore).toBeGreaterThanOrEqual(0)
    expect(stats.synergyScore).toBeLessThanOrEqual(100)
  })
})

describe('calculateStats - commander', () => {
  it('returns null commander and null commanderSynergyScore when name is null', () => {
    const stats = calculateStats(
      [
        entry(
          makeCard({ name: 'Bolt', type_line: 'Instant', cmc: 1, oracle_text: 'Draw a card.' })
        ),
      ],
      null
    )
    expect(stats.commander).toBeNull()
    expect(stats.commanderSynergyScore).toBeNull()
  })

  it('builds commander object (case-insensitive match) with image and oracle text', () => {
    const cmd = makeCard({
      name: 'Krenko, Mob Boss',
      type_line: 'Legendary Creature — Goblin',
      cmc: 4,
      oracle_text: 'Create a number of 1/1 red Goblin creature tokens.',
    })
    const stats = calculateStats([entry(cmd)], 'krenko, mob boss')
    expect(stats.commander).not.toBeNull()
    expect(stats.commander!.name).toBe('Krenko, Mob Boss')
    expect(stats.commander!.imageUri).toBe('https://cards.scryfall.io/normal/x.jpg')
    expect(stats.commander!.oracleText).toContain('Goblin creature tokens')
  })

  it('computes commander synergy when deck cards share the commander themes', () => {
    const cmd = makeCard({
      name: 'Token Lord',
      type_line: 'Legendary Creature — X',
      cmc: 4,
      oracle_text: 'Create a 1/1 token. Whenever a token enters, draw nothing.',
    })
    const tokenMaker1 = makeCard({
      name: 'Maker1',
      type_line: 'Sorcery',
      cmc: 3,
      oracle_text: 'Create a 2/2 token.',
    })
    const tokenMaker2 = makeCard({
      name: 'Maker2',
      type_line: 'Sorcery',
      cmc: 4,
      oracle_text: 'Create a 1/1 token copy.',
    })
    const stats = calculateStats([entry(cmd), entry(tokenMaker1), entry(tokenMaker2)], 'Token Lord')
    expect(stats.commanderSynergyScore).not.toBeNull()
    expect(stats.commanderSynergyScore!).toBeGreaterThan(0)
    expect(stats.commanderSynergyScore!).toBeLessThanOrEqual(100)
  })

  it('leaves commanderSynergyScore null when the commander matches no themes', () => {
    const cmd = makeCard({
      name: 'Vanilla Boss',
      type_line: 'Legendary Creature — X',
      cmc: 4,
      oracle_text: 'This creature has no abilities of note.',
    })
    const stats = calculateStats([entry(cmd)], 'Vanilla Boss')
    expect(stats.commander).not.toBeNull()
    expect(stats.commanderSynergyScore).toBeNull()
  })
})
