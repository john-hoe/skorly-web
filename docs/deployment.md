# Deployment

## Environments
- **Web**: Cloudflare Pages (Next.js). Custom domain `skorly.cc`.
- **Jobs**: Cloudflare Workers (`skorly-jobs`) with Cron Triggers.
- **DB**: Neon Postgres (Singapore region for SEA latency + data-residency note).
- **Cache**: Upstash Redis (REST).
- **Assets/PDF**: Cloudflare R2.

## Local dev
```bash
pnpm install
cp env.example .env   # fill values (real keys in ~/.env/apikey)
pnpm dev              # apps/web on http://localhost:3000/id
pnpm db:push          # apply schema to Neon
pnpm --filter @skorly/jobs dev   # workers locally
```

## Secrets (Workers)
Set via wrangler (never commit):
```bash
cd apps/jobs
wrangler secret put DATABASE_URL
wrangler secret put API_FOOTBALL_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put OPENROUTER_API_KEY
wrangler secret put QWEN_API_KEY
wrangler secret put GLM_API_KEY
```

## Cloudflare token scopes needed
A NEW token (the one in ~/.env/apikey is scoped to cosolution.cc only):
- Account: Cloudflare Pages: Edit, Workers Scripts: Edit, Workers R2 Storage: Edit
- Zone (skorly.cc): DNS: Edit

## Launch checklist (Day 13-14)
- [ ] Pages build green, custom domain `skorly.cc` attached
- [ ] Lighthouse > 90 (mobile, SEA throttling)
- [ ] sitemap + news-sitemap reachable
- [ ] GSC + Bing Webmaster verified, IndexNow key deployed
- [ ] Cron triggers firing (check Workers logs)
- [ ] Subscribe form E2E (insert + email)
