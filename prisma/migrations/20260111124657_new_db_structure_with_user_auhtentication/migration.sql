
-- AlterEnum
BEGIN;
CREATE TYPE "GenerationFeature_new" AS ENUM ('YOUTUBE_PACKAGE', 'MUSIC_PROMPT', 'ALBUM_CONCEPT');
ALTER TABLE "generation_history" ALTER COLUMN "feature" TYPE "GenerationFeature_new" USING ("feature"::text::"GenerationFeature_new");
ALTER TYPE "GenerationFeature" RENAME TO "GenerationFeature_old";
ALTER TYPE "GenerationFeature_new" RENAME TO "GenerationFeature";
DROP TYPE "public"."GenerationFeature_old";
COMMIT;
