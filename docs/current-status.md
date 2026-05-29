# Current Status

**Phase**: 0 (Indonesia MVP) - Day 1 scaffolding
**Updated**: 2026-05-29

## Done
- Monorepo (pnpm workspaces): root config, tsconfig.base, env.example, .gitignore, README
- `apps/web`: Next.js 16 + TS + Tailwind v4 + next-intl, `[locale]` routing (id/vi/en), home/WC-hub/match/team/article page skeletons, SiteHeader/Footer, SubscribeGiftCard + `/api/subscribe` skeleton, id/vi/en message catalogs
- `packages/db`: full Drizzle schema (leagues, teams, players, fixtures, fixture_events, articles, subscribers, users/accounts/sessions, comments, campaigns, campaign_entries, predictions, winners) + Supabase client (postgres.js) + drizzle.config
- `packages/api-football`: typed v3 client skeleton + Vitest test (mocked fetch)
- `packages/ai-content`: provider-agnostic LLM client (DeepSeek/OpenRouter/Qwen/GLM), 6 prompt templates, QA pipeline (critique/judge/back-translate/gate), ID football glossary, generator orchestrator
- `packages/types`, `packages/ui`: shared types + base components
- `apps/jobs`: Cloudflare Workers cron router + ingest/preview/recap skeletons + wrangler.toml

## Day 2 done (via Supabase MCP)
- Schema applied to Supabase project `majrlaxktengachwrskk` (john-hoe's Project, region ap-northeast-2/Seoul, Postgres 17).
- 18 tables created (migration `init_skorly_schema`); all RLS-enabled (safe default; server-side Drizzle bypasses RLS).
- Security advisor: 18x INFO `rls_enabled_no_policy` (expected for Phase 0), 2x WARN about a pre-existing `rls_auto_enable()` SECURITY DEFINER function (decide whether to revoke anon EXECUTE).

## Validated end-to-end (Day 3-6 partial, against WC2022 free-tier data)
- API-Football key works. NOTE: free tier only allows seasons 2022-2024; WC2026 (season 2026) needs Pro. Using WC2022 (league=1, season=2022, 64 fixtures) to validate; flip WC_SEASON=2026 after Pro upgrade.
- Supabase pooler connection confirmed: host prefix is `aws-1` (not aws-0), port 6543, transaction mode.
- Ingest loaded 32 teams + 64 fixtures into Supabase (real data, FKs intact).
- AI pipeline validated with real keys:
  - DeepSeek generation alone produces high-quality Indonesian (Bola.net-grade) in ~14s.
  - Full QA pipeline (DeepSeek -> Qwen critique -> OpenRouter gpt-4o-mini judge -> back-translate) passed: judge 8.7/10, auto-published. ~73s/article.

## Refinements queued
- Batch performance: ~73s/article full QA is too slow sequentially for 556 articles; parallelize (concurrency ~10) for Day 10 batch.
- Critique step (Qwen) can ADD unverified facts (coach names, clubs). Day 6: constrain critique prompt to "do not introduce facts not in the source"; extend back-translate/judge to flag invented entities.
- Runner scripts: apps/jobs/scripts/run-ingest.ts and run-generate.ts (run via `pnpm tsx`, env injected inline).

## Decisions
- DB/Auth/Storage consolidated on **Supabase** (Postgres + Auth + Storage).
  - Phase 1.1 auth will use Supabase Auth (not Better Auth); `users` becomes a profiles table keyed to `auth.users`.
  - PDF gift stored in Supabase Storage (not R2).

## Blocked on (keys)
- API-Football, Supabase DATABASE_URL (pooler), Upstash, Resend, Cloudflare (Account ID + new token for skorly.cc)
- DeepSeek / OpenRouter / Qwen / GLM keys already exist in ~/.env/apikey

## Next
See [next-step.md](next-step.md).
