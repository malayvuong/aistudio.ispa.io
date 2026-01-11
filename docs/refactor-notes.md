# Refactor Baseline Notes

## Current Versions
- Next.js: 16.1.1

## Known Issues / Baseline Findings
- Legacy SPA artifacts removed in this refactor branch; cleanup script now only neutralizes `App.tsx` if it reappears.
- No additional baseline issues tracked.

## Upgrade Note
- Upgraded to Next 16.1.1 with React 19.2.3 and TypeScript 5.9.3.

## Migration Decision Rules
- If `npm run db:check` returns `EMPTY_DB`, run `npm run db:migrate:dev`.
- If `npm run db:check` returns `PRISMA_MANAGED_DB`, run `npm run db:migrate:deploy`.
- If `npm run db:check` returns `NON_PRISMA_DB`, stop and manually inspect Supabase before continuing.

## Current Routes & Components
- Pages: `/` (Landing), `/dashboard` (Hub), `/dashboard/tools/music`, `/dashboard/tools/youtube`, `/dashboard/tools/album`, `/dashboard/history`, `/dashboard/history/[id]`.
- API: `/api/check-session`, `/api/verify-password`, `/api/history`, `/api/history/[id]`, `/api/generate/*` (package/music/album/visuals).
- Shared UI: `components/Header.tsx`, `components/Footer.tsx`, `components/Auth.tsx`, `components/CanvasPreview.tsx`.

## Dashboard Location
- `components/Dashboard.tsx` is mounted by `app/page.tsx` as the main YouTube packaging flow.

## AI Provider Code Paths
- Backend registry + providers: `services/ai/registry.ts`, `services/ai/providers/*`, `services/ai/types.ts`.
- Prompt/service logic: `services/ai/providerService.ts`.
- Frontend API client: `services/geminiService.ts`.
- Provider UI options: `lib/ai-provider.ts`.
