import { parseDecklist, detectCommander } from '@/lib/analyzer/parser'

describe('parseDecklist', () => {
  it('parses MTGA format with set code and collector number', () => {
    const result = parseDecklist('4 Lightning Bolt (M21) 170')
    expect(result).toEqual([{ name: 'Lightning Bolt', qty: 4, section: 'main' }])
  })

  it('parses MTGO format without set info', () => {
    const result = parseDecklist('4 Lightning Bolt')
    expect(result).toEqual([{ name: 'Lightning Bolt', qty: 4, section: 'main' }])
  })

  it('parses qty correctly across multiple lines', () => {
    const result = parseDecklist('1 Sol Ring\n10 Forest\n3 Counterspell')
    expect(result).toEqual([
      { name: 'Sol Ring', qty: 1, section: 'main' },
      { name: 'Forest', qty: 10, section: 'main' },
      { name: 'Counterspell', qty: 3, section: 'main' },
    ])
  })

  it('assigns cards under a Commander section header', () => {
    const result = parseDecklist('Commander\n1 Atraxa, Praetors\' Voice')
    expect(result).toEqual([
      { name: "Atraxa, Praetors' Voice", qty: 1, section: 'commander' },
    ])
  })

  it('handles Commander section header with trailing colon', () => {
    const result = parseDecklist('Commander:\n1 Lumra, Bellow of the Woods')
    expect(result[0].section).toBe('commander')
  })

  it('switches sections: commander then deck then sideboard', () => {
    const raw = [
      'Commander',
      '1 Krenko, Mob Boss',
      'Deck',
      '4 Goblin Guide',
      'Sideboard',
      '2 Pyroblast',
    ].join('\n')
    const result = parseDecklist(raw)
    expect(result).toEqual([
      { name: 'Krenko, Mob Boss', qty: 1, section: 'commander' },
      { name: 'Goblin Guide', qty: 4, section: 'main' },
      { name: 'Pyroblast', qty: 2, section: 'sideboard' },
    ])
  })

  it('recognizes Maindeck and Main Deck headers', () => {
    expect(parseDecklist('Maindeck\n2 Island')[0].section).toBe('main')
    expect(parseDecklist('Main Deck\n2 Island')[0].section).toBe('main')
  })

  it('recognizes Sideboard variants (Sideboard:, SB:)', () => {
    expect(parseDecklist('Sideboard:\n1 Duress')[0].section).toBe('sideboard')
    expect(parseDecklist('SB:\n1 Duress')[0].section).toBe('sideboard')
  })

  it('section headers are case-insensitive', () => {
    const result = parseDecklist('COMMANDER\n1 Niv-Mizzet')
    expect(result[0].section).toBe('commander')
  })

  it('skips comment lines starting with //', () => {
    const result = parseDecklist('// my deck\n4 Llanowar Elves\n// end')
    expect(result).toEqual([{ name: 'Llanowar Elves', qty: 4, section: 'main' }])
  })

  it('skips blank and whitespace-only lines', () => {
    const result = parseDecklist('\n   \n4 Brainstorm\n\n')
    expect(result).toEqual([{ name: 'Brainstorm', qty: 4, section: 'main' }])
  })

  it('skips malformed lines without a leading quantity', () => {
    const result = parseDecklist('Lightning Bolt\nsome random text\n2 Shock')
    expect(result).toEqual([{ name: 'Shock', qty: 2, section: 'main' }])
  })

  it('skips lines with qty of 0', () => {
    const result = parseDecklist('0 Forest\n1 Plains')
    expect(result).toEqual([{ name: 'Plains', qty: 1, section: 'main' }])
  })

  it('trims surrounding whitespace from lines', () => {
    const result = parseDecklist('   2 Opt   ')
    expect(result).toEqual([{ name: 'Opt', qty: 2, section: 'main' }])
  })

  it('returns an empty array for empty input', () => {
    expect(parseDecklist('')).toEqual([])
  })

  it('keeps set-code suffix only when followed by a number (treats otherwise as name)', () => {
    // "(FOO)" without a trailing number is part of the name per the regex.
    const result = parseDecklist('1 Weird Card (FOO)')
    expect(result).toEqual([{ name: 'Weird Card (FOO)', qty: 1, section: 'main' }])
  })
})

describe('detectCommander', () => {
  it('detects commander from an explicit Commander section', () => {
    const cards = parseDecklist('Commander\n1 Krenko, Mob Boss\nDeck\n4 Goblin Guide')
    expect(detectCommander(cards)).toBe('Krenko, Mob Boss')
  })

  it('falls back to a single main-section singleton', () => {
    const cards = parseDecklist('1 Atraxa\n10 Forest\n4 Llanowar Elves')
    expect(detectCommander(cards)).toBe('Atraxa')
  })

  it('returns null when there are multiple singletons and no commander section', () => {
    const cards = parseDecklist('1 Atraxa\n1 Niv-Mizzet\n10 Forest')
    expect(detectCommander(cards)).toBeNull()
  })

  it('returns null when there are no singletons and no commander section', () => {
    const cards = parseDecklist('4 Goblin Guide\n10 Mountain')
    expect(detectCommander(cards)).toBeNull()
  })

  it('returns null for an empty card list', () => {
    expect(detectCommander([])).toBeNull()
  })

  it('prefers commander section even when main-section singletons exist', () => {
    const cards = parseDecklist('Commander\n1 The Boss\nDeck\n1 Lone Card\n4 Forest')
    expect(detectCommander(cards)).toBe('The Boss')
  })

  it('ignores sideboard singletons in the fallback', () => {
    const cards = parseDecklist('1 Atraxa\n10 Forest\nSideboard\n1 Duress')
    expect(detectCommander(cards)).toBe('Atraxa')
  })
})
