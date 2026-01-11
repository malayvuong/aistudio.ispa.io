# Security

## Vault model
- Provider API keys are stored encrypted-at-rest in the database.
- Encryption uses scrypt (KDF) + AES-256-GCM.
- The vault passphrase is never stored; only encryption metadata (salt/iv/tag/kdf params) is kept.

## Vault unlock + TTL
- Decrypted provider keys are cached in Redis per session (sid) for 8 hours (28800s).
- When TTL expires, the vault is locked again and keys must be re-unlocked.
- Session cache is keyed by `sid` cookie and scoped per user.

## Data access boundaries
- All generation APIs require an authenticated Supabase user.
- Provider keys are never accepted from clients; the server reads them from the vault session.
- History and channel/social profiles are scoped by `userId`.

## Rate limiting
- Redis-backed per-user + per-IP buckets protect generate, vault, and dashboard endpoints.
- Vault unlock failures are tracked and can trigger temporary blocks (403 `TEMP_BLOCKED`).
- Env overrides: `RATE_LIMIT_GENERATE_PER_HOUR`, `RATE_LIMIT_GENERATE_IP_PER_HOUR`, `RATE_LIMIT_UNLOCK_PER_10MIN`, `RATE_LIMIT_UNLOCK_IP_PER_10MIN`, `RATE_LIMIT_VAULT_SAVE_PER_HOUR`, `RATE_LIMIT_VAULT_SAVE_IP_PER_HOUR`, `RATE_LIMIT_LIGHT_PER_HOUR`, `RATE_LIMIT_LIGHT_IP_PER_HOUR`.

## Logging
- Server logs avoid emitting secrets (no plaintext keys or passphrases).

## API hardening
- Sensitive endpoints enforce allowed methods and `application/json` for POST bodies.
- Request body size limits: generate (50KB), vault unlock (5KB), provider save (10KB).
- Top-level payloads are schema-checked to reject unexpected fields when feasible.
- Error responses are standardized as `{ error, code }` with appropriate HTTP status codes.

## Cloudflare edge hardening
- Challenge requests to `/api/*` with missing `User-Agent`.
- Block known bad bot signatures and IPs at the edge.
- Apply IP-based rate limiting at Cloudflare for `/api/*`.
- App layer still enforces auth + Redis limits even with edge protections enabled.

## Testing
- Start the dev server: `pnpm dev`.
- For a quick 429, lower `RATE_LIMIT_LIGHT_IP_PER_HOUR` (ex: `5`) and run:
  - `pnpm security:smoke`
- Optional envs:
  - `SECURITY_SMOKE_URL` (default `http://localhost:3000/api/i18n/lang`)
  - `SECURITY_SMOKE_METHOD` (default `POST`)
  - `SECURITY_SMOKE_ATTEMPTS` (default `10`)
  - `SECURITY_SMOKE_BODY` (default `{"lang":"en"}`)
