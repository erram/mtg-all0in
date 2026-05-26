# MTG Card Trading Platform — Product Spec

**Version**: 0.1.0  
**Date**: 2026-05-26  
**Stack**: Next.js 14 (App Router) + TypeScript + PostgreSQL + Prisma ORM

---

## Product Goal

A web platform where Magic: The Gathering players can:
1. Search cards and view real-time pricing (via Scryfall API)
2. Track their personal collection (cards owned, quantities)
3. Browse price history and set price alerts

Non-goals (v1): peer-to-peer trading, payment processing, deck building.

---

## External APIs

| API | Purpose | Auth | Rate limit |
|-----|---------|------|-----------|
| Scryfall REST API | Card data, images, pricing | None | ~10 req/s, be polite |

---

## Data Model

### User
- id, email, passwordHash, createdAt

### Card (cached from Scryfall)
- scryfallId (PK), name, setCode, imageUri, oracleText, updatedAt

### CardPrice (refreshed daily)
- id, scryfallId, usd, usdFoil, eur, fetchedAt

### CollectionEntry
- id, userId, scryfallId, quantity, foil, notes, addedAt

---

## Core User Flows

1. **Search**: User searches by card name → results from Scryfall → click card → detail page with price chart
2. **Collection**: Authenticated user adds card + quantity to their collection
3. **Collection View**: User sees full collection with current prices and total value

---

## Acceptance Criteria (v1)

- [ ] Card search returns results in < 500ms (Scryfall latency)
- [ ] Price data refreshed at most once per 24h per card (respect Scryfall ToS)
- [ ] Collection CRUD requires authentication
- [ ] Mobile-responsive layout
- [ ] Zero TypeScript `any` in application code
