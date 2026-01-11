-- CreateEnum
CREATE TYPE "AIProviderId" AS ENUM ('GOOGLE', 'OPENAI', 'DEEPSEEK', 'GROK');

-- CreateTable
CREATE TABLE "user_provider_secrets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AIProviderId" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "kdf" TEXT NOT NULL DEFAULT 'scrypt',
    "kdfParams" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_provider_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_provider_secrets_userId_idx" ON "user_provider_secrets"("userId");

-- CreateIndex
CREATE INDEX "user_provider_secrets_provider_idx" ON "user_provider_secrets"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "user_provider_secrets_userId_provider_key" ON "user_provider_secrets"("userId", "provider");

-- AddForeignKey
ALTER TABLE "user_provider_secrets" ADD CONSTRAINT "user_provider_secrets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
