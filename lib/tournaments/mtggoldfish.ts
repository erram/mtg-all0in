import * as cheerio from 'cheerio'
import type { Format, MetaArchetype } from './types'

const BASE = 'https://www.mtggoldfish.com'
const UA = 'MTGVault/1.0 (tournament stats; contact via site)'

const FORMAT_SLUG: Partial<Record<Format, string>> = {
  modern: 'modern',
  pioneer: 'pioneer',
  standard: 'standard',
  'duel-commander': 'duel_commander',
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`mtggoldfish fetch failed: ${res.status} ${url}`)
  return res.text()
}

export async function scrapeMetaSnapshot(format: Format): Promise<MetaArchetype[]> {
  const slug = FORMAT_SLUG[format]
  if (!slug) return []

  const html = await fetchHtml(`${BASE}/metagame/${slug}`)
  const $ = cheerio.load(html)
  const archetypes: MetaArchetype[] = []

  // MTGGoldfish uses archetype tiles: .archetype-tile per deck
  $('.archetype-tile').each((_, el) => {
    const nameAnchor = $(el).find('.archetype-tile-title a').first()
    const name = nameAnchor.text().trim()
    if (!name) return

    const shareRaw = $(el).find('.metagame-percentage .archetype-tile-statistic-value').first().text()
    const shareMatch = shareRaw.match(/([\d.]+)%/)
    if (!shareMatch) return
    const share = parseFloat(shareMatch[1])

    const href = nameAnchor.attr('href') ?? ''
    // Strip #online/#paper fragment, keep base archetype URL
    const sampleDeckUrl = href ? `${BASE}${href.split('#')[0]}` : undefined

    archetypes.push({ name, share, sampleDeckUrl })
  })

  return archetypes.slice(0, 20)
}
