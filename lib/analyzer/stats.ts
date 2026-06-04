import type { ScryfallCard } from '@/lib/scryfall/types'
import { getCardImageUri } from '@/lib/scryfall/client'

export interface CardEntry { card: ScryfallCard; qty: number }

export interface InteractionGroup { count: number; cards: string[] }

export interface ThemeResult {
  key: string
  label: string
  count: number   // number of cards contributing
  cards: string[]
}

export interface DeckStats {
  totalCards: number
  commander: { name: string; imageUri: string; oracleText: string } | null
  colorIdentity: string[]

  landCount: number
  spellCount: number

  avgManaValue: number
  curve: { cmc: number; count: number; cards: string[] }[]

  typeBreakdown: Record<string, number>

  interaction: {
    total: number
    removal: InteractionGroup
    counterspells: InteractionGroup
    discard: InteractionGroup
    boardwipes: InteractionGroup
    bounce: InteractionGroup
  }

  themes: ThemeResult[]
  synergyScore: number       // 0–100
  commanderSynergyScore: number | null  // 0–100, null if no commander
}

// ── Interaction patterns ─────────────────────────────────────────────────────

const REMOVAL = [
  /destroy target/i,
  /exile target (creature|permanent|nonland|artifact|enchantment|planeswalker)/i,
  /deals? \d+ damage to (target creature|any target|target creature or planeswalker)/i,
  /gets? -\d+\/-\d+/i,
  /put[s]? .{0,20}-1\/-1 counter/i,
  /target creature gets? -/i,
]

const COUNTERSPELLS = [
  /counter target spell/i,
  /counter target (creature|instant|sorcery|artifact|enchantment|noncreature|legendary) spell/i,
  /counter target activated or triggered ability/i,
  /counter that spell/i,
]

const DISCARD = [
  /target (player|opponent) discards?/i,
  /each (player|opponent) discards?/i,
  /opponent discards?/i,
]

const BOARDWIPES = [
  /destroy all/i,
  /exile all/i,
  /all creatures( that you don't control)? get -/i,
  /each creature deals damage to itself/i,
  /each player sacrifices/i,
  /sacrifice all/i,
]

const BOUNCE = [
  /return target (creature|permanent|nonland permanent|artifact|enchantment) to/i,
  /return all (creatures|permanents)/i,
  /put target .{0,30}on top of .{0,10}(its owner|their owner)/i,
]

function oracleText(card: ScryfallCard): string {
  return [card.oracle_text, ...(card.card_faces ?? []).map((f) => f.oracle_text ?? '')].join('\n')
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

// ── Theme patterns ────────────────────────────────────────────────────────────

const THEME_DEFS: { key: string; label: string; patterns: RegExp[] }[] = [
  { key: 'graveyard', label: 'Graveyard', patterns: [/from (your|a) graveyard/i, /\bmill\b/i, /reanimate/i, /\bdelve\b/i, /\bescape\b/i, /\bexploit\b/i, /\bundying\b/i, /\bpersist\b/i] },
  { key: 'tokens', label: 'Tokens', patterns: [/create [a\d].{0,20}token/i, /\bpopulate\b/i, /\bconvoke\b/i, /token (creature|copy)/i] },
  { key: 'blink', label: 'Blink / ETB', patterns: [/exile .{0,40}return .{0,40}battlefield/i, /\bflicker\b/i, /when(ever)? .{0,40}enters(?: the battlefield)?/i, /\bphase out\b/i] },
  { key: 'counters', label: '+1/+1 Counters', patterns: [/\+1\/\+1 counter/i, /\bproliferate\b/i, /\bevolve\b/i, /\badapt\b/i, /\bmodular\b/i, /\binfect\b/i, /\bgraft\b/i] },
  { key: 'artifacts', label: 'Artifacts', patterns: [/\bartifact\b/i, /\bequipment\b/i, /\bvehicle\b/i, /\bfabricate\b/i] },
  { key: 'enchantments', label: 'Enchantments', patterns: [/\benchant creature\b/i, /\baura\b/i, /enchantment (you|enters)/i, /\bsaga\b/i, /\bconstellat/i] },
  { key: 'sacrifice', label: 'Sacrifice', patterns: [/\bsacrifice\b/i, /when(ever)? .{0,30}dies/i, /\bmorbid\b/i, /\bthriving\b/i] },
  { key: 'draw', label: 'Card Draw', patterns: [/draw (a|two|three|\d+) card/i, /\bscry\b/i, /\bsurveil\b/i, /\bimpulse\b/i] },
  { key: 'ramp', label: 'Ramp', patterns: [/search your library for (a|up to \d) (basic |snow )?land/i, /\btreasure\b/i, /add \{[0-9WUBRG]/i, /additional land/i] },
  { key: 'lifegain', label: 'Lifegain', patterns: [/gain \d+ life/i, /you gain life/i, /\blifelink\b/i, /whenever you gain life/i] },
  { key: 'copy', label: 'Copy / Storm', patterns: [/\bstorm\b/i, /copy of (target|that)/i, /copy (that|it) \d+ time/i, /create a (token that's a )?copy/i] },
  { key: 'reanimator', label: 'Reanimator', patterns: [/return .{0,30}from .{0,10}graveyard.{0,20}battlefield/i, /\bredudant\b/i] },
  { key: 'spellslinger', label: 'Spellslinger', patterns: [/whenever you cast (an instant|a sorcery|a noncreature)/i, /magecraft/i, /\bstorm\b/i] },
]

// ── Main calculation ──────────────────────────────────────────────────────────

export function calculateStats(
  entries: CardEntry[],
  commanderName: string | null,
): DeckStats {
  const all = entries.flatMap(({ card, qty }) => Array(qty).fill(card) as ScryfallCard[])
  const totalCards = all.length

  const isLand = (c: ScryfallCard) => c.type_line?.includes('Land')

  const lands = entries.filter(({ card }) => isLand(card))
  const spells = entries.filter(({ card }) => !isLand(card))

  const landCount = lands.reduce((s, { qty }) => s + qty, 0)
  const spellCount = spells.reduce((s, { qty }) => s + qty, 0)

  // Commander
  const commanderEntry = entries.find(
    ({ card }) => card.name.toLowerCase() === (commanderName ?? '').toLowerCase()
  )
  const commander = commanderEntry
    ? {
        name: commanderEntry.card.name,
        imageUri: getCardImageUri(commanderEntry.card),
        oracleText: oracleText(commanderEntry.card),
      }
    : null

  // Color identity
  const colorSet = new Set<string>()
  entries.forEach(({ card }) => card.color_identity?.forEach((c) => colorSet.add(c)))
  const colorIdentity = ['W', 'U', 'B', 'R', 'G'].filter((c) => colorSet.has(c))

  // Avg mana value + curve
  const nonLandSpells = spells.filter(({ card }) => card.cmc != null)
  const totalCmc = nonLandSpells.reduce((s, { card, qty }) => s + card.cmc * qty, 0)
  const nonLandCount = nonLandSpells.reduce((s, { qty }) => s + qty, 0)
  const avgManaValue = nonLandCount > 0 ? Math.round((totalCmc / nonLandCount) * 100) / 100 : 0

  const curveMap = new Map<number, { count: number; cards: string[] }>()
  for (const { card, qty } of nonLandSpells) {
    const cmc = Math.min(card.cmc, 7) // cap at 7+
    const existing = curveMap.get(cmc) ?? { count: 0, cards: [] }
    existing.count += qty
    if (!existing.cards.includes(card.name)) existing.cards.push(card.name)
    curveMap.set(cmc, existing)
  }
  const curve = Array.from({ length: 8 }, (_, i) => ({
    cmc: i,
    count: curveMap.get(i)?.count ?? 0,
    cards: curveMap.get(i)?.cards ?? [],
  }))

  // Type breakdown
  const typeBreakdown: Record<string, number> = {}
  for (const { card, qty } of entries) {
    const types = ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker', 'Battle', 'Land']
    for (const t of types) {
      if (card.type_line?.includes(t)) {
        typeBreakdown[t] = (typeBreakdown[t] ?? 0) + qty
        break
      }
    }
  }

  // Interaction
  function buildGroup(patterns: RegExp[]): InteractionGroup {
    const group: InteractionGroup = { count: 0, cards: [] }
    for (const { card, qty } of spells) {
      const text = oracleText(card)
      if (matchesAny(text, patterns)) {
        group.count += qty
        group.cards.push(card.name)
      }
    }
    return group
  }

  const removal = buildGroup(REMOVAL)
  const counterspells = buildGroup(COUNTERSPELLS)
  const discard = buildGroup(DISCARD)
  const boardwipes = buildGroup(BOARDWIPES)
  const bounce = buildGroup(BOUNCE)
  const interactionTotal = new Set([
    ...removal.cards, ...counterspells.cards,
    ...discard.cards, ...boardwipes.cards, ...bounce.cards,
  ]).size

  // Themes
  const themes: ThemeResult[] = []
  for (const def of THEME_DEFS) {
    const matching: string[] = []
    let count = 0
    for (const { card, qty } of spells) {
      if (matchesAny(oracleText(card), def.patterns)) {
        matching.push(card.name)
        count += qty
      }
    }
    if (count >= 2) {
      themes.push({ key: def.key, label: def.label, count, cards: matching })
    }
  }
  themes.sort((a, b) => b.count - a.count)

  // Synergy score: theme coherence (how concentrated the deck is around its top themes)
  const top3ThemeCards = new Set(themes.slice(0, 3).flatMap((t) => t.cards))
  const synergyScore = spellCount > 0
    ? Math.min(100, Math.round((top3ThemeCards.size / spellCount) * 100 * 1.5))
    : 0

  // Commander synergy: how many cards reference the commander's themes
  let commanderSynergyScore: number | null = null
  if (commander) {
    const cmdText = commander.oracleText.toLowerCase()
    const cmdThemePatterns = THEME_DEFS.filter(({ patterns }) =>
      patterns.some((p) => p.test(cmdText))
    )
    if (cmdThemePatterns.length > 0) {
      const cmdCards = new Set(cmdThemePatterns.flatMap((t) =>
        spells.filter(({ card }) => matchesAny(oracleText(card), t.patterns)).map(({ card }) => card.name)
      ))
      commanderSynergyScore = Math.min(100, Math.round((cmdCards.size / Math.max(spellCount, 1)) * 100 * 1.5))
    }
  }

  return {
    totalCards,
    commander,
    colorIdentity,
    landCount,
    spellCount,
    avgManaValue,
    curve,
    typeBreakdown,
    interaction: { total: interactionTotal, removal, counterspells, discard, boardwipes, bounce },
    themes: themes.slice(0, 6),
    synergyScore,
    commanderSynergyScore,
  }
}
