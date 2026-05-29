# Skorly

Football news site targeting Indonesia (first), Vietnam, and the Philippines, launching for the 2026 FIFA World Cup.

- **Domain**: skorly.cc
- **Positioning**: editorial-driven football content (pre-match preview, talking points, prediction, post-match recap, tactical analysis, group analysis). No piracy, no live-stream.
- **First market**: Indonesian (Bahasa Indonesia), then Vietnamese + Philippine English.
- **Content**: AI-generated via DeepSeek V4 Pro with a fully automated multi-model QA pipeline (no human review).

## Monorepo layout

```
apps/
  web/                 Next.js 15 App Router site (SSR/ISR, i18n)
  jobs/                Cloudflare Workers cron jobs (ingest + generate)
packages/
  db/                  Drizzle ORM schema + client (Neon Postgres)
  api-football/        Typed API-Football client
  ai-content/          LLM provider abstraction + prompts + QA pipeline
  types/               Shared TypeScript types
  ui/                  Shared React components
docs/                  Status, prompts, SEO and deployment docs
```

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 App Router + TypeScript + Tailwind + next-intl |
| Hosting | Cloudflare Pages + Workers + Cron Triggers |
| Database | Neon Postgres + Drizzle ORM |
| Cache | Upstash Redis |
| Sports data | API-Football |
| AI generation | DeepSeek V4 Pro |
| AI judge / fallback | OpenRouter (Gemini/GPT), Qwen, GLM |
| Email | Resend |
| Captcha | Cloudflare Turnstile |

## Getting started

```bash
pnpm install
cp env.example .env   # then fill values (real keys in ~/.env/apikey)
pnpm dev              # runs apps/web
```

See [docs/deployment.md](docs/deployment.md) for full setup and [the plan](../.cursor/plans) for the phased roadmap.

## Status

Phase 0 (Indonesia MVP) in progress. See [docs/current-status.md](docs/current-status.md).
