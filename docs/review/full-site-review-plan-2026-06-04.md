# Full Site Review Plan - 2026-06-04

本文件是 Skorly 全站 review 的执行方案和验收标准。它只定义如何检查、如何判定、如何记录，不替代修复实现。

> 操作总入口与流程规则见 `docs/review/review-operating-rules.md`（agent 先读那份）。

## Objective

对当前全站做一次可复现、可量化、覆盖完整的验收审计，覆盖：

- 所有公开页面、登录态页面、API、Server Actions、SEO/PWA/AMP、外部依赖、后台任务。
- 所有核心用户流程：访问、注册、邮箱验证、登录、订阅、预测、bracket、mini league、评论、通知、语言切换。
- 所有体验层面：UI、UX、移动端、桌面端、本地化、可访问性、性能、异常状态、空数据状态。

第一性原则：站点可用不等于页面能打开。一个模块只有同时满足入口可达、数据可信、交互闭环、异常可恢复、状态一致、用户可理解、搜索引擎可理解，才算通过。

## Non-Goals

- 本 review session 不做业务代码修复。
- 不以“看起来正常”作为通过标准。
- 不把生产偶发 5xx 当作可忽略噪音；只要能复现或有日志证据，就必须记录。
- 不用本地通过替代生产通过，尤其是 Cloudflare Worker、Supabase Auth、邮件、Turnstile、Web Push。

## Evidence Protocol (防偷懒，强制)

目的：杜绝 reviewer 不实际执行就把项目标成完成。**第一性原则：没有可复现证据，就等于没做。**

硬规则：

1. **Evidence-or-it-didn't-happen**：matrix 任何一行从 `Pending` 变更状态，必须在 `docs/review/review-evidence-2026-06-04.md` 留一条 `E-<n>`，并把该 ID 填回 matrix 的 `Finding` 列。无 `E-<n>` 的 `Pass` 在复核时直接降级回 `Pending` 重做。
2. **证据必须可复现**：贴确切命令/URL/Chrome 步骤 + 原始输出片段 + 环境(local/prod) + UTC 时间戳。截图/录屏给文件路径。
3. **证据必须对应验收标准**：贴的输出要能直接证明该行 Acceptance 成立，含糊或不相关的输出算无效证据。
4. **禁用词**（出现即判该项未完成，必须返工）：`应该`/`大概`/`看起来正常`/`probably`/`should work`/`looks fine`/`assume`/无输出的"已验证/已检查"。
5. **批量声明无效**：禁止"全部通过""都没问题"这种没有逐项 `E-<n>` 的总结。一项 = 一条证据。
6. **生产类必须双证据**：运行时/认证/邮件/Worker 相关项，必须同时有 Chrome 证据 + `wrangler tail` 片段，缺一不可。
7. **抽查闸门**：进入 fix session 前，复核者随机抽 ≥20% 的 `Pass` 行重跑其 `E-<n>`。任意一条复现失败 => 该 reviewer 全部 `Pass` 视为不可信，整批降级 `Pending` 重做，并记一条 process finding。
8. **覆盖闸门**：matrix 中仍为 `Pending` 的行，不算通过、不算失败，只算"未做"；review 不得在有 `Pending` 行时宣称完成。

每类检查的最低证据（与 matrix 的 Evidence Discipline 表一致）：

| Check Type | 最低证据 |
| --- | --- |
| 页面状态 | URL + HTTP 状态码 + 时间戳，4 个 locale 各一条 |
| 性能 p95 | 原始 5 次耗时数字（不能只写"快"） |
| UI/UX 视口 | 每分辨率截图路径 + `document.documentElement.scrollWidth` / `window.innerWidth` 实测值 |
| 写操作/Server Action | action 返回 + 刷新后持久化证据 + `wrangler tail` 片段 |
| SEO/内容 | 渲染 HTML 的 meta/canonical/JSON-LD 片段或校验器结果 |
| 安全/越权 | 用户 A 取用户 B 资源的真实请求+响应（被拒证据） |
| 错误/404 | 触发 URL + 状态码 + 截图 |
| 交互/嵌入 | 触发前后截图/录屏 + console |

## Severity Model

| Severity | Definition | Examples |
| --- | --- | --- |
| P0 | 阻断核心生产能力，或使关键链路无法闭环 | 生产构建失败、注册/邮箱验证无法登录、Worker 1101/5xx、保存预测失败、认证绕过、数据泄露 |
| P1 | 核心功能可进入但稳定性、性能、合规、关键 UX 明显不达标 | 10s 级动态页面、移动端横向滚动、全站 footer 法务链接 404、News sitemap 过期 |
| P2 | 局部质量问题，影响信任、SEO 细节、可访问性、文案或一致性 | meta 语言污染、hreflang 不一致、icon-only button 无 aria-label、PWA icon 质量问题 |

## Global Pass Criteria

全站 review 的最终通过标准：

- Open P0 count = 0。
- 核心生产用户流程通过率 = 100%。
- sitemap 中非预期 4xx/5xx URL = 0。
- 登录态核心流程验证期间 Cloudflare Worker exception = 0。
- 核心移动端页面横向溢出 = 0，标准是 `document.documentElement.scrollWidth <= window.innerWidth + 1`。
- 关键页面 console error = 0，除非有明确记录且不影响用户流程。
- 所有新发现问题都写入 findings 文档，包含证据、复现方式、严重级别、修复验收标准。
- matrix 无 `Pending` 行：每行都有终态状态 + 对应 `E-<n>` 证据；无证据的 `Pass` 不计入通过。
- 抽查闸门通过：随机重跑 ≥20% 的 `Pass` 行证据全部复现成功。

P1/P2 可以排期，但不能没有记录和验收标准。

## Required Review Artifacts

本次 review 至少产出这些文档或更新：

- `docs/review/full-site-review-plan-2026-06-04.md`：本计划和验收标准。
- `docs/review/full-site-review-matrix-2026-06-04.md`：完整覆盖矩阵，含 Interactive Inventory（按钮级覆盖证明）。
- `docs/review/review-findings-2026-06-03.md`：上一轮 findings，本轮作为**回归基线**只读引用（复验已标记 Fixed 的 P0/P1 是否回退）。
- `docs/review/review-findings-2026-06-04.md`：本轮**新建**，只记录本轮已验证问题（含从 06-03 回退的回归项，标 `Reopened`）。
- `docs/review/review-evidence-2026-06-04.md`：本轮**新建**，每个检查的可复现证据账本（`E-<n>` 一条一行）。matrix 里任何 `Pass`/`Fail` 都必须有对应 `E-<n>`。

Findings 文件日期约定：读 `06-03` 做回归基线，所有新发现/回退写入 `06-04`，不要把新问题混写进 `06-03`。

每个 finding 必须使用这个格式：

```text
### <P0/P1/P2>-<number> <short title>

Status:
- Open / Fixed / Reopened / Needs external verification

Evidence:
- Exact URL / command / screenshot / log / console / response body

Impact:
- User, SEO, data, security, compliance, or ops impact

Reproduce:
- Minimal steps or commands

Fix acceptance:
- Concrete pass criteria after repair
```

## Review Environments

| Environment | Purpose | Pass Requirement |
| --- | --- | --- |
| Local type/build/test | Engineering gate | All commands exit 0 |
| Local production server | Fast deterministic UI/HTML checks | HTML, metadata, static pages match expected output |
| Production `https://skorly.cc` | Real user/runtime validation | Core flows pass against Cloudflare, Supabase, email, cache, external services |
| Chrome authenticated profile | Logged-in and mailbox-dependent checks | Must use real session for auth/email flows |
| Cloudflare tail/logs | Runtime stability proof | No Worker exception during verified flows |

## Baseline Commands

Run before deeper review and after any fix batch:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @skorly/api-football test
pnpm --filter @skorly/predict-model test
```

Acceptance:

- Every command exits `0`.
- Build page count changes must be explained.
- Static generation must complete without timeout.
- No command should be skipped unless the blocker is recorded.

## Phase 0 - Regression Baseline

Goal: 确认上一轮已修复的问题没有回退，再开始新检查。

Steps:

- 通读 `docs/review/review-findings-2026-06-03.md` 中所有 `Status: Fixed` 的 P0/P1。
- 对每个有明确复现命令/URL 的 Fixed 项，重跑其原始复现步骤。
- 重点复验：生产构建 SSG 超时（06-03 P0-1）、注册/邮箱验证闭环、Worker 1101/5xx、保存预测/bracket。

Acceptance:

- 每个被复验的 Fixed P0/P1 仍然通过；若回退，在 `06-04` 新建 finding 并标 `Reopened`，引用原编号。
- 不能复现的（缺命令/外部依赖）标 `Needs external verification`，不默认通过。

## Phase 1 - Inventory

Goal: define what must be reviewed before judging anything.

Inventory sources:

- Next app route tree under `apps/web/app`.
- Production `/sitemap.xml` and `/news-sitemap.xml`.
- Header, footer, locale switcher, cards, CTA links.
- API routes under `apps/web/app/api`.
- Server Actions and client islands under `apps/web/lib` and `apps/web/components`.
- Auth routes, email templates, Supabase Dashboard redirect settings.
- Background jobs and generated content pipeline.

Acceptance:

- Every route is classified as public, authenticated, API, SEO endpoint, AMP, or internal.
- Every nav/footer/card link is mapped to an expected final 200 URL or expected 4xx.
- Every user-write action is mapped to UI action, network/API/action handler, and persistence check.

### Phase 1.5 - Interactive Inventory (按钮级覆盖闸门)

Goal: 证明「代码里有的交互 = matrix 里有的行」，避免漏测按钮/嵌入/island。

Steps:

- 枚举 `apps/web/components/**` 与 `apps/web/lib/*actions*.ts` 的所有交互：`onClick`、`<form>`/`onSubmit`、`type="submit"`、`signInWith*`、clipboard、外部 `iframe`/embed、客户端数据 island（`useEffect` 拉数据）。
- 把每个交互映射到 matrix 的 Interactive Inventory Matrix 一行，再映射到一条 User Flow 行。

Acceptance:

- matrix 的 Interactive Inventory Matrix 覆盖所有枚举到的交互；新增/遗漏即为 finding。
- 已知必查交互：OAuth 登录、premium 解锁、league 邀请复制、多面 share、首页个性化、public picks、article load-more、外部媒体嵌入。

## Phase 2 - Public Route Health

Scope:

- Home pages for all locales.
- Score/live-score pages.
- Schedule.
- Teams and team detail.
- Match detail.
- News index, archive, article detail.
- Ranking.
- World Cup hub.
- Web Stories index and AMP story detail.
- Watch/Nonton.
- Auth pages in logged-out state.

Acceptance:

- GET status is 200 for expected public pages.
- Expected 404 pages return 404, not 500.
- 404/500 错误页是品牌化、本地化页面（当前仓库无 `not-found.tsx`/`error.tsx`/`global-error.tsx`，需确认走的是框架默认还是有要求要自定义；缺失即按需求判定 P1/P2）。
- No page returns Cloudflare 1101, 503, timeout, or unexpected redirect.
- Same representative route passes at least 5 sequential production requests.
- p95 response time:
  - SSG/static page: `<800ms` preferred, `<1500ms` maximum.
  - Dynamic public page: `<1500ms` preferred, `<3000ms` maximum.
  - Any 10s fallback on normal traffic is a P1 minimum.

## Phase 3 - Auth And Account Flows

Scope:

- Register.
- Email confirmation.
- Login.
- Logout.
- Forgot password.
- Password reset.
- Account page.
- Authenticated user visiting `/masuk` and `/daftar`.
- OAuth sign-in (Google/Facebook) and its `NEXT_PUBLIC_ENABLE_OAUTH` gate.
- Auth email rendering in a real mail client.

Acceptance:

- Fresh registration email link uses production redirect:
  - `redirect_to=https://skorly.cc/auth/callback?...`
  - never `http://localhost:3000` in production email.
- After clicking real email confirmation link, Chrome lands on `skorly.cc` and can access `/id/akun`.
- Supabase `email_confirmed_at` is non-null for the test user.
- Logged-in `/id/akun` renders without Worker 1101/503.
- Logged-out protected route redirects to localized login.
- Logged-in users are not shown a normal login/register form unless intentionally designed and documented.
- Auth verification must use Chrome and real email delivery, not only curl.
- OAuth：检查 `NEXT_PUBLIC_ENABLE_OAUTH`。关 => 登录/注册页不渲染 Google/Facebook 按钮；开 => provider 在 Supabase 已配置、callback 在 allow list、整条 OAuth 回调链路落到 `/{locale}/akun` 且建立有效 session。
- 认证类邮件（确认/重置）在真实邮件客户端中渲染正常、链接指向生产，不只验证投递成功。

## Phase 4 - Logged-In Product Flows

Scope:

- Save match score prediction.
- Load forecast/prediction card.
- Premium content unlock (guest preview vs logged-in full plan).
- Public picks distribution card.
- Home personalization card (logged-in).
- Save bracket.
- Create mini league.
- Join mini league.
- Open mini league detail.
- League invite link generation, copy, and share.
- Post comment.
- Like/report comment.
- Web Push subscribe/unsubscribe.
- Live score/event polling and external media embeds.

Acceptance:

- Each write flow must prove three layers:
  - UI shows success or intended state.
  - Network/API/Server Action returns success, not 500/hung.
  - Data persists after refresh or appears in the expected follow-up page.
- During Chrome verification with `wrangler tail`, Worker exception count must be `0`.
- Client islands must resolve or show explicit fallback within `3000ms`; indefinite skeletons fail.
- Validation failures must show specific localized messages.
- Premium 授权边界：游客调用 `getPremiumArticle` 必须返回 `{authorized:false}` 且响应体无 premium HTML；仅登录/订阅者拿到完整方案。
- 实时比分/事件：`getLiveScores`/`getEvents` 轮询间隔有界、比赛进行中能刷新、断网恢复后能续传，且无失控请求循环。

## Phase 5 - API And Edge Cases

Scope:

- `/api/subscribe`.
- `/auth/callback`.
- confirm/unsubscribe token routes.
- API method guards.
- Invalid JSON.
- Missing fields.
- Missing/invalid Turnstile token.
- Rate-limit behavior.
- Unauthorized access.

Acceptance:

- Invalid input returns clear 4xx, not 500.
- Unsupported method returns 405.
- Missing auth returns 401/403 or redirect as designed.
- Error body is stable enough for UI mapping.
- No stack trace, service key, token, or private environment value is exposed.
- Intermittent 503 on early-validation paths is at least P1 and may be P0 if tied to production Worker instability.

## Phase 6 - UI/UX Review

Viewport matrix:

| Device Class | Viewport |
| --- | --- |
| Small mobile | 360x740 |
| Standard mobile | 390x844 |
| Large mobile | 430x932 |
| Tablet | 768x1024 |
| Desktop | 1440x900 |

Scope:

- Header/navigation.
- Locale switcher.
- Footer.
- Cards and lists.
- Forms.
- Match page above-the-fold hierarchy.
- Article reading layout.
- Live-score tables.
- Bracket builder.
- Mini league screens.
- Comments.
- Empty/loading/error/disabled states.

Acceptance:

- Horizontal overflow = 0 on every core page and viewport.
- Text does not overlap or escape containers.
- Buttons have stable dimensions and do not shift layout when state changes.
- Loading states resolve or show bounded fallback.
- Empty states explain what happened and what the user can do next.
- Error states are specific enough to guide recovery.
- Primary page context is visible above the fold on mobile and desktop.
- Header/footer remain usable in all locales.

## Phase 7 - Accessibility

Scope:

- Keyboard navigation.
- Focus visible state.
- Icon-only buttons.
- Form labels.
- Error message association.
- Heading order.
- Color contrast.
- Menu/modal focus behavior.

Acceptance:

- Every interactive control has a useful accessible name.
- Icon-only buttons have localized `aria-label`.
- Keyboard-only user can complete login, register, subscribe, prediction, bracket, and comment flows where applicable.
- Focus indicator is visible.
- Body text contrast ratio is at least `4.5:1`.
- Large text contrast ratio is at least `3:1`.
- Heading order is logical; representative detail pages should have one primary H1 unless there is a documented reason.

## Phase 8 - SEO, Content, And Localization

Scope:

- Canonical URLs.
- hreflang and `x-default`.
- Sitemap alternates.
- Open Graph/Twitter metadata.
- JSON-LD.
- Robots.
- News sitemap.
- AMP Web Stories.
- Titles, descriptions, H1s.
- Localized routes and localized slugs.
- Language contamination.
- Protected acronyms and terms.

Acceptance:

- Canonical points to final 200 URL.
- Rendered metadata and sitemap alternates agree.
- `zh-Hans` remains `zh-Hans`; `x-default` points to the intended final URL, not a redirecting intermediate route.
- News sitemap contains only URLs within the last 48 hours.
- Non-English locale visible text, card summaries, meta description, Open Graph description, and Twitter description contain no unintended English source text.
- Protected terms like `USA`, `USMNT`, `FIFA`, team names, and country codes are not mistranslated.
- AMP story downloaded HTML passes AMP validation when production returns normal HTML.
- JSON-LD parses and matches the visible page entity，并用 Google Rich Results / schema 校验器对关键类型（article/match/team/breadcrumb）实测通过，不只本地 `JSON.parse`。
- 开赛时间/时区：赛程、比分、比赛详情、倒计时显示的时间与源 UTC 一致，跨 ID/VI/EN/ZH 市场无时区错位，日期/数字格式本地化。
- i18n key 完整性：无原始 `namespace.key` 字符串漏到页面；缺 key 优雅回退，不出现空白或崩溃。
- `/og` 至少抽样 1 个按文章/比赛参数生成的动态 OG 图（渲染正确实体、绝对 URL、无 edge shim 失败）+ 1 个默认。

## Phase 9 - PWA And Browser Platform

Scope:

- `/manifest.webmanifest`.
- Icons.
- `theme_color`, `background_color`, app name.
- `/sw.js`.
- Installability basics.
- Web Push permission and subscription state.

Acceptance:

- Manifest returns 200 with valid JSON.
- App icons are real square icons such as 192x192 and 512x512.
- Open Graph images are not used as PWA app icons.
- Service worker returns 200 and does not break navigation.
- 离线行为：断网导航显示缓存壳/离线兜底而非硬崩溃；SW 更新不会卡在过期资源。
- Web Push UI has clear states: unavailable, denied, idle, busy, subscribed.
- Notification controls have accessible names.

## Phase 10 - Performance And Stability

Measure both local production and real production.

Acceptance thresholds:

| Surface | Preferred | Maximum Before Finding |
| --- | --- | --- |
| Static HTML TTFB p95 | `<800ms` | `>=1500ms` |
| Dynamic public page p95 | `<1500ms` | `>=3000ms` |
| Logged-in dynamic page p95 | `<3000ms` | `>=5000ms` |
| Core client island resolution | `<3000ms` | indefinite skeleton or `>=5000ms` |
| Mobile LCP | `<2500ms` | `>=4000ms` |
| CLS | `<0.1` | `>=0.25` |
| INP | `<200ms` | `>=500ms` |

Stability acceptance:

- No Cloudflare Worker 1101/503 during core review flows.
- No hung Server Action POST.
- No unbounded DB read in production request path.
- Cache headers match route intent.
- Redeploy or cache purge behavior is verified for sitemap/news sitemap changes.
- 图片：`next/image` 在源 404 / CDN 慢时有占位/兜底，不破坏布局；比例正确、懒加载工作。

## Phase 11 - Security, Privacy, And Compliance

Scope:

- Supabase Auth redirect allow list.
- Email templates.
- RLS-sensitive reads/writes.
- API auth checks.
- Token-bearing links.
- Privacy and terms pages.
- Marketing consent.
- Unsubscribe/confirm links.

Acceptance:

- Footer legal links resolve to real pages in all locales or to intentional top-level pages.
- No authenticated-only data appears to logged-out users.
- User A cannot access User B prediction, league, profile, or subscription state.
- Public client bundle does not expose service-role secrets or private keys.
- Email links do not leak long-lived secrets beyond intended tokens.
- Unsubscribe and confirm flows are single-purpose and handle invalid tokens safely.
- 安全响应头存在且合理：CSP、X-Frame-Options、X-Content-Type-Options、Referrer-Policy、HSTS；无点击劫持、无过度宽松 CSP。
- 生产环境认证 cookie 正确设置 `HttpOnly`、`Secure`、`SameSite`。
- Analytics/同意：确认埋点（`docs/specs/A-analytics-funnel.md`）是否已上线。已上线 => 事件触发 + 同意横幅生效；未上线 => 在 findings 显式标注 OUT OF SCOPE，不留模糊。

## Phase 12 - Background Jobs And Data Quality

Scope:

- News generation.
- Translation.
- Summary generation.
- Team/match data sync.
- Forecast/model output.
- Cache/revalidation.
- Build-time data reads.

Acceptance:

- Generated content lands in the correct locale.
- Summaries are generated from localized body, not source-language text.
- Job failures are observable in logs.
- Data freshness is measurable and documented per data type.
- Build-time data reads are cached/batched enough that static generation does not regress into timeout.
- Production cache output matches current deployed code.

## Module Coverage Matrix

| Module | Guest | Logged-In | UI/UX | SEO | API/Data | Acceptance Summary |
| --- | --- | --- | --- | --- | --- | --- |
| Home | Yes | Header state | Responsive hero/content | canonical/hreflang/OG | countdown/data | 200, no overflow, localized content, metadata correct |
| Live scores | Yes | Optional user state | Tables fit mobile | canonical/hreflang | live refresh action/API | p95 under threshold, no Server Action 500 |
| Schedule | Yes | Same public view | Filters/cards fit | sitemap/canonical | fixtures | All links 200, no 10s normal path |
| Teams | Yes | Same public view | Grid/cards fit | sitemap alternates | team DB | All team sitemap URLs 200 |
| Team detail | Yes | Same public view | Header/squad/fixtures | JSON-LD/canonical | team/squad/fixtures | 200, correct 404 for bad slug |
| Match detail | Yes | Prediction widgets | Above-fold context | Sports/Event schema | match/article/prediction | prediction/forecast/comments resolve or fallback |
| News | Yes | Same public view | Cards readable | News metadata | article DB | No language contamination |
| Archive | Yes | Same public view | Filters usable | canonical | article DB | Filters work, summaries localized |
| Article detail | Yes | Same public view | Reading layout | canonical/OG/JSON-LD | article/source links | Internal URNs hidden, metadata localized |
| Web Stories | Yes | Same public view | Cards/story view | AMP valid | match/story data | AMP validates when 200 HTML returned |
| Ranking | Yes | Same public view | Table responsive | canonical | predictions/stats | Share buttons no hydration mismatch |
| Auth | Register/login/reset | Account/logout | Forms/errors | noindex where intended | Supabase Auth | Real email verification loop passes |
| Account | Redirect when guest | Profile/data | Empty/loading/error | noindex | profile/predictions | No Worker 1101, bounded fallbacks |
| Predictions | Login prompt | Save/read | Form states | noindex if user-specific | Server Action/API | Save persists after refresh |
| Bracket | Guest local flow | Save/read | Builder responsive | noindex if user-specific | bracket data | Save success and persists |
| Mini league | Prompt | Create/join/detail | Forms/list states | noindex if private | league data | Create/join/detail pass |
| Comments | Read if public | Post/like/report | Error/loading states | page-level only | comment actions | No hung action, validation clear |
| Subscribe | Yes | Yes | Captcha/error states | form context | subscribe API/email | Invalid input 4xx, success sends email |
| Notifications | Capability check | Subscribe/unsubscribe | Accessible icon states | N/A | Push subscription | State is clear and accessible |
| Footer/legal | Yes | Yes | Links visible | index policy decided | content pages | Privacy/terms are real pages |
| PWA | Yes | Yes | Install basics + offline | manifest | sw/icons | Valid square icons, SW, offline fallback |
| OAuth | Gated buttons | Provider round-trip | Buttons only when enabled | noindex | Supabase providers | Gate off hides buttons; gate on lands valid session |
| Premium content | Free preview | Full plan unlock | Preview/unlock states | noindex | `getPremiumArticle` | Guest cannot get premium HTML |
| External embeds | Read | Read | Bounded height + fallback | N/A | recap embeds | Only official sources; fallback link when unembeddable |
| Error/404 pages | Yes | Yes | Branded localized page | noindex | framework/custom | 404/500 localized, not raw default |
| Analytics/consent | Capability check | Capability check | Consent banner if live | N/A | tracking spec | Live: events+consent; else OUT OF SCOPE |

## Execution Order

1. Run baseline commands（lint/typecheck/build + 两个包 test 全绿，页数变化要解释）。
2. Regression baseline：复验 `06-03` 已 Fixed 的 P0/P1，没回退（回退项写 `06-04` 标 `Reopened`）。
3. Generate inventory + coverage matrix（Phase 1）。
4. Interactive inventory：枚举所有按钮/表单/嵌入/island，确保每个交互都映射到 matrix 行（Phase 1.5）。
5. Scan production public routes and sitemap URLs（状态码 + p95 + 无效 slug 404 + 错误页）。
6. Run Chrome authenticated flows with Cloudflare tail（注册→邮箱验证→登录→OAuth→预测/bracket/league/评论/推送，三层验证 + Worker exception=0 + premium 授权边界）。
7. Run UI/UX viewport matrix（5 分辨率，横向溢出=0；含错误页/图片兜底/嵌入）。
8. Run SEO/content/localization checks（canonical/hreflang/x-default/JSON-LD 工具实测 + 语言污染 + key 泄漏 + 时区/时间）。
9. Run API/security/privacy checks（4xx 不 500、越权、bundle 泄密 + 安全头/cookie 属性 + analytics/consent）。
10. Run performance/stability checks（阈值表 + LCP/CLS/INP + 实时轮询 + PWA 离线）。
11. Run background jobs/data quality checks。
12. Record findings with severity and fix acceptance。
13. Hand the findings document to a dedicated fix session。

## Fix Session Acceptance Rule

A fix session may mark a finding fixed only when:

- The original reproduction no longer fails.
- The documented fix acceptance criteria pass.
- Relevant local gates pass.
- Production-only issues are verified in production.
- The findings document is updated with exact verification output.
- 修复验证也遵守 Evidence Protocol：留 `E-<n>` 可复现证据，禁用词同样适用，生产类需 Chrome + tail 双证据。

For the currently known production-runtime class of issues, local checks are not enough. A fix must include Chrome production verification plus Cloudflare tail evidence.

## Suggested Prompt For Review Session

```text
Read docs/review/review-operating-rules.md first, then docs/review/full-site-review-plan-2026-06-04.md, docs/review/full-site-review-matrix-2026-06-04.md, and docs/review/review-findings-2026-06-03.md. Continue the full-site review only; do not fix business code. Start with Phase 0 regression baseline (re-verify 06-03 Fixed P0/P1), then Phase 1 + 1.5 build a route/module inventory AND an interactive inventory (every button/form/embed/island maps to a matrix row). Verify every module against the acceptance standards including the new rows (OAuth, premium authorization, error pages, timezone, i18n key leak, security headers/cookies, analytics/consent, realtime polling, PWA offline). Follow the Evidence Protocol strictly: for every matrix row you change from Pending, write a reproducible E-<n> entry into docs/review/review-evidence-2026-06-04.md (exact command/URL + raw output + env + UTC time) and put that E-<n> in the matrix Finding column. A Pass without an E-<n> is invalid. Never use words like "should work" / "looks fine" / "assume" or batch-claim everything passed. Production/auth/email/Worker items need both Chrome evidence and wrangler tail snippets. Write confirmed issues with evidence and fix acceptance criteria into docs/review/review-findings-2026-06-04.md (regressions tagged Reopened). Leave no Pending row silently; if not verified, keep it Pending. Preserve unrelated working-tree changes.
```

## Suggested Prompt For Fix Session

```text
Read docs/review/review-operating-rules.md first, then docs/review/full-site-review-plan-2026-06-04.md and the latest docs/review/review-findings-*.md. Fix only the highest-priority open finding first. Do not mark a finding fixed until its documented acceptance criteria pass. Follow the Evidence Protocol: leave a reproducible E-<n> verification entry (exact command/URL + raw output + env + UTC time); no "should work"/"looks fine"/batch claims. For production-only issues, verify with Chrome against https://skorly.cc and Cloudflare tail, then write the exact verification output back to the findings document. Preserve unrelated working-tree changes.
```
