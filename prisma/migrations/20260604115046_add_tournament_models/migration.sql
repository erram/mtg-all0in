-- CreateTable
CREATE TABLE "TournamentEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "playerCount" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentDeck" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rank" INTEGER,
    "playerName" TEXT,
    "archetype" TEXT,
    "colors" TEXT,
    "decklist" JSONB,
    "externalUrl" TEXT,

    CONSTRAINT "TournamentDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaSnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "archetypes" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEvent_source_externalId_key" ON "TournamentEvent"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaSnapshot_source_format_key" ON "MetaSnapshot"("source", "format");

-- AddForeignKey
ALTER TABLE "TournamentDeck" ADD CONSTRAINT "TournamentDeck_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TournamentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
