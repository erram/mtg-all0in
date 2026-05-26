# MTG Trading Platform — Plans.md

Created: 2026-05-26

---

## Phase 1: Project Scaffold & Auth

| Task | Description | DoD | Depends | Status |
|------|------------|-----|---------|--------|
| 1.1 | Init Next.js 14 project with TypeScript, Tailwind, ESLint, Prettier | `npm run build` exits 0, no TS errors | - | cc:WIP |
| 1.2 | Set up PostgreSQL + Prisma ORM; define User, Card, CardPrice, CollectionEntry schema | `prisma migrate dev` runs clean; `prisma generate` passes | 1.1 | cc:TODO |
| 1.3 | Implement NextAuth.js (email/password) with JWT session strategy | Login/logout flow works; protected routes return 401 without session | 1.2 | cc:TODO |
| 1.4 | CI: GitHub Actions workflow — lint, typecheck, test on PR | CI passes on clean branch | 1.1 | cc:TODO |

## Phase 2: Card Search & Price Display

| Task | Description | DoD | Depends | Status |
|------|------------|-----|---------|--------|
| 2.1 | Scryfall API client module (typed, rate-limit-aware 100ms delay between calls) | Unit tests for client; mock Scryfall in tests | 1.1 | cc:TODO |
| 2.2 | Card search page `/search` — query input → Scryfall `/cards/search` → card grid | Search returns results; empty state handled; error state handled | 2.1 | cc:TODO |
| 2.3 | Card detail page `/cards/[id]` — image, oracle text, price table (USD/EUR/foil) | All price fields displayed; 404 on unknown id | 2.1 | cc:TODO |
| 2.4 | Price caching layer — store Scryfall prices in CardPrice table, refresh if > 24h old | DB hit instead of Scryfall API when cache is fresh; stale data triggers background refresh | 2.1, 1.2 | cc:TODO |

## Phase 3: Collection Management

| Task | Description | DoD | Depends | Status |
|------|------------|-----|---------|--------|
| 3.1 | Collection API routes — GET /api/collection, POST /api/collection, DELETE /api/collection/:id | Authenticated CRUD works; unauthenticated returns 401 | 1.3, 1.2 | cc:TODO |
| 3.2 | "Add to collection" button on card detail page with quantity + foil selectors | Collection entry saved to DB; UI updates without page reload | 3.1, 2.3 | cc:TODO |
| 3.3 | Collection dashboard `/collection` — card grid with quantities, foil badge, current price, total value | Total value calculated in real-time from cached prices; sorted by value desc | 3.1, 2.4 | cc:TODO |
| 3.4 | Remove / update quantity in collection | Entry updated or deleted; total value recalculates | 3.3 | cc:TODO |

## Phase 4: Polish & Deploy

| Task | Description | DoD | Depends | Status |
|------|------------|-----|---------|--------|
| 4.1 | Mobile-responsive layout audit — search, detail, collection pages | All pages pass Lighthouse mobile score >= 85 | Phase 3 | cc:TODO |
| 4.2 | Error boundaries + loading skeletons on all pages | No white screen on API error; skeleton visible during load | Phase 3 | cc:TODO |
| 4.3 | Vercel deployment + env vars setup (DATABASE_URL, NEXTAUTH_SECRET) | Production deploy accessible; migrations run on deploy | Phase 3 | cc:TODO |
| 4.4 | README with setup instructions + architecture diagram | New dev can run `npm run dev` following README alone | 4.3 | cc:TODO |
