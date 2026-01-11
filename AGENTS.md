# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages and API routes (`app/api/.../route.ts`).
- `components/`: UI building blocks and tool UIs (music, album, YouTube).
- `services/`: AI provider integrations and client-side API helpers.
- `lib/`: shared utilities (auth, vault, rate limiting, hooks).
- `prisma/`: schema and migrations; `i18n/`: translations.
- `public/`: static assets; `docs/` and `scripts/`: internal notes and tooling.

## Build, Test, and Development Commands
- `pnpm install` (or `npm install`): install dependencies.
- `pnpm dev`: run the Next.js dev server.
- `pnpm build`: create a production build; `pnpm start`: serve the build.
- `pnpm lint`: run ESLint with Next rules (fails on warnings).
- Prisma helpers: `pnpm db:generate`, `pnpm db:migrate:dev`, `pnpm db:studio`, `pnpm db:check`.

## Coding Style & Naming Conventions
- TypeScript + React + Next.js; Tailwind CSS for styling.
- Follow existing file style (2-space indentation is common); keep quotes and formatting consistent per file.
- Components use PascalCase; hooks use `useX`; pages use `page.tsx`, API routes use `route.ts`.
- Run `pnpm lint` before PRs and fix any warnings.

## Testing Guidelines
- No automated test framework configured and no coverage targets.
- Validate changes manually in key flows (music prompt, album generator, YouTube packaging, auth/vault).
- If you introduce tests, document the runner and add an npm script.

## Commit & Pull Request Guidelines
- Git history only shows "Initial commit"; no enforced convention yet.
- Use concise, imperative subjects (e.g., "Add vault status banner"); include scope if helpful.
- PRs should include a short summary, screenshots for UI changes, and note any env or Prisma migration updates.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local`; never commit secrets.
- Node >=20.19 is required; Prisma/Redis/Supabase keys are mandatory for most flows.
- Use the vault unlock flow for provider keys; do not log secrets.

## Agent-Specific Instructions
- Keep `@google/genai` in `package.json` as `*` or `latest` unless a breaking change requires pinning.
- Music Prompt Generator AI rule: lyrics are optional; do not remove or weaken this rule.
