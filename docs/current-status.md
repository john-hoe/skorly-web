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

## Decisions
- DB/Auth/Storage consolidated on **Supabase** (Postgres + Auth + Storage).
  - Phase 1.1 auth will use Supabase Auth (not Better Auth); `users` becomes a profiles table keyed to `auth.users`.
  - PDF gift stored in Supabase Storage (not R2).

## Blocked on (keys)
- API-Football, Supabase DATABASE_URL (pooler), Upstash, Resend, Cloudflare (Account ID + new token for skorly.cc)
- DeepSeek / OpenRouter / Qwen / GLM keys already exist in ~/.env/apikey

## Next
See [next-step.md](next-step.md).
