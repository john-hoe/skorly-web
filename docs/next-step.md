# Next Step

## 三期下一步（当前，2026-06-10 v2）
进入 **Skorly 三期**（流量增长 × 商业化），完整规划见 [phase-3-growth-revenue-plan.md](phase-3-growth-revenue-plan.md)（v2）。

> v2 核查结论：Spec A（埋点）✅、Spec C（后台）✅ 已全部 merge 上线；Spec B（实时）主体上线（生产 `/api/live` 可用）；`/jadwal`、`/nonton` 已上线。v1 的多数 P0 已被并行开发消化。

**世界杯 6/11 开赛，S1 第一周剩余 P0**（细节见规划 §5）：
1. AdSense 申请提交（ads.txt 当前 404 + Consent Mode v2 + 屏蔽博彩类目）— 唯一没动的主线，最先做。
2. 比赛日部署提频：出稿→上线 ≤30min（当前每日仅 1 班构建，recap 最长延迟 ~24h）。
3. 6/11 首个比赛日实战验证 live 链路（配额/降级/后台补抓演练）。
4. 每日 Push/Email 运营节奏自动化（功能已有，接排期）。
5. PostHog 漏斗/WAP 看板建好，定每周复盘。

---

## 二期下一步（已完成，归档）
二期（会员·预测·增长）已全部上线生产，见 [phase-2-plan.md](phase-2-plan.md)。

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
