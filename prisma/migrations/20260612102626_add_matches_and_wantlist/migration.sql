-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "yourArchetype" TEXT NOT NULL,
    "oppArchetype" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "predicted" DOUBLE PRECISION,
    "eventName" TEXT,
    "notes" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WantListEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "maxPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WantListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchResult_userId_format_idx" ON "MatchResult"("userId", "format");

-- CreateIndex
CREATE INDEX "MatchResult_userId_oppArchetype_idx" ON "MatchResult"("userId", "oppArchetype");

-- CreateIndex
CREATE INDEX "WantListEntry_userId_idx" ON "WantListEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WantListEntry_userId_cardName_key" ON "WantListEntry"("userId", "cardName");

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WantListEntry" ADD CONSTRAINT "WantListEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
