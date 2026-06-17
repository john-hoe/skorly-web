# Full Site Review Matrix - 2026-06-04

本文件是全站 review 的覆盖矩阵。它回答三个问题：

- 哪些页面、模块、流程必须检查。
- 每个模块要用什么环境和状态检查。
- 什么结果才算通过。

状态字段在执行 review 时更新为 `Pending`、`Pass`、`Pass on staging seed`、`Fail`、`Blocked` 或 `Needs external verification`。发现问题时，不在本文件展开长证据，而是写入 `docs/review/review-findings-2026-06-04.md` 并在本文件记录 finding 编号。

## Status Legend

| Status | Meaning |
| --- | --- |
| Pending | 尚未验证 |
| Pass | 已按验收标准通过 |
| Pass on staging seed | 在隔离 review/staging seed 中按验收标准通过；不等同于真实生产数据状态通过 |
| Fail | 已确认失败，必须有 finding 编号 |
| Blocked | 被外部条件阻塞，例如邮箱、Turnstile、生产 Worker 不稳定 |
| Needs external verification | 本地可验证不足，必须用生产或第三方系统复核 |

## Evidence Discipline (强制)

这是防止 review 偷懒/自我宣称的硬约束。核心规则：**没有证据的 `Pass` 一律无效，等同 `Pending`。**

规则：

1. 任何从 `Pending` 变成 `Pass`/`Pass on staging seed`/`Fail`/`Blocked`/`Needs external verification` 的状态，**必须**在 `Finding` 列填一个证据 ID `E-<n>`（失败再额外给 finding ID）。
2. 每个 `E-<n>` 的完整证据写入 `docs/review/review-evidence-2026-06-04.md`，一条一行，不可只写"已检查/正常/看起来没问题"。
3. 证据必须**可复现**：包含确切命令或 URL、原始输出片段、环境（local/prod）、UTC 时间戳。截图给文件路径。
4. 证据必须**对应该行的验收标准**：贴的输出要能直接证明 Acceptance 那一列成立，否则视为无效证据。
5. **禁用词**（出现即判该行未完成）：`应该`、`看起来正常`、`大概`、`probably`、`should work`、`looks fine`、`assume`、无输出的"已验证"。
6. 抽查机制：复核者随机抽 ≥20% 的 `Pass` 行重跑证据；任意一条复现不出来，该 reviewer 的所有 `Pass` 全部降级回 `Pending` 重做。

每条证据使用这个格式（写在 `docs/review/review-evidence-2026-06-04.md`）：

```text
### E-<n> <被验证的 matrix 行/检查名>
Matrix row: <表名 + 行标识>
Env: local | prod
Time (UTC): 2026-06-04T..Z
Method: <确切命令 / URL / Chrome 步骤 / 工具>
Raw output:
<原始输出片段 / HTTP 状态 / 截图路径 / 响应体 / console / tail 行>
Verdict vs acceptance: <这段输出如何证明该行 Acceptance 成立>
```

不同检查类型的最低证据要求：

| Check Type | 最低证据 |
| --- | --- |
| 页面状态 | 确切 URL + HTTP 状态码 + 时间戳；4 个 locale 各一条 |
| 性能 p95 | 原始 5 次请求耗时数字，不能只写"快" |
| UI/UX 视口 | 每个分辨率的截图文件路径 + `scrollWidth/innerWidth` 数值 |
| Server Action / 写操作 | 网络/action 返回 + 刷新后持久化证据（截图或 DB/后续页面）+ `wrangler tail` 片段 |
| SEO/内容 | 渲染 HTML 的 meta/canonical/JSON-LD 片段或校验器结果链接 |
| 安全/越权 | 实际请求与响应（用户 A 取 用户 B 资源的真实 4xx/拒绝） |
| 错误/404 | 触发用的 URL + 返回状态码 + 页面截图 |
| 交互/嵌入 | 触发动作的截图/录屏前后对比 + console |

## Global Route Samples

所有本地化公开路由至少要覆盖 `id`、`vi`、`en`、`zh` 四种 locale。动态路由至少选择一个真实 slug 和一个不存在 slug。

> 注意（已对照 `apps/web/i18n/routing.ts` 核实）：`/masuk`、`/daftar`、`/lupa-sandi`、`/atur-ulang-sandi`、`/akun`、`/prediksi`、`/peringkat`、`/liga`、`/liga/[slug]` 在所有 locale 下**故意使用同一 slug**（源码注释说明：保证服务端重定向到 `/{locale}/akun` 时无需 per-locale 路径映射）。因此这些行四个 locale 路径相同是**预期行为，不是数据错误**。其余公开路由（`/skor`、`/jadwal`、`/tim`、`/pertandingan`、`/berita`、`/arsip`、`/artikel`、`/cerita`、`/nonton`、`/piala-dunia-2026` 及其子路由）才有 per-locale 翻译 slug。review 时仍要验证：单一 slug 路由在四个 locale 下的页面内容/语言确实本地化，只有 URL slug 不翻译。

| Route Key | ID Path | VI Path | EN Path | ZH Path | Type | Source | Status | Finding |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `/id` | `/vi` | `/en` | `/zh` | Public SSG | `apps/web/app/[locale]/page.tsx` | Pass | E-9 |
| `/piala-dunia-2026` | `/id/piala-dunia-2026` | `/vi/world-cup-2026` | `/en/world-cup-2026` | `/zh/shijiebei-2026` | Public dynamic | `apps/web/app/[locale]/piala-dunia-2026/page.tsx` | Pass | E-10 |
| `/piala-dunia-2026/grup/[group]` | `/id/piala-dunia-2026/grup/a` | `/vi/world-cup-2026/bang/a` | `/en/world-cup-2026/group/a` | `/zh/shijiebei-2026/xiaozu/a` | Public SSG dynamic | `apps/web/app/[locale]/piala-dunia-2026/grup/[group]/page.tsx` | Pass | E-11 |
| `/skor` | `/id/skor-langsung` | `/vi/ket-qua-truc-tiep` | `/en/live-scores` | `/zh/shishi-bifen` | Public dynamic | `apps/web/app/[locale]/skor/page.tsx` | Pass | E-12 |
| `/jadwal` | `/id/jadwal` | `/vi/lich-thi-dau` | `/en/schedule` | `/zh/saicheng` | Public SSG | `apps/web/app/[locale]/jadwal/page.tsx` | Pass | E-13 |
| `/tim` | `/id/tim` | `/vi/doi-tuyen` | `/en/teams` | `/zh/qiudui` | Public SSG | `apps/web/app/[locale]/tim/page.tsx` | Pass | E-14 |
| `/tim/[slug]` | `/id/tim/brazil` | `/vi/doi-tuyen/brazil` | `/en/team/brazil` | `/zh/qiudui/brazil` | Public SSG dynamic | `apps/web/app/[locale]/tim/[slug]/page.tsx` | Pass | E-3 |
| `/pertandingan/[slug]` | `/id/pertandingan/mexico-vs-south-africa-20260611` | `/vi/tran-dau/mexico-vs-south-africa-20260611` | `/en/match/mexico-vs-south-africa-20260611` | `/zh/bisai/mexico-vs-south-africa-20260611` | Public SSG dynamic + client islands | `apps/web/app/[locale]/pertandingan/[slug]/page.tsx` | Pass | E-15 |
| `/berita` | `/id/berita` | `/vi/tin-tuc` | `/en/news` | `/zh/xinwen` | Public SSG | `apps/web/app/[locale]/berita/page.tsx` | Pass | E-16 |
| `/arsip` | `/id/arsip` | `/vi/luu-tru` | `/en/articles` | `/zh/quanbu-wenzhang` | Public SSG | `apps/web/app/[locale]/arsip/page.tsx` | Pass | E-17 |
| `/artikel/[slug]` | `/id/artikel/<slug>` | `/vi/bai-viet/<slug>` | `/en/article/<slug>` | `/zh/wenzhang/<slug>` | Public SSG dynamic | `apps/web/app/[locale]/artikel/[slug]/page.tsx` | Pass | E-18 |
| `/cerita` | `/id/cerita` | `/vi/cau-chuyen` | `/en/web-stories` | `/zh/gushi` | Public SSG | `apps/web/app/[locale]/cerita/page.tsx` | Pass | E-19 |
| `/cerita/[slug]` | `/id/cerita/mexico-vs-south-africa-20260611` | `/vi/cau-chuyen/mexico-vs-south-africa-20260611` | `/en/web-stories/mexico-vs-south-africa-20260611` | `/zh/gushi/mexico-vs-south-africa-20260611` | AMP route | `apps/web/app/[locale]/cerita/[slug]/route.ts` | Pass | E-20, E-134, E-135 |
| `/nonton` | `/id/nonton` | `/vi/xem-o-dau` | `/en/where-to-watch` | `/zh/zhibo` | Public SSG | `apps/web/app/[locale]/nonton/page.tsx` | Pass | E-21 |
| `/peringkat` | `/id/peringkat` | `/vi/peringkat` | `/en/peringkat` | `/zh/peringkat` | Public SSG + share links | `apps/web/app/[locale]/peringkat/page.tsx` | Pass | E-22 |
| `/prediksi` | `/id/prediksi` | `/vi/prediksi` | `/en/prediksi` | `/zh/prediksi` | Guest + logged-in interactive | `apps/web/app/[locale]/prediksi/page.tsx` | Pass | E-23 |
| `/liga` | `/id/liga` | `/vi/liga` | `/en/liga` | `/zh/liga` | Logged-in dynamic | `apps/web/app/[locale]/liga/page.tsx` | Pass | E-35, E-90 |
| `/liga/[slug]` | `/id/liga/<slug>` | `/vi/liga/<slug>` | `/en/liga/<slug>` | `/zh/liga/<slug>` | Logged-in/private dynamic | `apps/web/app/[locale]/liga/[slug]/page.tsx` | Pass | E-35, E-90 |
| `/masuk` | `/id/masuk` | `/vi/masuk` | `/en/masuk` | `/zh/masuk` | Auth | `apps/web/app/[locale]/masuk/page.tsx` | Pass | E-24 |
| `/daftar` | `/id/daftar` | `/vi/daftar` | `/en/daftar` | `/zh/daftar` | Auth | `apps/web/app/[locale]/daftar/page.tsx` | Pass | E-25 |
| `/lupa-sandi` | `/id/lupa-sandi` | `/vi/lupa-sandi` | `/en/lupa-sandi` | `/zh/lupa-sandi` | Auth | `apps/web/app/[locale]/lupa-sandi/page.tsx` | Pass | E-26 |
| `/atur-ulang-sandi` | `/id/atur-ulang-sandi` | `/vi/atur-ulang-sandi` | `/en/atur-ulang-sandi` | `/zh/atur-ulang-sandi` | Auth | `apps/web/app/[locale]/atur-ulang-sandi/page.tsx` | Pass | E-27 |
| `/akun` | `/id/akun` | `/vi/akun` | `/en/akun` | `/zh/akun` | Protected account | `apps/web/app/[locale]/akun/page.tsx` | Pass | E-44, E-45, E-90 |

## SEO And Platform Endpoints

| Endpoint | Source | Required Checks | Acceptance | Status | Finding |
| --- | --- | --- | --- | --- | --- |
| `/sitemap.xml` | `apps/web/app/sitemap.ts` | status, URL count, alternates, 4xx/5xx scan | 200; no non-expected 4xx/5xx; hreflang includes `zh-Hans`; `x-default` final URL | Pass | E-138, E-139, E-140 |
| `/news-sitemap.xml` | `apps/web/app/news-sitemap.xml/route.ts` | status, headers, publication dates | 200; all news dates within 48h; cache headers match source intent | Pass | E-4, E-61 |
| `/robots.txt` | `apps/web/app/robots.ts` | status, sitemap reference, disallow rules | 200; references canonical sitemap; no accidental production block | Pass | E-28 |
| `/manifest.webmanifest` | `apps/web/app/manifest.ts` | JSON parse, icon URLs, icon dimensions | 200; square app icons; no OG image used as app icon | Pass | E-29 |
| `/sw.js` | generated/static | status, content type, navigation impact | 200; service worker does not break navigation or auth | Pass | E-63 |
| `/og` | `apps/web/app/og/route.tsx` | status, image render, runtime errors | 200; image not blank; no OpenNext edge shim failure | Pass | E-30 |
| `/favicon.ico` | `apps/web/app/favicon.ico` | status, content type | 200; browser loads icon | Pass | E-31 |
| `/BingSiteAuth.xml` | `apps/web/public/BingSiteAuth.xml` | status, content type, body | 200; static verification file served without locale redirect | Pass | E-32 |
| `/e3cb02d1aa682eff2ac76b05153b4b9b.txt` | `apps/web/public/e3cb02d1aa682eff2ac76b05153b4b9b.txt` | status, content type, body | 200; static verification file served without locale redirect | Pass | E-33 |
| `/auth/callback` | `apps/web/app/auth/callback/route.ts` | missing params, fake code, real email token | missing/fake params redirect safely; real token creates production session | Pass | E-41, E-42, E-43 |
| `/api/subscribe` | `apps/web/app/api/subscribe/route.ts` | method guard, invalid JSON, invalid fields, captcha, success | 4xx for invalid input; no 500; success sends confirm email | Pass | E-37, E-38 |
| `/api/subscribe/confirm` | `apps/web/app/api/subscribe/confirm/route.ts` | missing token, invalid token, real token | invalid tokens safe; real token confirms subscriber | Pass | E-39 |
| `/api/subscribe/unsubscribe` | `apps/web/app/api/subscribe/unsubscribe/route.ts` | missing token, invalid token, real token | invalid tokens safe; real token unsubscribes | Pass | E-39 |

## Interactive Inventory Matrix

这是「按钮级 / 交互级」全覆盖证明。规则：`apps/web/components` 里每一个交互（`onClick`、`<form>`、`signInWith*`、clipboard、外部 iframe、客户端数据 island）都必须映射到一条上方流程行。Review 时若发现代码新增交互未出现在此表，视为覆盖缺口（finding）。本表对照 `apps/web/components/**` 与 `apps/web/lib/*actions*.ts` 核实。

| Component | Interaction / Handler | Backing Action / API | Covering Flow Row | Status | Finding |
| --- | --- | --- | --- | --- | --- |
| `auth/register-form.tsx` | submit | `signUpAction` | Register | Pass | E-51, E-103 |
| `auth/login-form.tsx` | submit | `signInAction` | Login | Pass | E-51, E-103 |
| `auth/sign-out-button.tsx` | click | `signOutAction` | Logout | Pass | E-44 |
| `auth/forgot-form.tsx` | submit | `forgotPasswordAction` | Forgot password | Pass | P1-6 fixed / E-51, E-112, E-113, E-114 |
| `auth/reset-form.tsx` | submit | `resetPasswordAction` | Password reset | Pass | E-50 |
| `auth/account-form.tsx` | submit | `updateProfileAction` | Account update | Pass | E-45 |
| `auth/oauth-buttons.tsx` | click google/facebook | `signInWithOAuth` (gated) | OAuth login | Pass | E-50 |
| `auth/turnstile.tsx` | captcha widget | Turnstile token | Subscribe success / Register | Pass | E-51, E-103 |
| `subscribe-gift-card.tsx` | submit | `/api/subscribe` | Subscribe success / invalid input | Pass | E-37, E-38 |
| `predict-score.tsx` | enter score + save | `submitPrediction` | Score prediction save | Pass | E-35, E-87, E-112 |
| `forecast-card.tsx` | island load | `getForecast` | Forecast load | Pass | E-84, E-87 |
| `public-picks.tsx` | island load | `getPicks` | Public picks distribution | Pass | P2-8 / E-87, E-99, E-100 |
| `premium-content.tsx` | island load | `getPremiumArticle` | Premium unlock / Premium authorization | Pass | E-84, E-87, E-95, E-107 |
| `bracket-builder.tsx` | guest pick flow | local state | Bracket guest flow | Pass | E-83 |
| `bracket-builder.tsx` | save | `saveBracketAction` / `getBracketAction` | Bracket save | Pass | E-35 |
| `league-create.tsx` | submit | `createLeague` | Mini league create | Pass | E-35, E-87 |
| `league-join.tsx` | submit | `joinLeague` | Mini league join | Pass | E-35, E-87, E-96, E-107 |
| `league-invite.tsx` | copy link + share | clipboard + `ShareButtons` | League invite copy/share | Pass | E-35, E-91, E-96, E-110, E-118 |
| `standings-table.tsx` | island/data | `leagueStandings` | Mini league join (standings) | Pass | E-35, E-96, E-107 |
| `comments-section.tsx` | post / like / report / load | `postComment` / `likeComment` / `flagComment` / `loadComments` | Comments post | Pass | E-84, E-87, E-96, E-112 |
| `notify-bell.tsx` | allow / subscribe / unsubscribe | `subscribePush` / `unsubscribePush` | Web Push subscribe | Pass | E-87, E-97, E-117 |
| `share-buttons.tsx` | share | platform share URLs | Share buttons (multi-surface) | Pass | E-82, E-91, E-104, E-118 |
| `locale-switcher.tsx` | change locale | client navigation | Locale switch | Pass | E-76 |
| `article-grid.tsx` | filter tab + load more | client-side paging | Article filter + load more | Pass | E-77 |
| `live-scoreboard.tsx` | polling island | `getLiveScores` | Live score/event polling | Pass on staging seed | E-89, E-118, E-121, E-133 |
| `events-timeline.tsx` | island load | `getEvents` | Live score/event polling | Pass on staging seed | E-89, E-118, E-121, E-133 |
| `goal-highlights.tsx` | island load + embeds | `getEvents` + `SocialEmbed` | External media embed | Pass on staging seed | E-86, E-111, E-118, E-121, E-133 |
| `social-embed.tsx` | lazy embed / fallback | external tweet/YouTube | External media embed | Pass on staging seed | P2-9 fixed / E-86, E-111, E-118, E-119, E-120, E-121, E-133 |
| `home-personalized.tsx` | island load | `getHomePersonalization` | Home personalization | Pass | E-87, E-95, E-107 |
| `countdown.tsx` | client timer | none | Home sections / Kickoff time | Pass | E-80 |
| `pwa-register.tsx` | SW register | service worker | PWA offline behavior | Pass | E-63, E-104, E-105 |
| `site-header.tsx` / `header-auth.tsx` | nav + auth state | navigation | Header/nav surface | Pass | E-49, E-76, E-80 |
| `site-footer.tsx` | legal/contact links | navigation | Footer surface / Legal pages | Pass | E-52 |
| `match-card.tsx` / `article-card.tsx` / `team-badge.tsx` | card/link tap | navigation | Data cards surface | Pass | E-80, E-81 |
| `score-row.tsx` | score row tap/load | navigation / `live-scoreboard.tsx` | Live score/event polling | Pass on staging seed | E-89, E-118, E-121, E-133 |
| `json-ld.tsx` | server-rendered schema | structured data | JSON-LD external validation | Pass | E-72 |

## User Flow Matrix

| Flow | Persona | Entry | Steps To Verify | Required Evidence | Acceptance | Status | Finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Guest browse home to match | Guest | `/id` | open home, click next match, inspect match page | final URL, status, visible match header | 200; clear match context above fold; no console error | Pass | E-80 |
| Locale switch | Guest | any core route | switch ID -> VI -> EN -> ZH | final localized URLs | same entity/page context preserved where possible | Pass | E-76 |
| News discovery | Guest | `/id/berita` | open news card, return, use archive | URLs, card text, article text | card summary and article meta localized; links 200 | Pass | E-77 |
| Article archive filter | Guest | `/id/arsip` | filter/search/sort if available, open article | UI state, final URL | filter state usable; no empty broken state | Pass | E-77 |
| Web Story open | Guest | `/id/cerita` | open story detail, run AMP validation on downloaded HTML and browser runtime smoke | AMP validator output + Chrome page errors | valid AMP for normal 200 HTML; no runtime page error on sampled story | Pass | E-69, E-134, E-135 |
| Watch page external links | Guest | `/id/nonton` | inspect broadcaster links | URLs, rel/target | no illegal streaming link; external links safe | Pass | E-75 |
| Subscribe invalid input | Guest | subscribe form/API | submit bad email/missing captcha | response body, UI message | specific localized error; API 4xx not 500 | Pass | E-37, E-38 |
| Subscribe success | Guest | subscribe form | complete Turnstile, submit real email, click confirm email | email link, API response, final state | confirm email arrives and token confirms subscriber | Pass | P1-5 fixed / E-38, E-39, E-94, E-106, E-108, E-109 |
| Register | Guest | `/id/daftar` | use fresh email, submit form | Chrome URL, Supabase user state | user created, confirmation email sent | Pass | E-51, E-103 |
| Email confirmation | Guest | real email link | inspect link, click, visit `/id/akun` | email link, Supabase `email_confirmed_at`, Chrome page | redirect points to production callback; account page accessible | Pass | E-41, E-42, E-43 |
| Login | Existing user | `/id/masuk` | submit valid credentials | final URL, page state | lands on account/next page; header logged-in state | Pass | E-51, E-103 |
| Logout | Logged-in user | `/id/akun` | click logout | final URL, protected route revisit | session cleared; `/akun` redirects to login | Pass | E-44 |
| Forgot password | Guest | `/id/lupa-sandi` | request reset email, click link | email link, final reset page | production reset link opens reset form | Pass | P1-6 fixed / E-51, E-112, E-113, E-114 |
| Account update | Logged-in user | `/id/akun` | edit profile/team fields | UI success, persisted state | change persists after refresh | Pass | E-45 |
| Score prediction save | Logged-in user | match detail | enter score, save, refresh | network/action result, page state, DB/follow-up state | save succeeds and persists; no Worker exception | Pass | E-35, E-112 |
| Forecast load | Guest/logged-in | match detail | wait for forecast card | UI state, tail logs | resolves or bounded fallback within 3s | Pass | E-84, E-87 |
| Comments post | Logged-in user | match/article target | post, like, report | UI state, action result | no hung action; validation clear; persisted comment | Pass | E-84, E-87, E-96, E-112 |
| Bracket guest flow | Guest | `/id/prediksi` | pick final four, finalists, champion | UI state | local flow usable; login prompt for save | Pass | E-83 |
| Bracket save | Logged-in user | `/id/prediksi` | pick and save bracket, refresh | UI success, action result | save succeeds and persists; no Worker exception | Pass | E-35 |
| Ranking/share | Guest | `/id/peringkat` | inspect table, share links | links and console | share URLs deterministic; no hydration mismatch | Pass | E-82 |
| Mini league create | Logged-in user | `/id/liga` | create league | action result, final detail URL | created league detail opens; no Worker exception | Pass | E-35 |
| Mini league join | Logged-in user | invite URL | join league | action result, standings | membership persists | Pass | E-35, E-87, E-90, E-96, E-107 |
| Web Push subscribe | Logged-in user | header bell | allow/deny/subscribe/unsubscribe | browser permission, UI label, action result | clear state; accessible labels; persisted subscription | Pass | E-87, E-97, E-117 |
| Logged-in auth pages | Logged-in user | `/id/masuk`, `/id/daftar` | open pages while logged in | final URL and visible body | redirect to account or explicit signed-in state | Pass | E-44 |
| OAuth login | Guest | `/id/masuk`, `/id/daftar` | check `NEXT_PUBLIC_ENABLE_OAUTH` gate; if on, run Google/Facebook sign-in to production callback | env flag, button visibility, redirect URL, final session | gate off => buttons absent; gate on => provider round-trip lands on `/{locale}/akun` with valid session | Pass | E-50 |
| Premium unlock | Guest vs Logged-in | match detail | view free preview as guest, full plan as logged-in | rendered HTML, network/action result | guest sees only preview; logged-in sees full premium body; no premium HTML in guest response | Pass | E-84, E-87, E-95, E-107 |
| League invite copy/share | Logged-in user | `/id/liga/[slug]` | generate invite, copy link, use share buttons | clipboard value, share URLs | copy succeeds with feedback; invite URL valid and joins correctly | Pass | E-35, E-91, E-96, E-107, E-110, E-118 |
| Share buttons (multi-surface) | Guest/logged-in | article, match, ranking, league | trigger share on each surface | share URLs, target/rel, console | deterministic absolute URLs; no hydration mismatch; safe `rel`/`target` | Pass on staging seed | E-82, E-91, E-118, E-121, E-133 |
| Home personalization | Logged-in user | `/id` | wait for personalized card to resolve | UI state, action result | resolves or bounded fallback; correct auth-aware content; guest sees register hook | Pass | E-87, E-95, E-107, E-110 |
| Public picks distribution | Guest/logged-in | match detail | wait for public picks card | UI state, action result | resolves or explicit empty/low-data state; no indefinite skeleton; public JSON does not expose internal user IDs | Pass | P2-8 / E-87, E-99, E-100 |
| Article filter + load more | Guest | `/id/arsip`, `/id/berita` | switch type tabs, click load more | UI state, rendered count | filter changes list; load-more reveals next page; `aria-pressed` correct | Pass | E-77 |
| External media embed | Guest | match detail (goal highlights / social) | load tweet/YouTube embed; simulate removed source | rendered embed, fallback link, console | only official YouTube/X embedded; removed source degrades to plain link; lazy mount works | Pass on staging seed | P2-9 fixed / E-86, E-111, E-118, E-119, E-120, E-121, E-133 |
| Custom error/not-found pages | Guest | invalid slug + forced runtime error | hit invalid slug; trigger render error if reachable | status code, rendered page, locale | 404/500 show branded localized page | Pass | E-64, E-104, E-105 |

## UI/UX Viewport Matrix

Every row must be checked at `360x740`, `390x844`, `430x932`, `768x1024`, and `1440x900`.

| Surface | Pages | Checks | Acceptance | Status | Finding |
| --- | --- | --- | --- | --- | --- |
| Header/nav | all core pages | wrapping, horizontal overflow, auth state, locale switcher | no overflow; active/available links fit; auth state consistent | Pass | E-49, E-76, E-80 |
| Footer | all core pages | legal links, contact link, localized routing | visible links work; privacy/terms not 404 | Pass | E-52 |
| Home sections | `/[locale]` | hero, countdown, cards, CTA hierarchy | clear first viewport; localized text; no overlap | Pass | E-80 |
| Data cards | home, teams, news, stories | image ratio, long text, tap targets | text fits; cards clickable; stable dimensions | Pass | E-80, E-81 |
| Public tables/lists | scores, schedule, ranking | responsive fit, row actions, empty states | no page-level horizontal overflow; data readable | Pass | E-82 |
| League standings table | standings | responsive fit, row actions, sticky/scroll behavior | no page-level horizontal overflow; data readable | Pass | E-35, E-96, E-107, E-110 |
| Forms | auth, subscribe, account, league | labels, errors, disabled/busy states | specific errors; no layout shift; keyboard usable | Pass | E-38, E-45, E-51, E-90, E-96, E-103, E-108, E-110, E-114, E-115, E-116 |
| Match detail | match pages | H1, poster, prediction, forecast, comments, timeline | match context above fold; islands bounded | Pass | E-84 |
| Bracket builder | `/prediksi` | team selection, progression, disabled states | all steps understandable; save state clear | Pass | E-85 |
| Mini league | `/liga`, `/liga/[slug]` | list, create, join, detail, empty state | guest/login state clear; logged-in flow works | Pass | E-35, E-87, E-90, E-96, E-107, E-110 |
| Error/empty states | all dynamic modules | no data, failed data, invalid slug | user sees actionable fallback; expected 404 stays 404 | Pass | E-64, E-104, E-105 |
| Error/404 pages | invalid slug, runtime error | branded layout, localized copy, recovery link | localized branded page; not a raw framework default | Pass | E-64, E-104, E-105 |
| Images | home/news/teams/match cards, OG-driven art | broken `src`, slow CDN, ratio, lazy load | broken image shows fallback/placeholder, not layout break; correct aspect ratio | Pass | E-65, E-81 |
| Share/invite controls | article, match, ranking, league | button labels, copy feedback, tap target | accessible labels; copy/share feedback visible; targets >= 44px | Pass | E-82, E-91, E-104, E-118 |
| External embeds | match goal highlights, social embed | tweet/YouTube render, removed-source fallback, lazy mount | bounded height; fallback link when unembeddable; no CLS on late mount | Pass on staging seed | P2-9 fixed / E-86, E-111, E-118, E-119, E-120, E-121, E-133 |

## SEO And Content Matrix

| Content Type | Pages | Checks | Acceptance | Status | Finding |
| --- | --- | --- | --- | --- | --- |
| Canonical | all public pages | rendered HTML and headers | points to final 200 URL for current locale | Pass | E-66 |
| hreflang | all localized pages | HTML/link headers and sitemap | same locale labels and final URLs across both | Pass | E-66 |
| `x-default` | all localized pages | HTML/link headers and sitemap | points to intended default-locale final URL | Pass | E-66 |
| Titles | all public pages | duplicate terms, localization | no accidental duplicated year or source-language title | Pass | E-67, E-104 |
| Meta descriptions | all public pages | language, relevance, length | localized and no unintended English contamination | Pass | E-67, E-104 |
| OG/Twitter | home, article, match, team | title/description/image | valid absolute URLs; localized descriptions | Pass | E-65 |
| Web Story OG/Twitter | story detail | social preview metadata | story pages expose OG/Twitter title, description, and image for share previews | Pass | E-142, E-143 |
| JSON-LD | article, match, team, breadcrumbs | parse and entity match | valid JSON; describes visible page entity | Pass | E-68 |
| News sitemap | article news URLs | 48h freshness, URL status | every entry within 48h and returns 200 | Pass | E-61 |
| AMP story | story detail | AMP validator, canonical, story pages | valid AMP for normal HTML response | Pass | E-69 |
| Protected terms | all localized content | USA, USMNT, FIFA, team names, country codes | acronyms are not mistranslated | Pass | E-70, E-104 |
| Source links | article detail | internal URNs, empty hosts | only public http/https source links shown | Pass | E-71 |
| OG/Twitter dynamic image | `/og` with article/match params | sample 1 param-driven URL + 1 default | param OG renders correct entity art; no edge shim failure; absolute URL | Pass | E-65 |
| JSON-LD external validation | article, match, team, breadcrumbs | run Google Rich Results / schema validator on rendered HTML | passes validator (not only local JSON.parse); no required-field warnings on key types | Pass | E-72 |
| Kickoff time/timezone | schedule, scores, match detail, countdown | rendered time vs source UTC across locales | time correct and consistent per market; no off-by-timezone; localized date/number format | Pass | E-74, E-101, E-102 |
| i18n key integrity | all localized surfaces | scan for raw keys and missing-key fallback | no raw `namespace.key` strings rendered; missing keys fall back gracefully, not blank/crash | Pass | E-73 |
| Email HTML rendering | confirm, reset, subscribe, pre-match broadcast | render in real client (not just delivery) | links/styles render; production URLs; no broken layout in common clients | Pass | P1-5 fixed / E-94, E-106, E-108, E-109 |

## API, Security, And Privacy Matrix

| Area | Files/Endpoints | Checks | Acceptance | Status | Finding |
| --- | --- | --- | --- | --- | --- |
| Supabase auth redirects | Dashboard + `auth-actions.ts` + callback route | Site URL, allow list, email templates | production email uses production callback | Pass | E-43 |
| Auth session refresh | `middleware.ts`, `supabase/server.ts` | logged-in/out navigation, cookie state | no crash; protected routes enforce auth | Pass | E-44 |
| Subscribe API | `/api/subscribe` | method, body, captcha, rate limit | stable 4xx/2xx; no private leakage | Pass | E-37, E-38 |
| Confirm/unsubscribe | subscribe token routes | invalid/real tokens | safe invalid handling; real token changes state | Pass | E-39 |
| Prediction actions | `prediction-actions.ts` | auth, validation, write, read | user can only write own prediction | Pass | E-35, E-87, E-112 |
| Public picks API | `/api/fixtures/[fixtureId]/picks` | public response shape, privacy minimization | public JSON excludes internal account identifiers not rendered by the UI | Pass | P2-8 / E-87, E-99, E-100 |
| Bracket actions | `bracket-actions.ts` | auth, validation, write, read | user can only save own bracket | Pass | E-35, E-87 |
| League actions | `league-actions.ts` | create/join/member access | no cross-user leakage; invalid slug safe | Pass | E-35, E-87, E-90, E-96, E-107 |
| Comment actions | `comment-actions.ts` | spam filter, auth, report/like | no hung action; validation clear | Pass | E-84, E-87, E-96, E-112 |
| Push actions | `push-actions.ts` | permission, subscribe, unsubscribe | no duplicate/broken state; accessible UI | Pass | E-87, E-97, E-117 |
| Legal pages | footer links | privacy/terms existence | no 404 for global legal links | Pass | E-52 |
| Client bundle secrets | env usage, bundle scan | service role/private keys | no private secret exposed client-side | Pass | E-52 |
| Premium authorization | `premium-actions.ts` `getPremiumArticle` | guest call, logged-in call, response payload | guest gets `{authorized:false}` and no premium body; only logged-in/subscriber gets full HTML | Pass | E-84, E-87, E-95, E-107 |
| OAuth provider config | `oauth-buttons.tsx`, `NEXT_PUBLIC_ENABLE_OAUTH`, Supabase providers | gate flag, provider redirect, callback allow list | flag off => no buttons; flag on => provider configured and callback whitelisted; no broken provider | Pass | E-50 |
| Security response headers | edge/middleware/`next.config` | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS | sensible headers present; no clickjacking; no overly permissive CSP | Pass | P1-3 / E-53, E-54, E-55 |
| Session cookie attributes | `middleware.ts`, `supabase/server.ts` | cookie flags on auth cookies | `HttpOnly`, `Secure`, `SameSite` set correctly in production | Pass | P1-2 / E-46, E-47, E-48, E-49 |
| Analytics & consent | `docs/specs/A-analytics-funnel.md`, client bundle | whether tracking is live; consent banner | if live: events fire + consent gate works; if not live: explicitly mark OUT OF SCOPE in findings | Pass | P1-4 / E-78, E-79 |

## Performance And Runtime Matrix

| Surface | Sample URLs | Measurement | Acceptance | Status | Finding |
| --- | --- | --- | --- | --- | --- |
| Static public pages | `/id/jadwal`, `/id/tim/brazil`, article detail | 5 sequential production GETs | p95 `<800ms` preferred; `<1500ms` max before finding | Pass | E-62 |
| Dynamic public pages | `/id/skor-langsung`, `/id/piala-dunia-2026` | 5 sequential + concurrent batch | p95 `<1500ms` preferred; `<3000ms` max before finding | Pass | E-62 |
| Logged-in dynamic pages | `/id/akun`, `/id/liga`, `/id/prediksi` | Chrome + tail | p95 `<3000ms`; no Worker exception | Pass | E-35, E-44, E-45, E-90, E-98, E-112, E-115 |
| Server Actions | score, forecast, bracket, comments, league | Chrome click + tail | resolves or fallback within 3s; no hung POST | Pass | E-35, E-87, E-96, E-112, E-115 |
| SEO endpoints | sitemap, news sitemap, manifest, og | production fetch | stable 200; headers match source intent | Pass | E-61 |
| Build performance | `pnpm build` | wall time and page count | exits 0; no static timeout; count changes explained | Pass | E-1 |
| Cloudflare runtime | production review window | `wrangler tail` | zero exception during accepted flows | Pass | E-35, E-79, E-87, E-90, E-98, E-105, E-112, E-114, E-115, E-117 |
| Live score/event polling | `getLiveScores`, `getEvents`, `live-scoreboard.tsx`, `events-timeline.tsx` | poll interval, in-match refresh, offline/recovery, request volume | bounded interval; updates while live; recovers after network drop; no runaway request loop | Pass on staging seed | E-89, E-118, E-121, E-133 |
| PWA offline behavior | `sw.js`, `pwa-register.tsx` | offline navigation, cached shell, offline fallback | offline shows cached/offline fallback, not a hard crash; SW update does not strand stale assets | Pass | E-63, E-104, E-105 |

## Background And Data Pipeline Matrix

| System | Files/Packages | Checks | Acceptance | Status | Finding |
| --- | --- | --- | --- | --- | --- |
| News generation | `apps/jobs`, `packages/news`, `packages/ai-content` | generated title/body/summary/source | summaries from localized body; no source-language leakage | Pass | E-88, E-104 |
| Translation | jobs + messages/content | locale correctness and protected terms | protected acronyms/team names preserved | Pass | E-88, E-104 |
| Match/team data sync | `packages/api-football`, `packages/db` | freshness, missing teams, invalid slugs | generated pages have matching DB records | Pass | E-61, E-68, E-93 |
| Forecast/model | `packages/predict-model`, prediction actions | output availability and fallback | no indefinite skeleton; clear low-data state | Pass | E-84, E-87, E-92 |
| Cache/revalidation | OpenNext/Cloudflare/cache headers | stale sitemap/news/content | production output matches deployed source | Pass | E-61, E-79, E-90 |
| Email delivery | Supabase Auth + subscribe email | inbox/spam, link format, token handling | real messages arrive; links point to production | Pass | P1-5 fixed / E-94, E-106, E-108, E-109 |

## Cross-Locale Acceptance

For every localized route:

- `id`, `vi`, `en`, and `zh` must return expected status.
- Header/footer links must resolve within the same locale unless intentionally global.
- Locale switcher must keep users on the same entity for dynamic pages where possible.
- No locale should inherit Indonesian-only or English-only UI labels unintentionally.
- Long localized text must not cause layout overflow.
- `zh` SEO language tag should be verified as `zh-Hans` where required by the SEO implementation.

## Dynamic Slug Acceptance

For every dynamic route:

| Route | Valid Slug Check | Invalid Slug Check | Acceptance |
| --- | --- | --- | --- |
| Team detail | known team such as `brazil` | `nonexistent-team-review-20260604` | valid returns 200; invalid returns 404, not Worker 500 |
| Match detail | known fixture slug | `nonexistent-match-review-20260604` | valid returns 200; invalid returns 404 |
| Article detail | known locale article slug | `nonexistent-article-review-20260604` | valid returns 200; invalid returns 404 |
| Web Story | known fixture slug | `nonexistent-story-review-20260604` | valid returns AMP 200; invalid returns 404 |
| Group page | known group `a` | invalid group `z-invalid` | valid returns 200; invalid returns 404 or clear empty state by design |
| Mini league detail | created/joined league slug | invalid league slug | valid requires membership where appropriate; invalid safe response |

## Finding Reference

When a row passes:

1. Set `Status` to `Pass`.
2. Put the evidence ID (`E-<n>`) in `Finding`.
3. Add the reproducible evidence to `docs/review/review-evidence-2026-06-04.md`.
4. 没有 `E-<n>` 的 `Pass` 视为无效，复核时降级回 `Pending`。

When a row fails:

1. Keep this matrix row short.
2. Set `Status` to `Fail`.
3. Put the finding ID in `Finding` (并在 evidence 文件留 `E-<n>` 失败证据)。
4. Add full evidence to `docs/review/review-findings-2026-06-04.md`.

Example:

```text
Pass 行:
Status: Pass
Finding: E-42
Evidence doc: ### E-42 ... Raw output: HTTP/2 200 ...

Fail 行:
Status: Fail
Finding: P1-3
Findings doc:
### P1-3 Mobile header causes horizontal scrolling on core pages
Evidence: ...  (scrollWidth 412 > innerWidth 390 @360x740, screenshot path ...)
Fix acceptance: ...
```
