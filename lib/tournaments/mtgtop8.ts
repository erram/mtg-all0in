import * as cheerio from 'cheerio'
import type { Format, ScrapedEvent, ScrapedDeck, MetaArchetype } from './types'

const BASE = 'https://www.mtgtop8.com'
const UA = 'MTGVault/1.0 (tournament stats; contact via site)'

const FORMAT_CODE: Record<Format, string> = {
  modern: 'MO',
  pioneer: 'PI',
  standard: 'ST',
  'duel-commander': 'EDH',
  pauper: 'PAU',
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`mtgtop8 fetch failed: ${res.status} ${url}`)
  return res.text()
}

function parseDate(raw: string): Date {
  // MTGTop8 dates: "DD/MM/YY" or "DD/MM/YYYY"
  const parts = raw.trim().split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y)
    const date = new Date(year, parseInt(m) - 1, parseInt(d))
    if (!isNaN(date.getTime())) return date
  }
  return new Date()
}

export async function scrapeFormatPage(format: Format): Promise<{
  events: ScrapedEvent[]
  meta: MetaArchetype[]
}> {
  const code = FORMAT_CODE[format]
  const html = await fetchHtml(`${BASE}/format?f=${code}`)
  const $ = cheerio.load(html)

  // --- Events ---
  // Rows: td.S14 (name + optional "@ location") | td (stars) | td.S12 (date DD/MM/YY)
  const events: ScrapedEvent[] = []
  const seen = new Set<string>()

  $('td.S14 a[href*="event?e="]').each((_, el) => {
    if ($(el).hasClass('und')) return // skip the duplicate "@ location" link

    const href = $(el).attr('href') ?? ''
    const idMatch = href.match(/[?&]e=(\d+)/)
    if (!idMatch) return

    const externalId = idMatch[1]
    if (seen.has(externalId)) return
    seen.add(externalId)

    const name = $(el).text().trim()
    if (!name) return

    const td = $(el).closest('td')
    const location = td.find('a.und').first().text().trim() || undefined
    const dateText = $(el).closest('tr').find('td').last().text().trim()

    events.push({
      source: 'mtgtop8',
      externalId,
      format,
      name,
      date: parseDate(dateText),
      location: location || undefined,
    })
  })

  // --- Meta breakdown (same page, div.hover_tr per archetype) ---
  const meta: MetaArchetype[] = []

  $('div.hover_tr').each((_, el) => {
    const archLink = $(el).find('a[href*="archetype"]').first()
    const name = archLink.text().trim()
    if (!name) return

    // S14 divs: [0] = name link, [1] = "X %" share, [2] = trend icon
    const s14 = $(el).find('div.S14')
    const shareText = s14.eq(1).text().replace('%', '').trim()
    const share = parseFloat(shareText)
    if (isNaN(share)) return

    const archHref = archLink.attr('href') ?? ''
    meta.push({
      name,
      share,
      sampleDeckUrl: archHref ? `${BASE}/${archHref.replace(/^\//, '')}` : undefined,
    })
  })

  return { events: events.slice(0, 30), meta: meta.slice(0, 25) }
}

export interface DeckList {
  mainboard: { name: string; qty: number }[]
  sideboard: { name: string; qty: number }[]
}

export async function scrapeDeckList(deckUrl: string): Promise<DeckList> {
  const html = await fetchHtml(deckUrl)
  const $ = cheerio.load(html)

  const mainboard: { name: string; qty: number }[] = []
  const sideboard: { name: string; qty: number }[] = []

  $('div.deck_line').each((_, el) => {
    const id = $(el).attr('id') ?? ''
    const isSb = id.startsWith('sb')
    const isMd = id.startsWith('md')
    if (!isMd && !isSb) return

    const name = $(el).find('span.L14').text().trim()
    if (!name) return

    const qty = parseInt($(el).text().trim()) || 1
    if (isSb) sideboard.push({ name, qty })
    else mainboard.push({ name, qty })
  })

  return { mainboard, sideboard }
}

export async function scrapePlayerCount(externalId: string, format: Format): Promise<number | undefined> {
  try {
    const code = FORMAT_CODE[format]
    const html = await fetchHtml(`${BASE}/event?e=${externalId}&f=${code}`)
    const $ = cheerio.load(html)
    let count: number | undefined
    $('div.S14').each((_, el) => {
      const m = $(el).text().match(/(\d+)\s+players/i)
      if (m) { count = parseInt(m[1]); return false as unknown as void }
    })
    return count
  } catch {
    return undefined
  }
}

export interface EventDeckScrapeResult {
  decks: ScrapedDeck[]
  playerCount: number | undefined
}

export async function scrapeEventDecks(externalId: string, format: Format): Promise<EventDeckScrapeResult> {
  const code = FORMAT_CODE[format]
  const html = await fetchHtml(`${BASE}/event?e=${externalId}&f=${code}`)
  const $ = cheerio.load(html)
  const decks: ScrapedDeck[] = []

  // Player count: text like "Duel Commander 56 players - 31/05/26"
  let playerCount: number | undefined
  $('div.S14').each((_, el) => {
    const m = $(el).text().match(/(\d+)\s+players/i)
    if (m) { playerCount = parseInt(m[1]); return false as unknown as void }
  })

  // Deck list panel: blue div containing one row per deck
  // Each row (div.chosen_tr or div.hover_tr) has a flex container with:
  //   child[0] width:42px  → rank text ("1", "3-4", "5-8" …)
  //   child[1] width:80px  → archetype thumbnail (ignore)
  //   child[2] flex:1      → deck name link + player name link
  const container = $('div[style*="background:#00528b"]').first()
  container.find('div.chosen_tr, div.hover_tr').each((_, row) => {
    const flexRow = $(row).find('div[style*="display:flex"]').first()
    const children = flexRow.children().toArray()
    if (children.length < 3) return

    const rankText = $(children[0]).text().trim()
    const rank = parseInt(rankText.split('-')[0]) || undefined

    const infoDiv = $(children[2])
    const deckAnchor = infoDiv.find('a').first()
    const archetype = deckAnchor.text().trim()
    const href = deckAnchor.attr('href') ?? ''
    if (!archetype || !href.includes('d=')) return

    const playerName = infoDiv.find('a').eq(1).text().trim() || undefined

    decks.push({
      rank,
      playerName,
      archetype,
      externalUrl: `${BASE}/event${href.startsWith('?') ? href : '/' + href}`,
    })
  })

  return { decks, playerCount }
}
