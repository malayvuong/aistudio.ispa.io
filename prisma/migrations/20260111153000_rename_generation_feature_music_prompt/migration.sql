DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GenerationFeature') THEN
    ALTER TYPE "GenerationFeature" ADD VALUE IF NOT EXISTS 'MUSIC_PROMPT';
  END IF;
END $$;
