# MTG Vault

A Magic: The Gathering collection tracker. Search cards, view real-time Scryfall pricing, and manage your personal collection.

## Features

- **Card search** — full-text search via Scryfall API, results in under 500ms
- **Price display** — USD, USD foil, and EUR prices cached in PostgreSQL and refreshed daily
- **Collection management** — add cards with quantity and foil tracking; see total value in real time
- **Authentication** — email/password login with JWT sessions via NextAuth.js

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Prisma 7 |
| Auth | NextAuth.js v4 (CredentialsProvider) |
| Styling | Tailwind CSS |
| Package manager | pnpm 10 |
| Testing | Vitest |
| Deployment | Vercel |

## Architecture

```
Browser
  └── Next.js App Router (SSR + Client Components)
        ├── /search          → Scryfall API → card grid
        ├── /cards/[id]      → price-cache layer → card detail
        ├── /collection      → PostgreSQL via Prisma → collection grid
        └── /api/collection  → REST endpoints (auth-gated)

Price cache (lib/price-cache.ts)
  ├── DB hit if < 24h old   → return stale + fire background refresh
  └── DB miss               → fetch from Scryfall → upsert → return

Auth (lib/auth.ts)
  └── JWT strategy; middleware.ts protects /collection/*
```

### Database schema

```
User              Card (Scryfall cache)
 └─ CollectionEntry ─── Card
                          └─ CardPrice (one row per refresh)
```

## Local setup

### Prerequisites

- Node.js 22+
- pnpm 10 (`npm i -g pnpm@10`)
- PostgreSQL 14+ running locally

### 1. Clone and install

```bash
git clone <repo-url>
cd mtg-trading-platform
pnpm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:<db-password>@localhost:5432/mtg_vault"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"

# Base URL of the app
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Set up the database

```bash
# Create the database
createdb mtg_vault

# Run migrations and generate Prisma client
pnpm prisma migrate dev
```

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm test` | Run unit tests |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type check |
| `pnpm prisma studio` | Open Prisma Studio (DB GUI) |
| `pnpm prisma migrate dev` | Create and apply a migration |

## Deployment (Vercel)

### Required environment variables

Set these in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. from Neon or Supabase) |
| `NEXTAUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL, e.g. `https://mtg-vault.vercel.app` |

Migrations run automatically on every deploy via `prisma migrate deploy` in `vercel.json`.

### Recommended database providers

- [Neon](https://neon.tech) — serverless Postgres, free tier available
- [Supabase](https://supabase.com) — managed Postgres with a dashboard

### Deploy steps

1. Push to GitHub
2. Import the repo in the Vercel dashboard
3. Set the three environment variables above
4. Deploy — migrations run, app goes live

## Testing

Unit tests cover the Scryfall API client (8 tests):

```bash
pnpm test
```

Tests use Vitest with `globalThis.fetch` mocked — no network calls.

## Project structure

```
app/
  (auth)/login/       Login page
  api/collection/     Collection REST API
  cards/[id]/         Card detail page + error/loading states
  collection/         Collection dashboard + error/loading states
  search/             Search page + error/loading states
components/
  AddToCollectionForm.tsx
  CardGrid.tsx
  CollectionGrid.tsx   Optimistic UI updates
  Nav.tsx
  Providers.tsx
lib/
  auth.ts             NextAuth config
  price-cache.ts      Stale-while-revalidate caching
  prisma.ts           Prisma singleton
  scryfall/           API client + types + tests
prisma/
  schema.prisma
  migrations/
```
