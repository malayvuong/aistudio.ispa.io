-- CreateTable
CREATE TABLE "channel_social_links" (
    "channelId" TEXT NOT NULL,
    "socialLinkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_social_links_pkey" PRIMARY KEY ("channelId", "socialLinkId")
);

-- CreateIndex
CREATE INDEX "channel_social_links_socialLinkId_idx" ON "channel_social_links"("socialLinkId");

-- AddForeignKey
ALTER TABLE "channel_social_links" ADD CONSTRAINT "channel_social_links_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_social_links" ADD CONSTRAINT "channel_social_links_socialLinkId_fkey" FOREIGN KEY ("socialLinkId") REFERENCES "social_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
