-- CreateIndex
CREATE INDEX "CardPrice_scryfallId_fetchedAt_idx" ON "CardPrice"("scryfallId", "fetchedAt" DESC);

-- CreateIndex
CREATE INDEX "CollectionEntry_userId_idx" ON "CollectionEntry"("userId");

-- CreateIndex
CREATE INDEX "Listing_active_createdAt_idx" ON "Listing"("active", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Listing_userId_idx" ON "Listing"("userId");

-- CreateIndex
CREATE INDEX "TournamentDeck_eventId_idx" ON "TournamentDeck"("eventId");

-- CreateIndex
CREATE INDEX "TournamentDeck_archetype_idx" ON "TournamentDeck"("archetype");

-- CreateIndex
CREATE INDEX "TournamentEvent_format_date_idx" ON "TournamentEvent"("format", "date" DESC);
