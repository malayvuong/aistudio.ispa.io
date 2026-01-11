-- CreateTable
CREATE TABLE "channel_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultLanguage" TEXT,
    "defaultTone" TEXT,
    "defaultHashtags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channel_profiles_userId_idx" ON "channel_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_profiles_userId_name_key" ON "channel_profiles"("userId", "name");

-- AddForeignKey
ALTER TABLE "channel_profiles" ADD CONSTRAINT "channel_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
