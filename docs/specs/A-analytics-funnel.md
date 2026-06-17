# 方案 A — 埋点 + 漏斗度量（codex 可执行）

状态：设计已确认（D1=GA4+PostHog，D2=现在就加 consent）。执行方：codex app。
本方案作者：规划 agent。未经确认不要改动产品决策。

## 目标
把站点从"零事件数据"变成可度量的漏斗。当前 GA4 只在 `apps/web/app/[locale]/layout.tsx`（第 25、105–123 行）做了 config，**零自定义事件**、无 analytics 辅助层。需新增类型化事件层（GA4 事件 + PostHog）、给 9 个转化点埋点、上线漏斗/留存看板、定义北极星指标、并加同意（consent）门控。

## A0. 依赖与环境变量
- 客户端：`posthog-js`。服务端（Cloudflare Workers）：**不要**用 `posthog-node`（依赖 Node API）；服务端事件用 `fetch` 直发 PostHog `POST {host}/capture/` 以及 GA4 Measurement Protocol。
- 新增环境变量（同步到 `env.example`、`scripts/sync-env.mjs`、Cloudflare secrets）：
  - `NEXT_PUBLIC_POSTHOG_KEY`
  - `NEXT_PUBLIC_POSTHOG_HOST`（如 `https://us.i.posthog.com` 或 EU host）
  - `GA4_API_SECRET`（Measurement Protocol 用；配合已有的 `NEXT_PUBLIC_GA_ID=G-98VPG3BHXS`）
- distinct id：已登录用 Supabase user id；未登录用写入 cookie 的一方匿名 id（只生成一次，客户端+服务端复用）。

## A1. 新建 `apps/web/lib/analytics.ts` — 类型化事件层
用可辨识联合类型定义事件，保证 payload 类型安全：
- `predict_submit` { fixtureId:number, league:string, home:string, away:string, predHome:number, predAway:number }
- `bracket_save` { numPicks:number, championTeamId:number|null }
- `signup` { method: "email"|"oauth" }
- `login` { method: "email"|"oauth" }
- `push_opt_in` {} / `push_opt_out` {}
- `email_subscribe` { locale:string, source:string }
- `league_create` { leagueId:number } / `league_join` { leagueId:number }
- `comment_post` { targetType:"article"|"prediction", targetId:string }
- `share_click` { channel:string, contentType:string, contentId:string }

导出：
- 客户端 `track(event, props)` → `posthog.capture(event, props)` + `gtag('event', event, props)`。未同意前为 no-op（见 A5）。
- 服务端 `trackServer(event, distinctId, props)` → `fetch` 发 PostHog `/capture/` + GA4 MP。必须 Workers 安全（无 Node-only API），且**绝不向调用方抛错**（try/catch 包裹）。
- `<AnalyticsProvider>` 客户端组件：仅在同意后初始化 `posthog-js` 一次；登录时调用 `posthog.identify(userId)`。挂载到 `apps/web/app/[locale]/layout.tsx`。

原则：**权威转化**在服务端 action 里采集（抗广告拦截/隐私插件）；客户端 `track` 用于记录 UI 意图/需要客户端上下文的漏斗。下述标注处两端都埋。

## A2. 9 个转化点埋点（精确位置）
- predict_submit — 服务端：`apps/web/lib/prediction-actions.ts` `submitPrediction`（41–66）成功后；客户端：`apps/web/components/predict-score.tsx` `onSubmit`（72–92）。
- bracket_save — 服务端：`apps/web/lib/bracket-actions.ts` `saveBracketAction`（27–44）；客户端：`apps/web/components/bracket-builder.tsx` `onSave`（88–106）。
- signup — 服务端：`apps/web/lib/auth-actions.ts` `signUpAction`（33–68）；客户端表单 `apps/web/components/auth/register-form.tsx`（23–27）。
- login — 服务端：`apps/web/lib/auth-actions.ts` `signInAction`（70–89）；客户端 `apps/web/components/auth/login-form.tsx`（23–35）。OAuth：`apps/web/components/auth/oauth-buttons.tsx`（15–21）。
- push_opt_in / push_opt_out — 服务端：`apps/web/lib/push-actions.ts` `subscribePush`（22–50）/ `unsubscribePush`（52–61）；客户端 `apps/web/components/notify-bell.tsx` enable（45–67）/ disable（73–81）。
- email_subscribe — 服务端：`apps/web/app/api/subscribe/route.ts` POST（16–75）；客户端 `apps/web/components/subscribe-gift-card.tsx`（19–39）。（可选：在 `apps/web/app/api/subscribe/confirm/route.ts` 32–39 再发一个 `email_confirm` 服务端事件。）
- league_create / league_join — 服务端：`apps/web/lib/league-actions.ts` `createLeague`（17–27）/ `joinLeague`（33–41）；客户端 `apps/web/components/league-create.tsx`（15–25）/ `apps/web/components/league-join.tsx`（30–41）。
- comment_post — 服务端：`apps/web/lib/comment-actions.ts` `postComment`（36–69）；客户端 `apps/web/components/comments-section.tsx`（121–136）。
- share_click — 仅客户端（无服务端 action）：`apps/web/components/share-buttons.tsx` native/social/copy 处理函数（47–83）；以及 `apps/web/components/bracket-builder.tsx` 的 WhatsApp 链接（约 221–228）。

## A3. 漏斗 / 留存看板
- PostHog（主）：在 PostHog UI 建漏斗。
  - 激活漏斗：pageview → (`predict_submit` 或 `bracket_save`) → `signup` → (`push_opt_in` 或 `email_subscribe`)。
  - 留存 cohort：以首次 `predict_submit`/`bracket_save` 为锚。
- 内部 `/admin` 指标页（次要，但为权威一手数据）：noindex、需鉴权的服务端页面，用 SQL 直接聚合已有数据表（predictions、subscribers、leagues/league_members、comments、campaign entries）。提供不依赖客户端分析/广告拦截的真实计数。（复用现有 DB 查询；在 `packages/db` 加只读聚合查询。）

## A4. 北极星 + 验证
- 北极星：周活预测者 WAP = 近 7 天内有 `predict_submit` 或 `bracket_save` 的去重用户数。
- 核心漏斗：访问 → 预测 → 注册 → 留存（D7）。
- 验证：上线前确认 9 个点的事件都能在 PostHog "Live events" 与 GA4 Realtime/DebugView 中看到。

## A5. 同意 consent（D2=现在）
- 新增轻量 `ConsentBanner` 客户端组件；同意结果存 cookie + localStorage。
- 所有分析都门控在同意之后：`<AnalyticsProvider>` 里的 PostHog 初始化、以及 `layout.tsx` 里的 GA `<Script>`/`gtag('config')`（当前只要设了 `gaId` 就无条件加载——必须改为 consent 门控）。
- 用户未选择前的默认：不加载 PostHog 与 GA。采用 opt-in 弹条（印尼 PDP 法 / 越南 PDPD）。

## 协作 / 边界
- `apps/web/app/[locale]/layout.tsx` **同时**被 codex 的 SEO 工作改动。GA 门控 + 挂载 AnalyticsProvider 会改这个文件 → 每轮单一 owner；与 codex 排队，**禁止并发改同一文件**。
- 不要碰 Phase-2 基础设施：`apps/web/middleware.ts`、`apps/web/app/og/route.tsx`、auth 流程。

## 完成判据
- `lib/analytics.ts` 存在、类型化、consent 门控、服务端路径不抛错。
- 9 个事件全部上报，PostHog + GA4 可见。
- consent 弹条门控分析。
- PostHog 可见 WAP + 激活漏斗；`/admin` 指标页渲染一手计数。
