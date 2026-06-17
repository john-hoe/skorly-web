# 方案 C — 管理后台（codex 可执行）

状态：需求已确认。权限=复用 Supabase + `profiles.role='admin'`；位置=同一 web app 的 `/admin`（noindex + 门控）；范围=分期（先看板+高频写操作，其余后补）；模块=全选（看板/内容/评论/用户/订阅者/运营/赛事数据/媒体）。执行方：codex app。
本方案作者：规划 agent。

## 0. 现状与关键事实（已核实）
- 已有角色：`packages/db/src/schema.ts` 的 `profiles` 表（262–279）含 `role`（272，`member | premium | admin`，默认 member），还有 `consentMarketing`、`consentAt`、`deletedAt`、`whatsappNumber`、`favoriteTeamId`、`locale`。后台权限直接复用，无需新账号体系。
- 已有"运营操作"雏形：`apps/jobs/src/index.ts` 的 fetch 处理器（61）暴露 5 个手动端点：`/__run/ingest`、`/__run/notify`、`/__run/premium-email`、`/__run/posters`、`/__run/seed-identities`（64–87）。
- ⚠️ 安全隐患（必修）：上述 `/__run/*` 端点**完全无鉴权**，任何人可触发抓取/群发邮件/生成海报。后台方案需顺手堵上（见 §4）。
- 目前无任何 `/admin` 页面。
- 相关数据表（`schema.ts`）：`articles`(189)、`subscribers`(226)、`comments`(285)、`commentLikes`(305)、`commentReports`(319)、`fixtures`(109)、`fixtureEvents`(141)、`standings`(160)、`predictions`(367)、`campaignEntries`(351)、`imageLibrary`(447)、`pushSubscriptions`(501)、`teamIdentities`(473)。
- 鉴权辅助：`apps/web/lib/supabase/server.ts` 的 `getSessionUser()` 已是 try/catch 韧性实现。

## 架构注意（重要）
后台页面是**动态 SSR、运行时读 DB**，这与公开页"运行时 Worker 不碰 DB"的不变量相反。但后台是**低流量 + 已鉴权**，风险可控，与公开高流量页（如曾 500 的 `/prediksi`）区别对待：
- 所有 `/admin` 路由显式 `export const dynamic = "force-dynamic"`。
- DB 读写用现有韧性客户端 + try/catch，失败降级为友好错误而非整页崩。
- 后台**不要**走 SSG/快照那套；它本就该实时读库。

## 1. 阶段划分（按 phased）
- 阶段 0 地基：门控 + 布局 + 导航壳 + `requireAdmin()` + noindex + 审计日志表。
- 阶段 1（最高价值先做）：看板（只读）+ 运营操作（堵 `__run` 安全 + 后台按钮）。运营安全是当前最紧急项。
- 阶段 2：评论审核 + 用户/角色管理。
- 阶段 3：内容管理 + 订阅者管理。
- 阶段 4：赛事/数据运维 + 媒体库。

## 阶段 0 — 地基
- 位置：非本地化路由 `apps/web/app/admin/**`（后台不需要 i18n）。
- 中间件放行：`apps/web/middleware.ts` 的 matcher 负向前瞻里加入 `admin`（与现有 `og` 同款一行改动）：`"/((?!api|auth|og|admin|_next|_vercel|.*\\..*).*)"`。⚠️ middleware 属 Phase-2 基础设施且 codex 也会碰 → **此一行改动需与 codex 排队，单一 owner**。
- 门控：新建 `apps/web/lib/admin.ts` 导出 `requireAdmin()`：取 `getSessionUser()` → 查 `profiles.role`；非 `admin` 则 `redirect` 到首页（或返回 404，避免暴露后台存在）。
- 布局：`apps/web/app/admin/layout.tsx`（server component）首行调用 `requireAdmin()`；`export const dynamic = "force-dynamic"`；`metadata.robots = { index:false, follow:false }`；渲染侧边导航（看板/内容/评论/用户/订阅者/运营/赛事/媒体）。
- 审计日志：新增表 `admin_audit_log`（`packages/db/src/schema.ts` + drizzle migration）：id、actorId(uuid)、action(text)、target(text)、meta(jsonb)、createdAt。所有写操作/运营触发都写一条，便于追责。
- 只读聚合查询统一放 `packages/db/src/queries.ts`（命名前缀 `admin*`），写操作放 `apps/web/lib/admin-actions.ts`（server actions，每个开头 `await requireAdmin()`）。

## 阶段 1A — 数据看板（只读）
- 路由 `apps/web/app/admin/page.tsx`（首页即总览）。
- 与 Spec A 的 `/admin` 指标页**合并**为同一处（避免两套后台）。
- 卡片/图表数据（一手 SQL，不依赖客户端分析）：
  - 用户：`profiles` 总数、近 7/30 天新增、按 role 分布、按 locale 分布、`deletedAt` 注销数。
  - 预测：`predictions` 总量、近 7 天活跃预测者（= Spec A 北极星 WAP）、人均预测数。
  - 订阅：`subscribers` 总数 / 已确认 / email vs whatsapp、近 7 天新增；`pushSubscriptions` 数。
  - 内容：`articles` 按 status/type/locale 计数、近 48h 发布数（与 news-sitemap 口径对齐）。
  - 互动：`comments` 总数/近 7 天、`commentReports` 待处理数（高亮）。
  - 活动：`campaignEntries` 参与数。
- 实现：`adminOverviewStats()` 单次聚合查询集合；页面 `force-dynamic`。

## 阶段 1B — 运营操作（含安全修复，紧急）
- 安全修复（先做）：给 `apps/jobs` 的 `/__run/*`（`index.ts` 61–88）加鉴权——校验请求头 `x-admin-secret` 等于新环境变量 `JOBS_ADMIN_SECRET`，不符返回 401。env 接线同 `apps/jobs/src/env.ts` + `wrangler.toml`。
- 后台触发：`apps/web/lib/admin-actions.ts` 内的 server action 持有 `JOBS_ADMIN_SECRET`，通过 **Cloudflare service binding（web→jobs，首选）** 或带密钥的 `fetch` 调用对应 `/__run/*`；不把密钥下发到客户端。
- 后台 UI：`apps/web/app/admin/operations/page.tsx` 给 5 个任务各一个按钮 + 最近结果展示：ingest fixtures、score & notify、premium email、generate posters、seed identities。每次点击写 `admin_audit_log`。
- 危险操作（premium-email 群发）加二次确认。

## 阶段 2A — 评论审核
- 路由 `apps/web/app/admin/comments/page.tsx`：列表默认按 `commentReports`（319）待处理优先；支持按文章/用户筛选。
- 操作（`admin-actions.ts`）：删除评论（软删，给 `comments` 加 `deletedAt` 若无）、封禁作者（见 2B 改 role 或加 banned 标记）、标记举报已处理。
- 数据：`comments`(285) + `commentReports`(319) + `commentLikes`(305) 关联展示。

## 阶段 2B — 用户与会员
- 路由 `apps/web/app/admin/users/page.tsx`：搜索（email/displayName）、分页、显示 role/locale/创建时间/注销状态。
- 操作：改 `role`（member↔premium↔admin）、软封禁（`profiles.deletedAt` 或新增 `bannedAt`）、查看单用户的预测/评论/订阅。
- 安全：改 admin 角色属高危，写审计日志 + 二次确认；禁止把自己降级导致无人可管（保留至少一个 admin 的保护逻辑）。

## 阶段 3A — 内容管理
- 路由 `apps/web/app/admin/content/page.tsx`：`articles`(189) 列表，按 status/type/locale/publishedAt 筛选与搜索。
- 操作：发布/下架（改 status）、编辑标题/正文/封面、设置/修正 `publishedAt`、删除。
- 与 SEO 协同：下架会影响 sitemap / news-sitemap，提示注意；不直接改 SEO 文件（归 codex）。

## 阶段 3B — 订阅者管理
- 路由 `apps/web/app/admin/subscribers/page.tsx`：`subscribers`(226) 列表，区分 email/whatsapp、已确认/未确认、locale。
- 操作：导出 CSV、手动确认/退订、按 locale 触发定向广播（复用 premium-email 管道，走运营操作的鉴权通道）。

## 阶段 4A — 赛事/数据运维
- 路由 `apps/web/app/admin/matches/page.tsx`：`fixtures`(109) 列表（status/日期/比分/elapsed）、`standings`(160) 快照、`fixtureEvents`(141) 查看。
- 操作：手动对单场触发补抓（接 Spec B 的直播采集：补抓比分 + 回填 `fixture_events`）、手动改某场 status（如误判 live/finished）。
- 与 Spec B 协同：直播采集/`fixture_events` 写入者由 Spec B 实现，本后台只提供"手动触发单场补抓"入口。

## 阶段 4B — 媒体库
- 路由 `apps/web/app/admin/media/page.tsx`：`imageLibrary`(447) 列表（按 fixtureId/kind），缩略图预览、状态（pending/ready）。
- 操作：对单场重新生成海报（接 `generatePosters` 管道）、删除/替换 URL。

## 2. 安全与边界
- 每个 server action 第一行 `await requireAdmin()`；每个 `/admin` 页面经 `layout.tsx` 的 `requireAdmin()` 兜底。
- `/admin` 全量 noindex；不进任何 sitemap。
- `JOBS_ADMIN_SECRET` 只存服务端（web server action + jobs env），绝不下发客户端。
- 不要碰：`apps/web/app/og/route.tsx`、auth 流程。`middleware.ts` 仅加一行放行（与 codex 排队）。SEO 文件（sitemap/news-sitemap/robots/lib seo/json-ld）归 codex。
- 所有写操作与运营触发写 `admin_audit_log`。

## 3. 验证 / 完成判据
- 非 admin 用户访问任意 `/admin/*` 被 redirect/404；admin 用户可进。
- 看板各卡片数字与直接 SQL 查询一致。
- `/__run/*` 无密钥返回 401；后台按钮带密钥可正常触发，并落审计日志。
- 评论/用户/内容/订阅者/赛事/媒体各模块的读与写在 admin 下可用，非 admin 不可用。
- `/admin` 不出现在 sitemap、被 robots/noindex 排除。
- 后台页面运行时读库失败时降级为错误提示，不整页 500。

## 4. 建议落地顺序（给 codex）
1）阶段 0 地基 + 阶段 1B 的 `__run` 安全修复（紧急止血）。
2）阶段 1A 看板（与 Spec A 的 /admin 合并）。
3）阶段 2 评论审核 + 用户管理。
4）阶段 3 内容 + 订阅者。
5）阶段 4 赛事数据 + 媒体。
