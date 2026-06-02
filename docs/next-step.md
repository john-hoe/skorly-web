# Next Step

## 二期下一步（当前）
进入 **Skorly 二期**（会员·预测·增长），完整方案见 [phase-2-plan.md](phase-2-plan.md)。

**从 M0（地基：Auth 迁移）起步**，可与 M2（SEO 引擎）并行：
1. 接入 `@supabase/ssr` + 更新 `apps/web/middleware.ts`（session 刷新 + next-intl 组合）。
2. schema 迁移 `users → profiles(uuid)`，更新各表外键，Drizzle migration + Supabase 应用。
3. Auth UI：注册/登录/Google·Facebook/邮箱验证/找回密码（i18n + Turnstile + 限流）。
4. 补环境变量：`SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY`、Turnstile keys。

---

## 一期历史记录

## Immediate (unblock)
1. User provides keys -> populate `.env` (copy from `env.example`):
   - API_FOOTBALL_KEY, DATABASE_URL (Supabase pooler), UPSTASH_*, RESEND_API_KEY
   - CLOUDFLARE_ACCOUNT_ID + new CLOUDFLARE_API_TOKEN (Pages+Workers+R2+skorly.cc DNS)
   - DEEPSEEK/OPENROUTER/QWEN/GLM keys from ~/.env/apikey
2. `pnpm install` at repo root.

## Day 2 (DB)
- `pnpm db:push` to create tables in Supabase.
- Verify schema with `pnpm db:studio`.

## Day 3 (API-Football)
- Wire real key, run `pnpm --filter @skorly/api-football test`.
- Smoke-test `fixturesByLeague(1, 2026)` against free tier.

## Day 5 (Ingest)
- Implement upserts in `apps/jobs/src/ingest-fixtures.ts` (teams + 104 fixtures + squads).

## Day 6 (AI)
- Implement `generate-previews.ts` using `generateArticle`.
- Generate Mexico vs Paraguay preview, inspect Indonesian quality, tune prompts/model routing.
