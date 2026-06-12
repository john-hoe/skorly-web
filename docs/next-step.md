# Next Step

## 当前临时任务（2026-06-11）
- 已完成：清理当前环境中可证据识别的测试账号、测试评论及其相关测试数据；生产与 review seed 复核均为 0。

## 三期下一步（当前，2026-06-10 v2.1）
进入 **Skorly 三期**（流量增长 × 商业化），完整规划与执行台账见 [phase-3-growth-revenue-plan.md](phase-3-growth-revenue-plan.md)（v2.1，§0b 是当日台账）。

> 6/10 执行结果：S1 第一周 P0 全部完成（AdSense 提审 ✅、部署提频 PR #45 ✅、每日摘要 PR #46 ✅、PostHog 看板 ✅），P1 提前完成 3 项（Media Kit PR #47 ✅、Involve Asia 入驻 ✅、仓库清理 ✅）。

> 2026-06-12 新增：比赛中心与互动增强方案已与产品达成共识并定稿 → [specs/D-match-center-engagement.md](specs/D-match-center-engagement.md)（D1 文字直播+数据可视化 → D2 首页改版 → D3 官方集锦 → D4 你vsAI榜 → D5 预览部署），**待产品开工指令**。

**下一步（按时间顺序）**：
1. **6/11（明天）**：比赛日实战盯守——验证实时比分链路、API 配额（apiq <2000/日）、recap ≤30min 上线、首封每日摘要送达。这是最后一个未完成的 P0。
2. **≤48h**：Involve Asia 网站审核通过后 → 申请 Shopee ID/Lazada/流媒体计划 → 追踪链接接入 `/nonton` + 球衣导购页。
3. **1–14 天**：AdSense 审核结果 → 过审配广告位；拒审按理由整改二投。
4. **用户侧**：Involve Asia 收款信息；注册 TikTok/IG/WhatsApp Channel `@skorly`。
5. **7 月上旬（淘汰赛阶段）**：新闻雷达扩源到转会窗/俱乐部足球（S2 防断崖，提前做）。

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
