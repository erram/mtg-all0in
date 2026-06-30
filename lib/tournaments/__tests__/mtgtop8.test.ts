import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  scrapeFormatPage,
  scrapeEventDecks,
  scrapePlayerCount,
  scrapeDeckList,
} from '../mtgtop8'

/**
 * The source decodes responses via `res.arrayBuffer()` + TextDecoder('iso-8859-1').
 * So our mock must return a Latin-1-encoded ArrayBuffer and `ok: true`.
 */
function latin1Bytes(html: string): ArrayBuffer {
  const bytes = new Uint8Array(html.length)
  for (let i = 0; i < html.length; i++) {
    bytes[i] = html.charCodeAt(i) & 0xff
  }
  return bytes.buffer
}

function mockFetchHtml(html: string, encoder: (h: string) => ArrayBuffer = latin1Bytes) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => encoder(html),
    })
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('scrapeFormatPage', () => {
  const formatHtml = `
    <table>
      <tr>
        <td class="S14">
          <a href="event?e=12345&f=MO">Modern Challenge</a>
          <a class="und" href="event?e=12345&f=MO">@ Online</a>
        </td>
        <td><img src="star.png"></td>
        <td class="S12">31/05/26</td>
      </tr>
      <tr>
        <td class="S14">
          <a href="event?e=67890&f=MO">Regional Championship</a>
        </td>
        <td><img src="star.png"></td>
        <td class="S12">01/06/2026</td>
      </tr>
    </table>
    <div class="hover_tr">
      <div><a href="archetype?a=99&f=MO">Izzet Murktide</a></div>
      <div class="S14"><a href="archetype?a=99&f=MO">Izzet Murktide</a></div>
      <div class="S14">18 %</div>
      <div class="S14"><img src="trend.png"></div>
    </div>
    <div class="hover_tr">
      <div><a href="archetype?a=100&f=MO">Amulet Titan</a></div>
      <div class="S14"><a href="archetype?a=100&f=MO">Amulet Titan</a></div>
      <div class="S14">7 %</div>
      <div class="S14"><img src="trend.png"></div>
    </div>
  `

  it('parses event rows (name, externalId, date) and dedupes the "@ location" link', async () => {
    mockFetchHtml(formatHtml)
    const { events } = await scrapeFormatPage('modern')

    expect(events).toHaveLength(2)

    const first = events[0]
    expect(first.name).toBe('Modern Challenge')
    expect(first.externalId).toBe('12345')
    expect(first.format).toBe('modern')
    expect(first.source).toBe('mtgtop8')
    // 31/05/26 → 31 May 2026
    expect(first.date.getFullYear()).toBe(2026)
    expect(first.date.getMonth()).toBe(4) // May (0-indexed)
    expect(first.date.getDate()).toBe(31)

    const second = events[1]
    expect(second.name).toBe('Regional Championship')
    expect(second.externalId).toBe('67890')
    // 01/06/2026 4-digit year path
    expect(second.date.getFullYear()).toBe(2026)
    expect(second.date.getMonth()).toBe(5) // June
  })

  it('extracts the location from the "@ ..." und link', async () => {
    mockFetchHtml(formatHtml)
    const { events } = await scrapeFormatPage('modern')
    expect(events[0].location).toBe('@ Online')
    expect(events[1].location).toBeUndefined()
  })

  it('parses meta archetypes with name, share, and sample deck URL', async () => {
    mockFetchHtml(formatHtml)
    const { meta } = await scrapeFormatPage('modern')

    expect(meta).toHaveLength(2)
    expect(meta[0]).toMatchObject({ name: 'Izzet Murktide', share: 18 })
    expect(meta[0].sampleDeckUrl).toBe('https://www.mtgtop8.com/archetype?a=99&f=MO')
    expect(meta[1]).toMatchObject({ name: 'Amulet Titan', share: 7 })
  })

  it('requests the correct format-coded URL', async () => {
    mockFetchHtml(formatHtml)
    await scrapeFormatPage('pauper')
    expect(fetch).toHaveBeenCalledWith(
      'https://www.mtgtop8.com/format?f=PAU',
      expect.any(Object)
    )
  })

  it('decodes ISO-8859-1 accented characters correctly', async () => {
    // "Compétitif" — é is 0xE9 in Latin-1.
    const accentedHtml = `
      <table>
        <tr>
          <td class="S14">
            <a href="event?e=555&f=EDH">Tournoi Compétitif</a>
          </td>
          <td class="S12">10/02/26</td>
        </tr>
      </table>
    `
    mockFetchHtml(accentedHtml)
    const { events } = await scrapeFormatPage('duel-commander')
    expect(events[0].name).toBe('Tournoi Compétitif')
  })
})

describe('scrapePlayerCount', () => {
  it('extracts the player count from an S14 div', async () => {
    const html = `<div class="S14">Modern Challenge 56 players - 31/05/26</div>`
    mockFetchHtml(html)
    const count = await scrapePlayerCount('12345', 'modern')
    expect(count).toBe(56)
  })

  it('returns undefined when no player count is present', async () => {
    mockFetchHtml(`<div class="S14">No info here</div>`)
    const count = await scrapePlayerCount('12345', 'modern')
    expect(count).toBeUndefined()
  })

  it('returns undefined when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, arrayBuffer: async () => latin1Bytes('') })
    )
    const count = await scrapePlayerCount('12345', 'modern')
    expect(count).toBeUndefined()
  })
})

describe('scrapeEventDecks', () => {
  const eventHtml = `
    <div class="S14">Duel Commander 56 players - 31/05/26</div>
    <div style="background:#00528b">
      <div class="chosen_tr">
        <div style="display:flex">
          <div style="width:42px">1</div>
          <div style="width:80px"><img src="thumb.png"></div>
          <div style="flex:1">
            <a href="?e=12345&d=111&f=EDH">Izzet Murktide</a>
            <a href="player?p=alice">Alice</a>
          </div>
        </div>
      </div>
      <div class="hover_tr">
        <div style="display:flex">
          <div style="width:42px">3-4</div>
          <div style="width:80px"><img src="thumb.png"></div>
          <div style="flex:1">
            <a href="?e=12345&d=222&f=EDH">Amulet Titan</a>
            <a href="player?p=bob">Bob</a>
          </div>
        </div>
      </div>
      <div class="hover_tr">
        <div style="display:flex">
          <div style="width:42px">5-8</div>
          <div style="width:80px"><img src="thumb.png"></div>
          <div style="flex:1">
            <a href="other">Not A Deck</a>
          </div>
        </div>
      </div>
    </div>
  `

  it('parses deck rows (rank, archetype, playerName) and the player count', async () => {
    mockFetchHtml(eventHtml)
    const { decks, playerCount } = await scrapeEventDecks('12345', 'duel-commander')

    expect(playerCount).toBe(56)
    expect(decks).toHaveLength(2) // third row has no d= link → skipped

    expect(decks[0]).toMatchObject({
      rank: 1,
      archetype: 'Izzet Murktide',
      playerName: 'Alice',
    })
    expect(decks[0].externalUrl).toBe('https://www.mtgtop8.com/event?e=12345&d=111&f=EDH')

    // "3-4" → leading number parsed as rank
    expect(decks[1]).toMatchObject({
      rank: 3,
      archetype: 'Amulet Titan',
      playerName: 'Bob',
    })
  })

  it('returns an empty deck array when the panel is missing', async () => {
    mockFetchHtml(`<div class="S14">8 players</div>`)
    const { decks, playerCount } = await scrapeEventDecks('12345', 'modern')
    expect(decks).toHaveLength(0)
    expect(playerCount).toBe(8)
  })
})

describe('scrapeDeckList', () => {
  const deckHtml = `
    <div>
      <div class="deck_line" id="md1">4 <span class="L14">Lightning Bolt</span></div>
      <div class="deck_line" id="md2">2 <span class="L14">Snapcaster Mage</span></div>
      <div class="deck_line" id="md3"><span class="L14">Island</span></div>
      <div class="deck_line" id="sb1">3 <span class="L14">Dispel</span></div>
      <div class="deck_line" id="other"><span class="L14">Ignored</span></div>
    </div>
  `

  it('parses mainboard and sideboard cards with quantities', async () => {
    mockFetchHtml(deckHtml)
    const { mainboard, sideboard } = await scrapeDeckList('https://www.mtgtop8.com/event?e=1&d=2&f=MO')

    expect(mainboard).toEqual([
      { name: 'Lightning Bolt', qty: 4 },
      { name: 'Snapcaster Mage', qty: 2 },
      { name: 'Island', qty: 1 }, // no leading number → defaults to 1
    ])
    expect(sideboard).toEqual([{ name: 'Dispel', qty: 3 }])
  })

  it('ignores deck_line rows whose id is neither md* nor sb*', async () => {
    mockFetchHtml(deckHtml)
    const { mainboard, sideboard } = await scrapeDeckList('https://x/d')
    const allNames = [...mainboard, ...sideboard].map((c) => c.name)
    expect(allNames).not.toContain('Ignored')
  })

  it('decodes accented card names from Latin-1', async () => {
    // "Æther Vial" — Æ is 0xC6 in Latin-1.
    const html = `<div class="deck_line" id="md1">4 <span class="L14">Æther Vial</span></div>`
    mockFetchHtml(html)
    const { mainboard } = await scrapeDeckList('https://x/d')
    expect(mainboard[0].name).toBe('Æther Vial')
  })
})
