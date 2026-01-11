# AI Studio Producer Toolkit

## Overview

AI Studio Producer Toolkit is a production-focused web app for turning music ideas into release-ready assets. It helps
producers generate AI music prompts, album concepts, YouTube packaging, and track history, all in one place.

## Live Demo

https://aistudio.ispa.io

## Screenshots

Screenshot assets live in `public/images/`. Current files:
- `public/images/Screenshot_11-1-2026_222914_localhost.jpeg`
- `public/images/screenshot_1768143543.jpeg`
- `public/images/screenshot_1768143586.webp`
- `public/images/screenshot_1768143640.jpeg`
- `public/images/screenshot_1768143673.jpeg`

## Features

- AI Music Prompt `Generator: craft detailed style prompts for AI music platforms
- Album Concept: generate album themes, tracklist prompts, and visuals
- YouTube Package: produce titles, descriptions, tags, and visual prompts
- History: review past requests and rerun with saved inputs
- Channel Profiles: store per-channel defaults (language, tone, hashtags)
- Social Links: auto-inject links into descriptions

## How It Works

- Login
- Initialize provider keys with the Vault
- Unlock the vault (8-hour session)
- Generate content (music prompts, albums, packaging)
- Review and reuse results in History

## Security Model (Vault)

- Provider keys are encrypted at rest in the database.
- Keys are never stored in plaintext.
- Decrypted keys are cached in Redis for an 8-hour session.
- When the session expires, the vault locks again and keys must be unlocked.

## Supported Providers

- GOOGLE: text + images
- OPENAI: text + images
- DEEPSEEK: text only
- GROK: text only

## Tech Stack

- Next.js 16 (App Router)
- Supabase Auth (email/password)
- Prisma + PostgreSQL (Supabase)
- Redis (session vault)
- Tailwind CSS

## Local Development

1) Install dependencies:
    - pnpm install
2) Create env file:
    - cp .env.example .env.local
3) Run Prisma:
    - pnpm db:generate
4) Start dev server:
    - pnpm dev

## Environment Variables

- DATABASE_URL
- DIRECT_URL (optional for Prisma)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- REDIS_URL
- S3_ENDPOINT (optional)
- S3_BUCKET_NAME (optional)
- S3_ACCESS_KEY (optional)
- S3_SECRET_KEY (optional)

## Deployment Notes (Vercel)

- Use Node runtime for API routes that touch Prisma/Crypto/Redis.
- Ensure Redis is reachable from the deployment environment.
- Set all required environment variables in Vercel.

## Contributing

PRs are welcome. Please open an issue before major changes.

## License

Apache License 2.0 
