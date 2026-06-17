# 方案 B — 比赛页实时化 + Discover/News（codex 可执行）

状态：设计已确认（D4 = Cloudflare KV 快照通道；D3 = API-Football **Pro 套餐，7,500 请求/日**，已截图核实，订阅至 2026-08-25）。执行方：codex app。

## 架构原则（必须遵守）
保持不变量"运行时 Worker 不碰 DB"（见 `apps/web/open-next.config.ts`）。直播数据流：
cron（jobs Worker，**有** DB + API 权限）→ 写紧凑 JSON 快照到 Cloudflare KV → web 通过一个廉价边缘路由（**只读 KV，不碰 DB**）读取 → 客户端**仅在直播窗口内**轮询该路由。

## 现状（已核实）
- 比赛页 `apps/web/app/[locale]/pertandingan/[slug]/page.tsx`：通过 `generateStaticParams`（22–27）走 SSG，`dynamicParams=false`（20），**无** `revalidate`/`dynamic`。比分只有 `finished` 时显示数字，否则显示字面量 "VS"（177–189）。客户端岛 mount 时只取一次（不轮询）：`EventsTimeline`/`GoalHighlights` → `getEvents` 服务端 action → DB（`apps/web/lib/score-actions.ts` 12–15）。
- `liveFixtures()` 已定义但**从未被调用**（`packages/api-football/src/client.ts` 57–60）。`client.ts` 非 200 直接抛错，无 429/退避（46–48）。
- `fixture_events` 表（`packages/db/src/schema.ts` 140–157）**在仓库内没有任何写入者**。只有 SELECT（`getFixtureEvents` 335–358）、`getGoalsToNotify`（1662–1705）、以及 UPDATE `notifiedAt`（`markEventNotified` 1707–1713）。
- `/skor` 读 DB `fixtures.status='live'`（`packages/db/src/queries.ts` 294–307），仅由 6h 的 `ingestFixtures` 更新；客户端 45s 轮询（`apps/web/components/live-scoreboard.tsx` 9–24）。
- 全仓库无任何 KV 绑定（`apps/web/wrangler.jsonc`、`apps/jobs/wrangler.toml`）。

## B0. 开通 Cloudflare KV
- 建一个 KV namespace（如 `LIVE_KV`）。在 `apps/jobs/wrangler.toml`（写方）与 `apps/web/wrangler.jsonc`（读方）**都**绑定。路由处理里通过 `getCloudflareContext().env.LIVE_KV` 访问。`open-next.config.ts` 不受影响（裸绑定）。

## B1. 高频直播采集 cron（配额感知，已按 Pro/7500 锁定）
配额事实：FOOTBALL = Pro，**7,500 请求/日**（截图核实，Requests used 起始 0，订阅至 2026-08-25）。一次 `/fixtures?live=all` 调用即可拿到所有在打比赛的比分，**与并发场次无关**；事件需按场调用 `/fixtures/events?fixture={id}`。

- 新建 job `apps/jobs/src/ingest-live.ts`：
  - 接上 `liveFixtures()` → `/fixtures?live=all`，按我们的联赛/赛季过滤，拿全部直播比分/状态/elapsed/goals。
  - **进球触发式取事件**：仅当某场 goals 或 status 相比上次快照发生变化时，才对该场调用 `/fixtures/events?fixture={id}`（大幅省配额）。
  - 比分/状态/elapsed upsert 进 `fixtures`（DB）；新事件 INSERT 进 `fixture_events`（**缺失的写入者**），以 (fixtureId, minute, type, playerName) 去重。
  - 写 KV 快照：`live:all` 与 `live:fixture:{id}`，TTL 90s。
  - 每次真实 API 调用后，对 KV 计数键 `apiq:YYYYMMDD` 自增。
- cron 频率（Cloudflare cron 最小粒度 1 分钟，故直播节流地板 = 60s）：
  - 把 `apps/jobs/wrangler.toml` 的直播槽从 `*/2 * * * *` 改为 `* * * * *`（每分钟触发）；现有 `*/2` 槽是 stub（`apps/jobs/src/index.ts` 40–44 调 preview/recap 占位 + DB notify），用真正的直播 poller 替换。
  - 守护：每次触发先做一次廉价检查（DB/KV），**仅当有比赛直播中或距开球 ≤15 分钟时**才真正打 API；否则立即返回，0 调用。配额只在直播窗口消耗。
- 配额预算（7500/日，留足余量）：
  - 正常：每分钟 1 次 `live=all`（60/小时）+ 进球触发式事件（每天约 100–300 次）。即便繁忙比赛日 12 小时直播窗口，总量约 **800–1500/日**，远低于 7500。
  - 分级降级（读 `apiq:YYYYMMDD`）：
    - ≥6000/日（80%）：关闭任何"每轮全量取事件"，只保留进球触发式。
    - ≥7000/日（93%）：比分轮询从 60s 降到 120s。
    - ≥7300/日（97%）：停止直播打 API，前端继续读最后一次 KV 快照。
    - 始终为 6h 的 `ingestFixtures` 预留 ≥200 次。
  - 在 `packages/api-football/src/client.ts` 加 429 处理 + 指数退避（当前 46–48 只是抛错）；收到 429 视为已达限，立即进入降级。

## B2. 运行时数据通道 + 修 /prediksi 类 500
- 新建路由 `apps/web/app/api/live/route.ts`（+ `apps/web/app/api/live/[fixtureId]/route.ts`）：只读 KV、返回 JSON、`Cache-Control: s-maxage=10, stale-while-revalidate`。**不碰 DB**。这是给客户端的廉价边缘读取端点。
- 把同样模式套到 `/prediksi` 的 500 根因上：`/prediksi` 是动态 SSR、在 Workers 上运行时读 DB（不稳定 → 间歇 1101/500）。改为 cron 把它的 bracket/standings 快照预算进 KV，`/prediksi` 请求时读快照而非 DB。（需协调；这是根治方案。）

## B3. 比赛页实时化（UX）同时保持 SSG（SEO）
- 给比赛页加 `LiveMatchHeader` 客户端岛：当比赛直播中或临近开球时，轮询 `/api/live/[fixtureId]`（Pro：约 45–60s）实时更新头部比分/minute/status（替换静态 "VS"，177–189）。
- 把 `EventsTimeline` + `GoalHighlights` 从一次性 `getEvents`（DB）改为直播窗口内轮询 `/api/live/[fixtureId]`，使新进球无需 rebuild 即可出现。
- SEO 取舍（明确）：比赛页保持 SSG（运行时不碰 DB，守住不变量）。直播比分对用户走客户端渲染；对搜索，由赛后 RECAP 文章（NewsArticle，进 news-sitemap）承载最终结果。**不要**把比赛页改成运行时 DB 的 SSR。
- 修复比赛页 JSON-LD 的 `eventStatus` bug（`page.tsx` 104–106 — 两个分支都是 `EventScheduled`）。在构建时把 `fixture.status` 映射到正确的 schema.org 值：scheduled → `EventScheduled`，postponed → `EventPostponed`，cancelled → `EventCancelled`。（schema.org 无"completed"；已结束的比赛保持 `EventScheduled` 并依赖 recap。）

## B4. Discover / News SEO（SEO 文件归 codex — 此处仅出方案）
- 作者署名：把文章 `NewsArticle` 的 author 从 `Organization` 改为带真实署名的 `Person`（`apps/web/app/[locale]/artikel/[slug]/page.tsx` 78–93）。需要一个具名作者身份。
- `dateModified`：用真实的 `updatedAt`（若无则加列），不要复用 `publishedAt`。
- 大图（Discover）：强制文章封面/海报宽度 ≥1200px；在 JSON-LD 的 `ImageObject` 加 `width`/`height`。海报当前是 4:5、无强制宽度（`packages/ai-content/src/poster-prompt.ts` 31–32）— 增加一个 ≥1200px 宽的 Discover 变体。`/og` 路由已是 1200×630。
- recap 作为 NewsArticle：确保 recap 走 `artikel` 路由发布（从而输出 `NewsArticle`），且 `publishedAt` 新鲜，以进入 <48h 的 news sitemap（`apps/web/app/news-sitemap.xml/route.ts` 16–27）。
- canonical/hreflang 缺口：给 `apps/web/app/[locale]/peringkat/page.tsx`（20–25）与 locale layout 的 `generateMetadata`（`apps/web/app/[locale]/layout.tsx` 34–63）加 `buildAlternates` — 两处当前都**缺失**。同时修文章 sitemap 条目，补 `alternates.languages`（`apps/web/app/sitemap.ts` 128–137）。

## B5. 验证
- 直播刷新：在直播（或模拟）比赛期间，确认 `/api/live/[fixtureId]` 在轮询间隔内返回更新后的比分，且头部 + 时间线无需 rebuild 即更新。
- Rich Results Test：测一个比赛 URL（SportsEvent、BreadcrumbList、FAQ）和一个文章 URL（NewsArticle）。
- Discover 资格清单：大图 ≥1200px、recap 新鲜、结构化数据有效、canonical/hreflang 齐备、移动友好。
- 配额：通过 `apiq:YYYYMMDD` KV 计数确认每日 API-Football 用量在套餐内。

## 协作 / 边界
- SEO 文件归 codex：`sitemap.ts`、`news-sitemap.xml/route.ts`、`robots`、验证文件、`lib/seo.ts`、`json-ld.tsx`。B4 各项 + canonical 修复在此**仅出方案** — 由 codex 实现。
- 不要碰 Phase-2 基础设施：`apps/web/middleware.ts`、`apps/web/app/og/route.tsx`、auth 流程。
- B2 的 `/prediksi` 快照修复与 B3 的比赛页岛都必须遵守"运行时不碰 DB"不变量。

## 完成判据
- KV 在 jobs+web 绑定；直播采集 cron 写快照 + `fixture_events`；配额守护生效。
- `/api/live` 边缘路由只读 KV；比赛页头部 + 事件在窗口内实时更新；页面保持 SSG。
- `/prediksi` 不再 500（改读 KV 快照）。
- Discover/News 修复（B4）由 codex 实现；Rich Results + canonical 验证通过。
