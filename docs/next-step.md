# Next Step

## Immediate (unblock)
1. User provides keys -> populate `.env` (copy from `env.example`):
   - API_FOOTBALL_KEY, DATABASE_URL (Neon), UPSTASH_*, RESEND_API_KEY
   - CLOUDFLARE_ACCOUNT_ID + new CLOUDFLARE_API_TOKEN (Pages+Workers+R2+skorly.cc DNS)
   - DEEPSEEK/OPENROUTER/QWEN/GLM keys from ~/.env/apikey
2. `pnpm install` at repo root.

## Day 2 (DB)
- `pnpm db:push` to create tables in Neon.
- Verify schema with `pnpm db:studio`.

## Day 3 (API-Football)
- Wire real key, run `pnpm --filter @skorly/api-football test`.
- Smoke-test `fixturesByLeague(1, 2026)` against free tier.

## Day 5 (Ingest)
- Implement upserts in `apps/jobs/src/ingest-fixtures.ts` (teams + 104 fixtures + squads).

## Day 6 (AI)
- Implement `generate-previews.ts` using `generateArticle`.
- Generate Mexico vs Paraguay preview, inspect Indonesian quality, tune prompts/model routing.
