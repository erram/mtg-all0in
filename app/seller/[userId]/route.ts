import { prisma } from '@/lib/prisma'

const CONDITIONS: Record<string, string> = {
  NM: 'Near Mint', LP: 'Light Play', MP: 'Moderate Play', HP: 'Heavy Play', DMG: 'Damaged',
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function renderHTML(handle: string, listings: Awaited<ReturnType<typeof getListings>>) {
  const cards = listings.map((l) => {
    const symbol = l.currency === 'EUR' ? '€' : '$'
    const condition = CONDITIONS[l.condition] ?? l.condition
    const foilBadge = l.foil
      ? `<span class="badge foil">✦ Foil</span>`
      : ''
    const notesBadge = l.notes
      ? `<span class="badge note">${esc(l.notes)}</span>`
      : ''
    const qtyBadge = l.quantity > 1
      ? `<span class="badge qty">×${l.quantity}</span>`
      : ''

    return `
    <article class="card-item">
      <a href="https://scryfall.com/card/${esc(l.scryfallId)}" target="_blank" rel="noopener noreferrer" class="card-img-link">
        ${l.card.imageUri
          ? `<img src="${esc(l.card.imageUri)}" alt="${esc(l.card.name)}" class="card-img" loading="lazy" />`
          : `<div class="card-img-placeholder">No image</div>`}
      </a>
      <div class="card-body">
        <p class="card-name">${esc(l.card.name)}</p>
        <p class="card-set">${esc(l.card.setCode.toUpperCase())}</p>
        <div class="badges">
          <span class="badge cond">${esc(condition)}</span>
          ${foilBadge}${qtyBadge}${notesBadge}
        </div>
        <p class="card-time">${timeAgo(new Date(l.createdAt))}</p>
      </div>
      <p class="card-price">${symbol}${Number(l.price).toFixed(2)}</p>
    </article>`
  }).join('\n')

  const emptyState = `
    <div class="empty">
      <p>No cards listed for sale yet.</p>
    </div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(handle)}'s cards for sale — MTG Vault</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0d0b;
      color: #f0ebe4;
      min-height: 100vh;
    }

    /* ── Header ── */
    header {
      background: linear-gradient(160deg, #1e1108 0%, #0f0d0b 60%);
      border-bottom: 1px solid #2e2015;
      padding: 2.5rem 1.5rem 2rem;
      text-align: center;
    }
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px; height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #d97756, #a34f30);
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.75rem;
    }
    header h1 {
      font-size: 1.6rem;
      font-weight: 700;
      color: #f5ede4;
      letter-spacing: -0.02em;
    }
    header p {
      margin-top: 0.25rem;
      font-size: 0.85rem;
      color: #9e8e7e;
    }
    .count-badge {
      display: inline-block;
      margin-top: 0.75rem;
      background: #2a1e12;
      border: 1px solid #3d2e1e;
      border-radius: 2rem;
      padding: 0.25rem 0.75rem;
      font-size: 0.8rem;
      color: #c4a882;
    }

    /* ── Grid ── */
    main {
      max-width: 860px;
      margin: 0 auto;
      padding: 2rem 1rem 4rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
    }

    /* ── Card ── */
    .card-item {
      display: flex;
      gap: 0.875rem;
      background: #1a1410;
      border: 1px solid #2e2015;
      border-radius: 12px;
      padding: 0.875rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .card-item:hover {
      border-color: #d97756;
      box-shadow: 0 0 0 1px #d9775640;
    }
    .card-img-link { display: block; flex-shrink: 0; }
    .card-img {
      width: 56px; height: 78px;
      object-fit: cover;
      border-radius: 6px;
      display: block;
    }
    .card-img-placeholder {
      width: 56px; height: 78px;
      border-radius: 6px;
      background: #2a1e12;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      color: #6b5a4a;
    }
    .card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
    .card-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: #f0ebe4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-set { font-size: 0.72rem; color: #7a6a5a; margin-top: 0.1rem; }
    .badges { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.4rem; }
    .badge {
      font-size: 0.68rem;
      padding: 0.15rem 0.5rem;
      border-radius: 2rem;
      font-weight: 500;
    }
    .badge.cond { background: #2a2015; color: #c4a882; border: 1px solid #3d3020; }
    .badge.foil { background: #1e1030; color: #c084fc; border: 1px solid #4c2d7a; }
    .badge.qty  { background: #1a2218; color: #6ee7b7; border: 1px solid #2a4030; }
    .badge.note { background: #1a1410; color: #9e8e7e; border: 1px solid #2e2015; font-style: italic; }
    .card-time  { font-size: 0.68rem; color: #5a4a3a; margin-top: 0.4rem; }
    .card-price {
      flex-shrink: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #d97756;
      align-self: flex-start;
      white-space: nowrap;
    }

    /* ── Empty ── */
    .empty {
      text-align: center;
      padding: 4rem 2rem;
      color: #5a4a3a;
      font-size: 0.9rem;
    }

    /* ── Footer ── */
    footer {
      text-align: center;
      padding: 2rem 1rem;
      border-top: 1px solid #1e1610;
      font-size: 0.78rem;
      color: #4a3a2a;
    }
    footer a { color: #d97756; text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    @media (max-width: 480px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="avatar">${esc(handle[0].toUpperCase())}</div>
    <h1>${esc(handle)}</h1>
    <p>MTG cards for sale</p>
    ${listings.length > 0 ? `<span class="count-badge">${listings.length} listing${listings.length !== 1 ? 's' : ''}</span>` : ''}
  </header>

  <main>
    ${listings.length > 0 ? `<div class="grid">${cards}</div>` : emptyState}
  </main>

  <footer>
    Powered by <a href="/" rel="noopener">MTG Vault</a>
  </footer>
</body>
</html>`
}

async function getListings(userId: string) {
  return prisma.listing.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: 'desc' },
    include: { card: true },
  })
}

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true },
  })

  if (!user) {
    return new Response('Seller not found', { status: 404, headers: { 'Content-Type': 'text/plain' } })
  }

  const listings = await getListings(params.userId)
  const handle = user.email.split('@')[0]
  const html = renderHTML(handle, listings)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  })
}
