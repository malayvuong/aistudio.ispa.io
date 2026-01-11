-- CreateEnum
CREATE TYPE "GenerationFeature" AS ENUM ('YOUTUBE_PACKAGE', 'MUSIC_PROMPT', 'ALBUM_CONCEPT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" "GenerationFeature" NOT NULL,
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "generation_history_userId_idx" ON "generation_history"("userId");

-- CreateIndex
CREATE INDEX "generation_history_feature_idx" ON "generation_history"("feature");

-- CreateIndex
CREATE INDEX "generation_history_status_idx" ON "generation_history"("status");

-- CreateIndex
CREATE INDEX "generation_history_createdAt_idx" ON "generation_history"("createdAt");

-- CreateIndex
CREATE INDEX "assets_historyId_idx" ON "assets"("historyId");

-- CreateIndex
CREATE INDEX "assets_type_idx" ON "assets"("type");

-- AddForeignKey
ALTER TABLE "generation_history" ADD CONSTRAINT "generation_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "generation_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;
