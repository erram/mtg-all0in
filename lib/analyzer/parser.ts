export interface ParsedCard {
  name: string
  qty: number
  section: 'main' | 'sideboard' | 'commander'
}

// Supports MTGA ("4 Lightning Bolt (M21) 170"), MTGO ("4 Lightning Bolt"),
// and Commander blocks ("Commander\n1 Lumra...")
export function parseDecklist(raw: string): ParsedCard[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const cards: ParsedCard[] = []
  let section: ParsedCard['section'] = 'main'

  for (const line of lines) {
    const lower = line.toLowerCase()

    if (lower === 'commander' || lower === 'commander:') { section = 'commander'; continue }
    if (lower === 'deck' || lower === 'maindeck' || lower === 'main deck') { section = 'main'; continue }
    if (lower === 'sideboard' || lower === 'sideboard:' || lower === 'sb:') { section = 'sideboard'; continue }
    if (line.startsWith('//')) continue // comment lines

    // Match: "4 Card Name (SET) 123" or "4 Card Name"
    const m = line.match(/^(\d+)\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?$/)
    if (!m) continue

    const qty = parseInt(m[1])
    const name = m[2].trim()
    if (!name || qty < 1) continue

    cards.push({ name, qty, section })
  }

  return cards
}

export function detectCommander(cards: ParsedCard[]): string | null {
  const cmdSection = cards.find((c) => c.section === 'commander')
  if (cmdSection) return cmdSection.name
  // Fallback: singleton non-land cards are likely the commander
  const singletons = cards.filter((c) => c.section === 'main' && c.qty === 1)
  if (singletons.length === 1) return singletons[0].name
  return null
}
