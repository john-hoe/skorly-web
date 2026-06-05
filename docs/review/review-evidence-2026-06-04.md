# Full Site Review Evidence Ledger - 2026-06-04

本文件是本轮 review 的**可复现证据账本**。规则见 `docs/review/full-site-review-plan-2026-06-04.md` 的 Evidence Protocol 和 matrix 的 Evidence Discipline。

铁律：matrix 任何一行从 `Pending` 变成 `Pass`/`Fail`/`Blocked`/`Needs external verification`，都必须在这里留一条 `E-<n>`，并把该 ID 填回 matrix 的 `Finding` 列。**没有 `E-<n>` 的 `Pass` 无效，复核时降级回 `Pending`。**

## Evidence Entry Format

每条证据复制下面模板，递增编号：

```text
### E-<n> <被验证的 matrix 行/检查名>
Matrix row: <表名 + 行标识，例如 "Global Route Samples / /skor">
Env: local | prod
Time (UTC): 2026-06-04T..Z
Method: <确切命令 / URL / Chrome 步骤 / 工具>
Raw output:
<原始输出片段：HTTP 状态 / 截图路径 / 响应体 / console / wrangler tail 行>
Verdict vs acceptance: <这段输出如何证明该行 Acceptance 成立或失败>
Linked finding: <如失败，填 P0/P1/P2 编号；否则 none>
```

禁用词（出现即判该项未完成）：`应该`、`大概`、`看起来正常`、`probably`、`should work`、`looks fine`、`assume`、无输出的"已验证/已检查"。

生产/认证/邮件/Worker 类必须**双证据**：Chrome 证据 + `wrangler tail` 片段，缺一不可。

## Evidence Index

| Evidence ID | Matrix Row | Env | Result | Linked Finding |
| --- | --- | --- | --- | --- |
| E-1 | Performance And Runtime Matrix / Build performance | local | Pass | none |
| E-2 | Baseline command / `@skorly/predict-model` test gate | local | Fail | P2-1 |
| E-3 | Global Route Samples / `/tim/[slug]` | prod | Pass | none |
| E-4 | SEO And Platform Endpoints / `/news-sitemap.xml` | prod | Pass | none |
| E-5 | Phase 0 / Fixed P1 local regression sample | local | Pass | none |
| E-6 | Phase 0 / Fixed P0 production auth and runtime regression sample | prod | Pass | none |
| E-7 | Phase 1 inventory / review branch omits fixed P0 runtime commits | local | Fail | P0-1 |
| E-8 | Phase 1/1.5 route and interactive inventory | local | Pass | none |
| E-9 | Global Route Samples / `/` | prod | Pass | none |
| E-10 | Global Route Samples / `/piala-dunia-2026` | prod | Pass | none |
| E-11 | Global Route Samples / `/piala-dunia-2026/grup/[group]` | prod | Pass | none |
| E-12 | Global Route Samples / `/skor` | prod | Pass | none |
| E-13 | Global Route Samples / `/jadwal` | prod | Pass | none |
| E-14 | Global Route Samples / `/tim` | prod | Pass | none |
| E-15 | Global Route Samples / `/pertandingan/[slug]` | prod | Pass | none |
| E-16 | Global Route Samples / `/berita` | prod | Pass | none |
| E-17 | Global Route Samples / `/arsip` | prod | Pass | none |
| E-18 | Global Route Samples / `/artikel/[slug]` | prod | Pass | none |
| E-19 | Global Route Samples / `/cerita` | prod | Pass | none |
| E-20 | Global Route Samples / `/cerita/[slug]` | prod | Pass | none |
| E-21 | Global Route Samples / `/nonton` | prod | Pass | none |
| E-22 | Global Route Samples / `/peringkat` | prod | Pass | none |
| E-23 | Global Route Samples / `/prediksi` | prod | Pass | none |
| E-24 | Global Route Samples / `/masuk` | prod | Pass | none |
| E-25 | Global Route Samples / `/daftar` | prod | Pass | none |
| E-26 | Global Route Samples / `/lupa-sandi` | prod | Pass | none |
| E-27 | Global Route Samples / `/atur-ulang-sandi` | prod | Pass | none |
| E-28 | SEO And Platform Endpoints / `/robots.txt` | prod | Pass | none |
| E-29 | SEO And Platform Endpoints / `/manifest.webmanifest` | prod | Pass | none |
| E-30 | SEO And Platform Endpoints / `/og` | prod | Pass | none |
| E-31 | SEO And Platform Endpoints / `/favicon.ico` | prod | Pass | none |
| E-32 | SEO And Platform Endpoints / `/BingSiteAuth.xml` | prod | Pass | none |
| E-33 | SEO And Platform Endpoints / `/e3cb02d1aa682eff2ac76b05153b4b9b.txt` | prod | Pass | none |
| E-34 | Fix Session / P0-1 review branch P0 runtime baseline alignment | local + prod | Pass | P0-1 |
| E-35 | Post-deploy P0 runtime smoke | prod | Pass | none |
| E-36 | SEO/API endpoint `/api/subscribe`; API, Security, Privacy Matrix / Subscribe API; User Flow / Subscribe invalid input | prod | Fail | P1-1 |
| E-37 | Fix Session / P1-1 subscribe Turnstile fail-closed and production verification | local + prod | Pass | P1-1 |
| E-38 | Review Session / Independent P1-1 post-deploy verification | prod | Pass | P1-1 |
| E-39 | SEO/API endpoints `/api/subscribe/confirm` and `/api/subscribe/unsubscribe`; API, Security, Privacy Matrix / Confirm/unsubscribe | prod | Pass | none |
| E-40 | SEO/API endpoint `/auth/callback`; User Flow / Email confirmation | prod | Fail | P0-2 |
| E-41 | Fix Session / P0-2 auth callback signup verification | local + prod | Pass | P0-2 |
| E-42 | Final main deploy / P0-2 auth callback production recheck | prod | Pass | P0-2 |
| E-43 | Review Session / Independent P0-2 auth callback recheck | prod | Pass | P0-2 |
| E-44 | User Flow / Logout; User Flow / Logged-in auth pages; API, Security, Privacy Matrix / Auth session refresh; Interactive Inventory / sign-out button | prod | Pass | none |
| E-45 | Interactive Inventory / `auth/account-form.tsx`; User Flow / Account update | prod | Pass | none |
| E-46 | API, Security, Privacy Matrix / Session cookie attributes | prod | Fail | P1-2 |
| E-47 | Fix Session / P1-2 auth cookie hardening | local + prod | Pass | P1-2 |
| E-48 | Fix Session / P1-2 Chrome automation recheck | prod Chrome automation | Blocked | P1-2 |
| E-49 | Review Session / Independent P1-2 auth cookie and auth-flow recheck | prod | Pass | P1-2 |
| E-50 | Interactive Inventory / `auth/reset-form.tsx`; Interactive Inventory / `auth/oauth-buttons.tsx`; User Flow / OAuth login; API, Security, Privacy Matrix / OAuth provider config | prod | Pass | none |
| E-51 | Interactive Inventory / auth forms requiring Turnstile; User Flow / Login, Register, Forgot password | prod Chrome automation | Needs external verification | none |
| E-52 | Interactive Inventory / `site-footer.tsx`; UX Matrix / Footer; API, Security, Privacy Matrix / Legal pages; API, Security, Privacy Matrix / Client bundle secrets | prod | Pass | none |
| E-53 | API, Security, Privacy Matrix / Security response headers | prod | Fail | P1-3 |
| E-54 | Fix Session / P1-3 production security response headers | local + prod | Pass | P1-3 |

## Evidence Entries

<!-- 在此按 E-1, E-2, ... 递增追加证据条目 -->

### E-1 Build performance baseline gate
Matrix row: Performance And Runtime Matrix / Build performance
Env: local
Time (UTC): 2026-06-04T06:15:24Z
Method: `pnpm lint`; `pnpm typecheck`; `pnpm build`; `pnpm --filter @skorly/api-football test`; post-build route/data count commands
Raw output:
```text
pnpm lint
apps/web lint$ eslint .
apps/web lint: Done in 2.4s
Exit status: 0

pnpm typecheck
packages/predict-model typecheck$ tsc --noEmit
packages/types typecheck$ tsc --noEmit
packages/ui typecheck$ tsc --noEmit
packages/ai-content typecheck$ tsc --noEmit
packages/api-football typecheck$ tsc --noEmit
packages/db typecheck$ tsc --noEmit
packages/news typecheck$ tsc --noEmit
apps/web typecheck$ tsc --noEmit
apps/jobs typecheck$ tsc --noEmit
Exit status: 0

pnpm build
Next.js 16.2.6 (Turbopack)
Compiled successfully in 8.0s
Collecting page data using 3 workers in 20.4s
Generating static pages using 3 workers (1902/1902) in 3.8min
Route table included:
  /[locale]/artikel/[slug] [+1003 more paths]
  /[locale]/pertandingan/[slug] [+285 more paths]
  /[locale]/cerita/[slug] [+285 more paths]
  /[locale]/tim/[slug] [+189 more paths]
Exit status: 0

pnpm --filter @skorly/api-football test
Test Files  1 passed (1)
Tests  2 passed (2)
Exit status: 0

find apps/web/.next/server/app -path '*/artikel/*' -name '*.html' | wc -l
1006
find apps/web/.next/server/app -path '*/pertandingan/*' -name '*.html' | wc -l
288
find apps/web/.next/server/app -path '*/cerita/*' -name '*.body' | wc -l
288
find apps/web/.next/server/app -path '*/tim/*' -name '*.html' | wc -l
192

set -a; source .env.local; set +a; pnpm exec tsx -e '<getArticleSitemapEntries count script>'
en 253
id 253
vi 252
zh 252
total 1010
vi news-339-prediksi-semi-final-piala-dunia-2026-1-prancis-2-argentina-3 2026-06-04T06:14:08.119Z
zh news-339-prediksi-semi-final-piala-dunia-2026-1-prancis-2-argentina-3 2026-06-04T06:14:08.105Z
id news-339-prediksi-semi-final-piala-dunia-2026-1-prancis-2-argentina-3 2026-06-04T06:14:05.258Z
en news-339-prediksi-semi-final-piala-dunia-2026-1-prancis-2-argentina-3 2026-06-04T06:13:50.611Z
```
Verdict vs acceptance: `pnpm build` exited 0, generated `1902/1902`, and did not hit a static generation timeout. The page count changed from the prior `1905/1905` baseline; the route tree still includes the same generated route families, and the mutable article dataset changed during the build window: the built artifact has 1006 article HTML files, while the post-build article sitemap query returned 1010 published article entries, including four `news-339` locale entries published at `2026-06-04T06:13:50Z` through `2026-06-04T06:14:08Z`. This explains the build count as content-data timing rather than a removed route.
Linked finding: none

### E-28 Platform endpoint `/robots.txt`
Matrix row: SEO And Platform Endpoints / `/robots.txt`
Env: prod
Time (UTC): 2026-06-04T06:36:00Z
Method: Node `fetch('https://skorly.cc/robots.txt')`
Raw output:
```text
{"status":200,"ms":1218,"contentType":"text/plain","cacheControl":"public, max-age=0, must-revalidate","location":null,"bytes":131,"prefix":"User-Agent: * Allow: / Host: https://skorly.cc Sitemap: https://skorly.cc/sitemap.xml Sitemap: https://skorly.cc/news-s"}
```
Verdict vs acceptance: Production robots endpoint returns 200 text, allows crawling, and references canonical sitemap URLs.
Linked finding: none

### E-29 Platform endpoint `/manifest.webmanifest`
Matrix row: SEO And Platform Endpoints / `/manifest.webmanifest`
Env: prod
Time (UTC): 2026-06-04T06:36:00Z
Method: Node `fetch('https://skorly.cc/manifest.webmanifest')`, JSON parse, PNG IHDR dimension parse for manifest icons
Raw output:
```text
manifest:
{"status":200,"ms":288,"contentType":"application/manifest+json","bytes":545,"parsed":{"name":"Skorly — World Cup 2026","short_name":"Skorly","icons":[{"src":"/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"/icon.svg","sizes":"any","type":"image/svg+xml"},{"src":"/icon.svg","sizes":"any","type":"image/svg+xml"}],"theme_color":"#0f8a4f","background_color":"#0b1220"}}

icon dimensions:
{"url":"https://skorly.cc/icon-192.png","status":200,"contentType":"image/png","bytes":3930,"width":192,"height":192}
{"url":"https://skorly.cc/icon-512.png","status":200,"contentType":"image/png","bytes":13014,"width":512,"height":512}
```
Verdict vs acceptance: Manifest returns 200 valid JSON, references square 192x192 and 512x512 PNG icons that return 200 with matching IHDR dimensions, and does not use `/og.png` as an app icon.
Linked finding: none

### E-30 Platform endpoint `/og`
Matrix row: SEO And Platform Endpoints / `/og`
Env: prod
Time (UTC): 2026-06-04T06:36:00Z
Method: Node `fetch('https://skorly.cc/og')`
Raw output:
```text
{"status":200,"ms":2849,"contentType":"image/png","cacheControl":"public, max-age=0, must-revalidate","location":null,"bytes":123964,"prefix":"PNG signature present"}
```
Verdict vs acceptance: Default OG endpoint returns 200 PNG with nonzero image payload and no Worker error response.
Linked finding: none

### E-31 Platform endpoint `/favicon.ico`
Matrix row: SEO And Platform Endpoints / `/favicon.ico`
Env: prod
Time (UTC): 2026-06-04T06:36:00Z
Method: Node `fetch('https://skorly.cc/favicon.ico')`
Raw output:
```text
{"status":200,"ms":324,"contentType":"image/vnd.microsoft.icon","cacheControl":"public, max-age=0, must-revalidate","location":null,"bytes":25931}
```
Verdict vs acceptance: Favicon endpoint returns 200 with icon content type and nonzero payload.
Linked finding: none

### E-32 Static verification endpoint `/BingSiteAuth.xml`
Matrix row: SEO And Platform Endpoints / `/BingSiteAuth.xml`
Env: prod
Time (UTC): 2026-06-04T06:36:00Z
Method: Node `fetch('https://skorly.cc/BingSiteAuth.xml')`
Raw output:
```text
{"status":200,"ms":396,"contentType":"application/xml","cacheControl":"public, max-age=0, must-revalidate","location":null,"bytes":86,"prefix":"<?xml version=\"1.0\"?> <users> <user>4A18CE3353706712DE5B43638172AFEF</user> </users>"}
```
Verdict vs acceptance: Static verification file returns 200 XML directly with no locale redirect.
Linked finding: none

### E-33 Static verification endpoint `/e3cb02d1aa682eff2ac76b05153b4b9b.txt`
Matrix row: SEO And Platform Endpoints / `/e3cb02d1aa682eff2ac76b05153b4b9b.txt`
Env: prod
Time (UTC): 2026-06-04T06:36:00Z
Method: Node `fetch('https://skorly.cc/e3cb02d1aa682eff2ac76b05153b4b9b.txt')`
Raw output:
```text
{"status":200,"ms":311,"contentType":"text/plain","cacheControl":"public, max-age=0, must-revalidate","location":null,"bytes":33,"prefix":"e3cb02d1aa682eff2ac76b05153b4b9b"}
```
Verdict vs acceptance: Static verification file returns 200 text directly with no locale redirect.
Linked finding: none

### E-9 Public route status `/`
Matrix row: Global Route Samples / `/`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale URLs
Raw output:
```text
{"path":"/id","status":200,"ms":1901,"h1":true,"err1101":false,"location":null}
{"path":"/vi","status":200,"ms":937,"h1":true,"err1101":false,"location":null}
{"path":"/en","status":200,"ms":723,"h1":true,"err1101":false,"location":null}
{"path":"/zh","status":200,"ms":968,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale home URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-10 Public route status `/piala-dunia-2026`
Matrix row: Global Route Samples / `/piala-dunia-2026`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale URLs
Raw output:
```text
{"path":"/id/piala-dunia-2026","status":200,"ms":729,"h1":true,"err1101":false,"location":null}
{"path":"/vi/world-cup-2026","status":200,"ms":713,"h1":true,"err1101":false,"location":null}
{"path":"/en/world-cup-2026","status":200,"ms":719,"h1":true,"err1101":false,"location":null}
{"path":"/zh/shijiebei-2026","status":200,"ms":974,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale World Cup hub URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-11 Public route status `/piala-dunia-2026/grup/[group]`
Matrix row: Global Route Samples / `/piala-dunia-2026/grup/[group]`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale group A URLs
Raw output:
```text
{"path":"/id/piala-dunia-2026/grup/a","status":200,"ms":525,"h1":true,"err1101":false,"location":null}
{"path":"/vi/world-cup-2026/bang/a","status":200,"ms":424,"h1":true,"err1101":false,"location":null}
{"path":"/en/world-cup-2026/group/a","status":200,"ms":445,"h1":true,"err1101":false,"location":null}
{"path":"/zh/shijiebei-2026/xiaozu/a","status":200,"ms":472,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale group URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-12 Public route status `/skor`
Matrix row: Global Route Samples / `/skor`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale score URLs
Raw output:
```text
{"path":"/id/skor-langsung","status":200,"ms":752,"h1":true,"err1101":false,"location":null}
{"path":"/vi/ket-qua-truc-tiep","status":200,"ms":526,"h1":true,"err1101":false,"location":null}
{"path":"/en/live-scores","status":200,"ms":719,"h1":true,"err1101":false,"location":null}
{"path":"/zh/shishi-bifen","status":200,"ms":526,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale live-score URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-13 Public route status `/jadwal`
Matrix row: Global Route Samples / `/jadwal`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale schedule URLs
Raw output:
```text
{"path":"/id/jadwal","status":200,"ms":352,"h1":true,"err1101":false,"location":null}
{"path":"/vi/lich-thi-dau","status":200,"ms":740,"h1":true,"err1101":false,"location":null}
{"path":"/en/schedule","status":200,"ms":542,"h1":true,"err1101":false,"location":null}
{"path":"/zh/saicheng","status":200,"ms":467,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale schedule URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-14 Public route status `/tim`
Matrix row: Global Route Samples / `/tim`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale team index URLs
Raw output:
```text
{"path":"/id/tim","status":200,"ms":332,"h1":true,"err1101":false,"location":null}
{"path":"/vi/doi-tuyen","status":200,"ms":410,"h1":true,"err1101":false,"location":null}
{"path":"/en/teams","status":200,"ms":432,"h1":true,"err1101":false,"location":null}
{"path":"/zh/qiudui","status":200,"ms":395,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale team index URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-15 Public route status `/pertandingan/[slug]`
Matrix row: Global Route Samples / `/pertandingan/[slug]`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale Mexico vs South Africa match URLs
Raw output:
```text
{"path":"/id/pertandingan/mexico-vs-south-africa-20260611","status":200,"ms":326,"h1":true,"err1101":false,"location":null}
{"path":"/vi/tran-dau/mexico-vs-south-africa-20260611","status":200,"ms":386,"h1":true,"err1101":false,"location":null}
{"path":"/en/match/mexico-vs-south-africa-20260611","status":200,"ms":423,"h1":true,"err1101":false,"location":null}
{"path":"/zh/bisai/mexico-vs-south-africa-20260611","status":200,"ms":456,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale match URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-16 Public route status `/berita`
Matrix row: Global Route Samples / `/berita`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale news index URLs
Raw output:
```text
{"path":"/id/berita","status":200,"ms":427,"h1":true,"err1101":false,"location":null}
{"path":"/vi/tin-tuc","status":200,"ms":506,"h1":true,"err1101":false,"location":null}
{"path":"/en/news","status":200,"ms":422,"h1":true,"err1101":false,"location":null}
{"path":"/zh/xinwen","status":200,"ms":392,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale news index URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-17 Public route status `/arsip`
Matrix row: Global Route Samples / `/arsip`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale archive URLs
Raw output:
```text
{"path":"/id/arsip","status":200,"ms":715,"h1":true,"err1101":false,"location":null}
{"path":"/vi/luu-tru","status":200,"ms":685,"h1":true,"err1101":false,"location":null}
{"path":"/en/articles","status":200,"ms":506,"h1":true,"err1101":false,"location":null}
{"path":"/zh/quanbu-wenzhang","status":200,"ms":765,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale archive URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-18 Public route status `/artikel/[slug]`
Matrix row: Global Route Samples / `/artikel/[slug]`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale article URLs for `news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-`
Raw output:
```text
{"path":"/id/artikel/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-","status":200,"ms":464,"h1":true,"err1101":false,"location":null}
{"path":"/vi/bai-viet/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-","status":200,"ms":685,"h1":true,"err1101":false,"location":null}
{"path":"/en/article/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-","status":200,"ms":426,"h1":true,"err1101":false,"location":null}
{"path":"/zh/wenzhang/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-","status":200,"ms":675,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale article URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-19 Public route status `/cerita`
Matrix row: Global Route Samples / `/cerita`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale story index URLs
Raw output:
```text
{"path":"/id/cerita","status":200,"ms":451,"h1":true,"err1101":false,"location":null}
{"path":"/vi/cau-chuyen","status":200,"ms":603,"h1":true,"err1101":false,"location":null}
{"path":"/en/web-stories","status":200,"ms":326,"h1":true,"err1101":false,"location":null}
{"path":"/zh/gushi","status":200,"ms":685,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale story index URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-20 Public route status `/cerita/[slug]`
Matrix row: Global Route Samples / `/cerita/[slug]`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale story URLs for `mexico-vs-south-africa-20260611`
Raw output:
```text
{"path":"/id/cerita/mexico-vs-south-africa-20260611","status":200,"ms":394,"h1":true,"err1101":false,"location":null}
{"path":"/vi/cau-chuyen/mexico-vs-south-africa-20260611","status":200,"ms":333,"h1":true,"err1101":false,"location":null}
{"path":"/en/web-stories/mexico-vs-south-africa-20260611","status":200,"ms":289,"h1":true,"err1101":false,"location":null}
{"path":"/zh/gushi/mexico-vs-south-africa-20260611","status":200,"ms":319,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale story URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-21 Public route status `/nonton`
Matrix row: Global Route Samples / `/nonton`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale watch URLs
Raw output:
```text
{"path":"/id/nonton","status":200,"ms":338,"h1":true,"err1101":false,"location":null}
{"path":"/vi/xem-o-dau","status":200,"ms":434,"h1":true,"err1101":false,"location":null}
{"path":"/en/where-to-watch","status":200,"ms":326,"h1":true,"err1101":false,"location":null}
{"path":"/zh/zhibo","status":200,"ms":433,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale watch URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-22 Public route status `/peringkat`
Matrix row: Global Route Samples / `/peringkat`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale ranking URLs
Raw output:
```text
{"path":"/id/peringkat","status":200,"ms":580,"h1":true,"err1101":false,"location":null}
{"path":"/vi/peringkat","status":200,"ms":489,"h1":true,"err1101":false,"location":null}
{"path":"/en/peringkat","status":200,"ms":492,"h1":true,"err1101":false,"location":null}
{"path":"/zh/peringkat","status":200,"ms":498,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale ranking URLs return 200, contain an H1, and do not contain checked Worker error markers.
Linked finding: none

### E-23 Public route status `/prediksi`
Matrix row: Global Route Samples / `/prediksi`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale prediction/bracket URLs in guest HTTP context
Raw output:
```text
{"path":"/id/prediksi","status":200,"ms":473,"h1":true,"err1101":false,"location":null}
{"path":"/vi/prediksi","status":200,"ms":432,"h1":true,"err1101":false,"location":null}
{"path":"/en/prediksi","status":200,"ms":487,"h1":true,"err1101":false,"location":null}
{"path":"/zh/prediksi","status":200,"ms":475,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale prediction/bracket URLs return 200, contain an H1, and do not contain checked Worker error markers in guest HTTP context.
Linked finding: none

### E-24 Public route status `/masuk`
Matrix row: Global Route Samples / `/masuk`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale login URLs
Raw output:
```text
{"path":"/id/masuk","status":200,"ms":299,"h1":true,"err1101":false,"location":null}
{"path":"/vi/masuk","status":200,"ms":288,"h1":true,"err1101":false,"location":null}
{"path":"/en/masuk","status":200,"ms":294,"h1":true,"err1101":false,"location":null}
{"path":"/zh/masuk","status":200,"ms":344,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale login URLs return 200, contain an H1, and do not contain checked Worker error markers in logged-out HTTP context.
Linked finding: none

### E-25 Public route status `/daftar`
Matrix row: Global Route Samples / `/daftar`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale register URLs
Raw output:
```text
{"path":"/id/daftar","status":200,"ms":329,"h1":true,"err1101":false,"location":null}
{"path":"/vi/daftar","status":200,"ms":289,"h1":true,"err1101":false,"location":null}
{"path":"/en/daftar","status":200,"ms":293,"h1":true,"err1101":false,"location":null}
{"path":"/zh/daftar","status":200,"ms":325,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale register URLs return 200, contain an H1, and do not contain checked Worker error markers in logged-out HTTP context.
Linked finding: none

### E-26 Public route status `/lupa-sandi`
Matrix row: Global Route Samples / `/lupa-sandi`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale forgot-password URLs
Raw output:
```text
{"path":"/id/lupa-sandi","status":200,"ms":466,"h1":true,"err1101":false,"location":null}
{"path":"/vi/lupa-sandi","status":200,"ms":395,"h1":true,"err1101":false,"location":null}
{"path":"/en/lupa-sandi","status":200,"ms":529,"h1":true,"err1101":false,"location":null}
{"path":"/zh/lupa-sandi","status":200,"ms":520,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale forgot-password URLs return 200, contain an H1, and do not contain checked Worker error markers in logged-out HTTP context.
Linked finding: none

### E-27 Public route status `/atur-ulang-sandi`
Matrix row: Global Route Samples / `/atur-ulang-sandi`
Env: prod
Time (UTC): 2026-06-04T06:34:00Z
Method: Node `fetch` script, redirect manual, four locale reset-password URLs
Raw output:
```text
{"path":"/id/atur-ulang-sandi","status":200,"ms":524,"h1":true,"err1101":false,"location":null}
{"path":"/vi/atur-ulang-sandi","status":200,"ms":393,"h1":true,"err1101":false,"location":null}
{"path":"/en/atur-ulang-sandi","status":200,"ms":467,"h1":true,"err1101":false,"location":null}
{"path":"/zh/atur-ulang-sandi","status":200,"ms":434,"h1":true,"err1101":false,"location":null}
```
Verdict vs acceptance: All four locale reset-password URLs return 200, contain an H1, and do not contain checked Worker error markers in logged-out HTTP context.
Linked finding: none

### E-7 Review branch omits fixed P0 runtime commits
Matrix row: Phase 1 inventory / review branch source-vs-production consistency
Env: local
Time (UTC): 2026-06-04T06:30:00Z
Method: Git ancestry checks plus source inventory for API routes and Server Action files
Raw output:
```text
git branch --show-current
codex/review

git log -1 --oneline --decorate
5056b2e (HEAD -> codex/review, origin/codex/event-structured-data-fix, codex/event-structured-data-fix) fix(web): clean up event structured data

git branch -a --contains ed4e09c08a4711481a8413baec12272b205abf8e
+ codex/seo-p2-followup
+ main
  remotes/origin/HEAD -> origin/main
  remotes/origin/codex/mobile-auth-followups
  remotes/origin/codex/seo-p2-followup
  remotes/origin/main

git branch -a --contains c8951ab83f24ac18e0f3758192e6f2f6d0b5d864
+ codex/seo-p2-followup
+ main
  remotes/origin/HEAD -> origin/main
  remotes/origin/codex/mobile-auth-followups
  remotes/origin/codex/seo-p2-followup
  remotes/origin/main

find apps/web/app/api -type f | sort
apps/web/app/api/subscribe/confirm/route.ts
apps/web/app/api/subscribe/route.ts
apps/web/app/api/subscribe/unsubscribe/route.ts

rg -n '"use server"' apps/web/lib/*actions.ts
apps/web/lib/score-actions.ts:1:"use server";
apps/web/lib/league-actions.ts:1:"use server";
apps/web/lib/home-actions.ts:1:"use server";
apps/web/lib/premium-actions.ts:1:"use server";
apps/web/lib/prediction-actions.ts:1:"use server";
apps/web/lib/comment-actions.ts:1:"use server";
apps/web/lib/bracket-actions.ts:1:"use server";
apps/web/lib/push-actions.ts:1:"use server";
apps/web/lib/auth-actions.ts:1:"use server";

rg -n 'getForecast|getPicks|getPremiumArticle|getHomePersonalization|getLiveScores|getEvents|saveBracketAction|getBracketAction|submitPrediction|postComment|likeComment|flagComment|createLeague|joinLeague|subscribePush|unsubscribePush' apps/web -g '*.ts' -g '*.tsx'
apps/web/components/home-personalized.tsx imports getHomePersonalization from "@/lib/home-actions"
apps/web/components/forecast-card.tsx imports getForecast from "@/lib/prediction-actions"
apps/web/components/notify-bell.tsx imports subscribePush/unsubscribePush from "@/lib/push-actions"
apps/web/components/league-join.tsx imports joinLeague from "@/lib/league-actions"
apps/web/components/events-timeline.tsx imports getEvents from "@/lib/score-actions"
apps/web/components/goal-highlights.tsx imports getEvents from "@/lib/score-actions"
apps/web/components/predict-score.tsx imports getMyPrediction/submitPrediction from "@/lib/prediction-actions"
apps/web/components/live-scoreboard.tsx imports getLiveScores from "@/lib/score-actions"
apps/web/components/public-picks.tsx imports getPicks from "@/lib/prediction-actions"
apps/web/components/league-create.tsx imports createLeague from "@/lib/league-actions"
apps/web/components/bracket-builder.tsx imports getBracketAction/saveBracketAction from "@/lib/bracket-actions"
apps/web/components/comments-section.tsx imports postComment/likeComment/flagComment from "@/lib/comment-actions"
apps/web/components/premium-content.tsx imports getPremiumArticle from "@/lib/premium-actions"
```
Verdict vs acceptance: `docs/review/review-findings-2026-06-03.md` states P0-5 was fixed by PR #11 `c8951ab83f24ac18e0f3758192e6f2f6d0b5d864` and PR #12 `ed4e09c08a4711481a8413baec12272b205abf8e`, moving client islands to explicit JSON Route Handlers. The current review branch `codex/review` does not contain either commit, `apps/web/app/api` contains only subscribe routes, and client components still import `"use server"` action modules for the P0-5 surfaces. Production Chrome in E-6 passes against the deployed site, but that does not prove the current review branch contains the deployed P0-5 fix.
Linked finding: P0-1

### E-35 Post-deploy P0 runtime smoke
Matrix row: User Flow Matrix / Score prediction save; User Flow Matrix / Bracket save; User Flow Matrix / Mini league create; post-deploy P0 runtime smoke
Env: prod
Time (UTC): 2026-06-04T07:45:15Z
Method: Chrome authenticated session against `https://skorly.cc` after PR #15 deploy, while `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error` was running. Checked account, match prediction/forecast/comments, score prediction save, bracket save, `/id/liga` x5, mini-league create/detail, and `/zh/shishi-bifen`.
Raw output:
```text
git fetch --all --prune
origin/main: ed7018e Merge pull request #15 from john-hoe/codex/review

wrangler tail command:
pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
tail output during Chrome window:
<no JSON error event lines before Ctrl-C>
Worker error events observed: 0

Chrome account:
requestedUrl=https://skorly.cc/id/akun
finalUrl=https://skorly.cc/id/akun
title=Akun saya | Skorly
h1=Akun saya
ms=5649
skeletonCount=0
worker1101Text=false
visibleRuntimeErrors=[]

Chrome match prediction / forecast / comments:
requestedUrl=https://skorly.cc/id/pertandingan/mexico-vs-south-africa-20260611
finalUrl=https://skorly.cc/id/pertandingan/mexico-vs-south-africa-20260611
title=Mexico vs South Africa | Skorly
h1=Mexico vs South Africa
ms=7472
skeletonCount=0
hasForecast=true
hasComments=true
worker1101Text=false
visibleRuntimeErrors=[]

Chrome score prediction save:
clicked=true
buttonText=Ubah tebakan
hasSavedPrediction=true
worker1101Text=false

Chrome bracket page and save:
requestedUrl=https://skorly.cc/id/prediksi
title=Prediksi bagan — Piala Dunia 2026 | Skorly
h1=Prediksi bagan
ms=7563
skeletonCount=0
worker1101Text=false
visibleRuntimeErrors=[]
clicked=true
buttonText=Ubah bagan
hasSavedBracket=true

Chrome /id/liga repeated authenticated GET:
run 1: ms=3746, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, worker1101Text=false, visibleRuntimeErrors=[]
run 2: ms=3806, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, worker1101Text=false, visibleRuntimeErrors=[]
run 3: ms=3714, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, worker1101Text=false, visibleRuntimeErrors=[]
run 4: ms=3724, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, worker1101Text=false, visibleRuntimeErrors=[]
run 5: ms=3789, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, worker1101Text=false, visibleRuntimeErrors=[]

Chrome mini-league create/detail:
attempted=true
button=Buat liga
leagueName=P0 deploy smoke 1780559166178
finalUrl=https://skorly.cc/id/liga/lg-c5884d
title=P0 deploy smoke 1780559166178 | Skorly
h1=P0 deploy smoke 1780559166178
worker1101Text=false

Chrome live score:
requestedUrl=https://skorly.cc/zh/shishi-bifen
title=2026 世界杯实时比分与赛果 | Skorly
h1=实时比分与赛果
ms=7611
skeletonCount=1
note: the remaining `.animate-pulse` element is the live-status dot in the active-match section; visible text reports no active matches.
worker1101Text=false
visibleRuntimeErrors=[]

Chrome console errors after filtering Cloudflare challenge frames:
[]
```
Verdict vs acceptance: The deployed production site after PR #15 has no observed Worker error events during the checked authenticated runtime window. Account, match, prediction save, bracket save, repeated league page renders, mini-league create/detail, and live-score page all completed without 1101/500 runtime text. Score prediction, bracket save, and mini-league create each reached their expected saved/detail state.
Linked finding: none

### E-8 Route and interactive inventory coverage pass
Matrix row: Phase 1/1.5 / route and interactive inventory
Env: local
Time (UTC): 2026-06-04T06:30:31Z
Method: `find` route/API/metadata/public files; `rg` interaction patterns in `apps/web/components` and `apps/web/lib`; matrix row comparison
Raw output:
```text
find apps/web/app -type f \( -name 'page.tsx' -o -name 'route.ts' -o -name 'layout.tsx' \) | wc -l
29

find apps/web/app -maxdepth 3 -type f \( -name 'sitemap.ts' -o -name 'robots.ts' -o -name 'manifest.ts' -o -name 'route.tsx' -o -name 'favicon.ico' \) | sort
apps/web/app/favicon.ico
apps/web/app/manifest.ts
apps/web/app/og/route.tsx
apps/web/app/robots.ts
apps/web/app/sitemap.ts

find apps/web/app/api -type f | sort
apps/web/app/api/subscribe/confirm/route.ts
apps/web/app/api/subscribe/route.ts
apps/web/app/api/subscribe/unsubscribe/route.ts

find apps/web/public -maxdepth 2 -type f | sort
apps/web/public/BingSiteAuth.xml
apps/web/public/e3cb02d1aa682eff2ac76b05153b4b9b.txt
apps/web/public/icon.svg
apps/web/public/news/callup.webp
apps/web/public/news/fans.webp
apps/web/public/news/generic.webp
apps/web/public/news/group.webp
apps/web/public/news/injury.webp
apps/web/public/news/prediction.webp
apps/web/public/news/preview.webp
apps/web/public/news/result.webp
apps/web/public/news/transfer.webp
apps/web/public/news/watchpoints.webp
apps/web/public/og.png
apps/web/public/sw.js

find apps/web/components -type f -name '*.tsx' | wc -l
38

rg -l "onClick|onSubmit|<form|type=\"submit\"|type='submit'|signInWith|clipboard|navigator\.share|navigator\.clipboard|<iframe|iframe|useEffect|setInterval|addEventListener" apps/web/components apps/web/lib -g '*.tsx' -g '*.ts' | sort
apps/web/components/article-grid.tsx
apps/web/components/auth/account-form.tsx
apps/web/components/auth/forgot-form.tsx
apps/web/components/auth/login-form.tsx
apps/web/components/auth/oauth-buttons.tsx
apps/web/components/auth/register-form.tsx
apps/web/components/auth/reset-form.tsx
apps/web/components/auth/sign-out-button.tsx
apps/web/components/auth/turnstile.tsx
apps/web/components/bracket-builder.tsx
apps/web/components/comments-section.tsx
apps/web/components/countdown.tsx
apps/web/components/events-timeline.tsx
apps/web/components/forecast-card.tsx
apps/web/components/goal-highlights.tsx
apps/web/components/header-auth.tsx
apps/web/components/home-personalized.tsx
apps/web/components/league-create.tsx
apps/web/components/league-invite.tsx
apps/web/components/league-join.tsx
apps/web/components/live-scoreboard.tsx
apps/web/components/locale-switcher.tsx
apps/web/components/notify-bell.tsx
apps/web/components/predict-score.tsx
apps/web/components/premium-content.tsx
apps/web/components/public-picks.tsx
apps/web/components/pwa-register.tsx
apps/web/components/share-buttons.tsx
apps/web/components/social-embed.tsx
apps/web/components/subscribe-gift-card.tsx
apps/web/lib/auth-actions.ts

Matrix update made during inventory:
added SEO/platform endpoint rows for /BingSiteAuth.xml and /e3cb02d1aa682eff2ac76b05153b4b9b.txt, both left Pending for later endpoint verification.
```
Verdict vs acceptance: App routes, API routes, metadata endpoints, and public platform files are classified in the matrix after adding the two verification-file endpoint rows. The interaction-pattern file list maps to existing Interactive Inventory rows by component/action category. Source-vs-production drift for the P0-5 runtime fix is recorded separately as E-7/P0-1.
Linked finding: none

### E-6 Fixed P0 production auth/runtime regression sample
Matrix row: Phase 0 / Fixed P0 production auth and runtime regression sample
Env: prod
Time (UTC): 2026-06-04T06:26:47Z
Method: Chrome authenticated session against `https://skorly.cc` while `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error` was running; pages checked: `/id/akun`, `/id/pertandingan/mexico-vs-south-africa-20260611`, `/id/prediksi`, `/id/liga` x5, `/zh/shishi-bifen`; production write recheck clicked existing score prediction and existing bracket save controls; reload checks confirmed persisted state. Sensitive account values and Turnstile hidden tokens were redacted from this entry.
Raw output:
```text
Chrome account page:
requestedUrl: https://skorly.cc/id/akun
finalUrl: https://skorly.cc/id/akun
title: Akun saya | Skorly
h1: Akun saya
skeletonCount: 0
hasLoginText: false
hasErrorText: false

Chrome match page:
requestedUrl: https://skorly.cc/id/pertandingan/mexico-vs-south-africa-20260611
finalUrl: https://skorly.cc/id/pertandingan/mexico-vs-south-africa-20260611
title: Mexico vs South Africa | Skorly
h1: Mexico vs South Africa
skeletonCount: 0
numberInputs: Mexico=1, South Africa=0
hasForecastText: true
hasCommentText: true
hasErrorText: false

Chrome bracket page:
requestedUrl: https://skorly.cc/id/prediksi
title: Prediksi bagan — Piala Dunia 2026 | Skorly
h1: Prediksi bagan
skeletonCount: 0
selected state before save: Argentina, Brazil, France, Spain; finalists ARG, BRA; champion ARG
hasErrorText: false

Chrome /id/liga repeated authenticated GET:
run 1: ms=4462, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, hasErrorText=false, hasLoginText=false
run 2: ms=4381, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, hasErrorText=false, hasLoginText=false
run 3: ms=4367, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, hasErrorText=false, hasLoginText=false
run 4: ms=4352, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, hasErrorText=false, hasLoginText=false
run 5: ms=4877, title="Liga mini privat | Skorly", h1="Liga mini privat", skeletonCount=0, hasErrorText=false, hasLoginText=false

Chrome live-score page:
requestedUrl: https://skorly.cc/zh/shishi-bifen
title: 2026 世界杯实时比分与赛果 | Skorly
h1: 实时比分与赛果
skeletonCount: 1
note: the remaining `.animate-pulse` element is the live-status dot in the "正在进行" section, not a loading skeleton
hasErrorText: false

Production write recheck:
match prediction button clicked: "Ubah tebakan"
match page after click: "Tebakan tersimpan!" visible, hasErrorText=false
match reload after save: Mexico input value=1, South Africa input value=0, skeletonCount=0, hasErrorText=false
bracket button clicked: "Ubah bagan"
bracket page after click: "Bagan tersimpan!" visible, hasErrorText=false
bracket reload after save: selected state still includes Argentina, Brazil, France, Spain; finalists ARG/BRA; champion ARG; skeletonCount=0; hasErrorText=false

Chrome console errors during the window:
4 entries from https://challenges.cloudflare.com/ with message "%c%d font-size:0;color:transparent NaN"
0 Skorly-origin console error entries captured in the final tab log sample

wrangler tail:
command: pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
output during non-mutating page checks: <no events before Ctrl-C>
output during write recheck: <no events before Ctrl-C>
Worker error events observed: 0
```
Verdict vs acceptance: Existing confirmed production session can access `/id/akun` without redirecting to login. The P0-5 runtime surfaces rendered in Chrome without Worker 1101/500 text, without indefinite loading skeletons, and with `wrangler tail --status error` producing zero events during the checked window. Existing score prediction and bracket write controls returned saved UI states and persisted across reload. This evidence does not claim a fresh email-confirmation loop Pass; registration/email-confirmation matrix rows remain Pending until a new inbox token is tested.
Linked finding: none

### E-5 Fixed P1 local regression recheck
Matrix row: Phase 0 / Fixed P1 local regression sample
Env: local
Time (UTC): 2026-06-04T06:23:00Z
Method: `pnpm --dir apps/web start -p 3100`; Node `fetch` latency/HTML checks against local production server; `pnpm --dir apps/web dev --port 3002`
Raw output:
```text
pnpm --dir apps/web start -p 3100
next start -p 3100
Local: http://localhost:3100
Ready in 86ms

Local production fetch sample:
{"path":"/id/pertandingan/mexico-vs-south-africa-20260611","status":200,"ms":99,"h1Count":1}
{"path":"/id/artikel/news-226-official-ghana-release-world-cup-squad-by-carlos-queiroz-htt","status":200,"ms":9,"h1Count":1}
{"path":"/id/tim/mexico","status":200,"ms":6,"h1Count":1}
{"path":"/id/cerita/mexico-vs-south-africa-20260611","status":200,"ms":9,"h1Count":1}
{"path":"/id/peringkat","status":200,"ms":39,"h1Count":1,"hasProductionShareUrl":true,"hasLocalhostShareUrl":false,"shareHrefCount":3}

pnpm --dir apps/web dev --port 3002
next dev --webpack --port 3002
Next.js 16.2.6 (webpack)
Local: http://localhost:3002
Ready in 237ms
Exit after manual Ctrl-C: 0
```
Verdict vs acceptance: The local production detail-page samples from P1-3 return 200 with measured response times between 6ms and 99ms. The `/id/peringkat` share markup contains production absolute share URLs, contains no localhost share URL, and exposes three matching hrefs. The default dev command uses `next dev --webpack`, matching the P1-2 mitigation.
Linked finding: none

### E-2 Predict-model test gate executes zero tests
Matrix row: Baseline command / `pnpm --filter @skorly/predict-model test`
Env: local
Time (UTC): 2026-06-04T06:15:24Z
Method: `pnpm --filter @skorly/predict-model test`; `jq -r '.scripts // {}' packages/predict-model/package.json`; `find packages/predict-model -maxdepth 3 -type f \( -name '*test*' -o -name '*spec*' \) -print`; `pnpm --dir packages/predict-model run test`
Raw output:
```text
pnpm --filter @skorly/predict-model test
Exit status: 0
stdout/stderr: empty

jq -r '.scripts // {}' packages/predict-model/package.json
{
  "typecheck": "tsc --noEmit"
}

find packages/predict-model -maxdepth 3 -type f \( -name '*test*' -o -name '*spec*' \) -print
<no output>

pnpm --dir packages/predict-model run test
ERR_PNPM_NO_SCRIPT Missing script: test
Command "test" not found.
Exit status: 1
```
Verdict vs acceptance: The required baseline command returns exit 0 through the workspace filter path, but the package has no `test` script and no test/spec files. The measured test count is 0, so the command does not provide test evidence for `@skorly/predict-model`.
Linked finding: P2-1

### E-3 Team detail production route regression recheck
Matrix row: Global Route Samples / `/tim/[slug]`
Env: prod
Time (UTC): 2026-06-04T06:20:11Z
Method: Node `fetch` script against valid `brazil` team detail URLs and invalid `nonexistent-team-review-20260604` URLs for `id`, `vi`, `en`, and `zh`
Raw output:
```text
{"url":"https://skorly.cc/id/tim/brazil","status":200,"ms":2014,"has1101":false,"hasH1":true,"canonical":true}
{"url":"https://skorly.cc/vi/doi-tuyen/brazil","status":200,"ms":315,"has1101":false,"hasH1":true,"canonical":true}
{"url":"https://skorly.cc/en/team/brazil","status":200,"ms":337,"has1101":false,"hasH1":true,"canonical":true}
{"url":"https://skorly.cc/zh/qiudui/brazil","status":200,"ms":413,"has1101":false,"hasH1":true,"canonical":true}
{"url":"https://skorly.cc/id/tim/nonexistent-team-review-20260604","status":404,"ms":383,"has1101":false,"hasH1":true,"canonical":false}
{"url":"https://skorly.cc/vi/doi-tuyen/nonexistent-team-review-20260604","status":404,"ms":327,"has1101":false,"hasH1":true,"canonical":false}
{"url":"https://skorly.cc/en/team/nonexistent-team-review-20260604","status":404,"ms":524,"has1101":false,"hasH1":true,"canonical":false}
{"url":"https://skorly.cc/zh/qiudui/nonexistent-team-review-20260604","status":404,"ms":280,"has1101":false,"hasH1":true,"canonical":false}
```
Verdict vs acceptance: Valid team detail URLs return 200 across all four locales with H1 and canonical present. Invalid team slugs return 404 across all four locales. No response body contains the Worker 1101 markers checked by the script.
Linked finding: none

### E-4 News sitemap production freshness/cache regression recheck
Matrix row: SEO And Platform Endpoints / `/news-sitemap.xml`
Env: prod
Time (UTC): 2026-06-04T06:20:11Z
Method: Node `fetch` script, 5 bypass-query production requests to `https://skorly.cc/news-sitemap.xml?reviewPhase0=<timestamp>-<n>`, XML date scan for entries older than 48 hours
Raw output:
```text
[
  {"i":0,"status":200,"ms":3479,"urls":36,"oldCount":0,"cacheControl":"public, max-age=0, s-maxage=300, stale-while-revalidate=60","source":"supabase-rest","contentType":"application/xml"},
  {"i":1,"status":200,"ms":705,"urls":36,"oldCount":0,"cacheControl":"public, max-age=0, s-maxage=300, stale-while-revalidate=60","source":"supabase-rest","contentType":"application/xml"},
  {"i":2,"status":200,"ms":713,"urls":36,"oldCount":0,"cacheControl":"public, max-age=0, s-maxage=300, stale-while-revalidate=60","source":"supabase-rest","contentType":"application/xml"},
  {"i":3,"status":200,"ms":697,"urls":36,"oldCount":0,"cacheControl":"public, max-age=0, s-maxage=300, stale-while-revalidate=60","source":"supabase-rest","contentType":"application/xml"},
  {"i":4,"status":200,"ms":679,"urls":36,"oldCount":0,"cacheControl":"public, max-age=0, s-maxage=300, stale-while-revalidate=60","source":"supabase-rest","contentType":"application/xml"}
]
```
Verdict vs acceptance: All five production requests return 200 XML. Every sample has 36 URL entries and `oldCount=0` for the 48-hour freshness rule. Cache-Control matches the fixed route intent, and `x-skorly-news-sitemap-source` is `supabase-rest`.
Linked finding: none

### E-34 P0-1 review branch P0 runtime baseline alignment
Matrix row: Fix Session / P0-1 review branch P0 runtime baseline alignment
Env: local + prod
Time (UTC): 2026-06-04T07:09:09Z
Method: Fast-forwarded `codex/review` to current `main` source state; restored preserved review docs from stash; ran source inventory commands, local gates, Chrome authenticated production runtime checks while `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error` was active, and production SEO smoke checks.
Raw output:
```text
git stash push --include-untracked -m "preserve review docs before P0-1 runtime merge"
Saved working directory and index state On codex/review: preserve review docs before P0-1 runtime merge

git merge main --no-edit
Updating 5056b2e..885d188
Fast-forward

git stash pop stash@{0}
CONFLICT (modify/delete): docs/review-findings-2026-06-03.md deleted in Updated upstream and modified in Stashed changes. Version Stashed changes of docs/review-findings-2026-06-03.md left in tree.
The stash entry is kept in case you need it again.

branch=codex/review
head=885d188 (HEAD -> codex/review, origin/main, origin/HEAD, main) Document PR 14 production verification

contains c8951ab83f24ac18e0f3758192e6f2f6d0b5d864:
* codex/review
+ codex/seo-p2-followup
+ main

contains ed4e09c08a4711481a8413baec12272b205abf8e:
* codex/review
+ codex/seo-p2-followup
+ main

contains 5056b2e:
  codex/event-structured-data-fix
  codex/legal-pwa-a11y-fixes
  codex/news-sitemap-runtime-hardening
  codex/news-sitemap-supabase-rest
  codex/p0-worker-runtime-fix
* codex/review
+ codex/seo-p2-followup
  codex/seo-sitemap-hreflang-content
+ main

apps/web/app/api files:
apps/web/app/api/bracket/route.ts
apps/web/app/api/comments/[commentId]/like/route.ts
apps/web/app/api/comments/[commentId]/report/route.ts
apps/web/app/api/comments/route.ts
apps/web/app/api/fixtures/[fixtureId]/events/route.ts
apps/web/app/api/fixtures/[fixtureId]/forecast/route.ts
apps/web/app/api/fixtures/[fixtureId]/picks/route.ts
apps/web/app/api/fixtures/[fixtureId]/prediction/route.ts
apps/web/app/api/fixtures/[fixtureId]/premium/route.ts
apps/web/app/api/home/personalization/route.ts
apps/web/app/api/leagues/[slug]/join/route.ts
apps/web/app/api/leagues/route.ts
apps/web/app/api/push/subscribe/route.ts
apps/web/app/api/push/unsubscribe/route.ts
apps/web/app/api/score/live/route.ts
apps/web/app/api/subscribe/confirm/route.ts
apps/web/app/api/subscribe/route.ts
apps/web/app/api/subscribe/unsubscribe/route.ts
apps/web/app/api/teams/groups/route.ts

P0 runtime modules legacy Server Action imports scan:
<no output>

runtime api client imports:
apps/web/components/home-personalized.tsx:6:import { getHomePersonalizationApi, type HomePersonalization } from "@/lib/runtime-api-client";
apps/web/components/forecast-card.tsx:5:import { getForecastApi } from "@/lib/runtime-api-client";
apps/web/components/league-join.tsx:6:import { joinLeagueApi } from "@/lib/runtime-api-client";
apps/web/components/events-timeline.tsx:5:import { getEventsApi } from "@/lib/runtime-api-client";
apps/web/components/live-scoreboard.tsx:5:import { getLiveScoresApi } from "@/lib/runtime-api-client";
apps/web/components/league-create.tsx:6:import { createLeagueApi } from "@/lib/runtime-api-client";
apps/web/components/bracket-builder.tsx:6:import { getBracketApi, getTeamGroupsApi, saveBracketApi } from "@/lib/runtime-api-client";
apps/web/components/notify-bell.tsx:5:import { subscribePushApi, unsubscribePushApi } from "@/lib/runtime-api-client";
apps/web/components/goal-highlights.tsx:5:import { getEventsApi } from "@/lib/runtime-api-client";
apps/web/components/predict-score.tsx:6:import { getMyPredictionApi, submitPredictionApi } from "@/lib/runtime-api-client";
apps/web/components/public-picks.tsx:5:import { getPicksApi } from "@/lib/runtime-api-client";
apps/web/components/comments-section.tsx:12:} from "@/lib/runtime-api-client";
apps/web/components/premium-content.tsx:6:import { getPremiumArticleApi } from "@/lib/runtime-api-client";

pnpm lint
> skorly@0.1.0 lint /Users/johnmacmini/workspace/Football site
> pnpm -r lint
Scope: 9 of 10 workspace projects
apps/web lint$ eslint .
apps/web lint: Done
Exit status: 0

pnpm typecheck
packages/predict-model typecheck$ tsc --noEmit
packages/types typecheck$ tsc --noEmit
packages/ui typecheck$ tsc --noEmit
packages/db typecheck$ tsc --noEmit
packages/ai-content typecheck$ tsc --noEmit
packages/api-football typecheck$ tsc --noEmit
apps/web typecheck$ tsc --noEmit
packages/news typecheck$ tsc --noEmit
apps/jobs typecheck$ tsc --noEmit
packages/predict-model typecheck: Done
packages/types typecheck: Done
packages/ui typecheck: Done
packages/db typecheck: Done
packages/ai-content typecheck: Done
packages/api-football typecheck: Done
apps/web typecheck: Done
packages/news typecheck: Done
apps/jobs typecheck: Done
Exit status: 0

pnpm build
Next.js 16.2.6 (Turbopack)
Environments: .env.local
Compiled successfully in 9.8s
Finished TypeScript in 2.3s
Generating static pages using 3 workers (0/1921)
480/1921
960/1921
1440/1921
✓ Generating static pages using 3 workers (1921/1921) in 3.5min
Exit status: 0

Static page count explanation:
The local build generated 1921/1921 static pages. This matches the current main production deploy baseline recorded in docs/review/review-findings-2026-06-03.md for GitHub Actions run 26933296887: "Generating static pages using 3 workers (1921/1921) in 63s". The count differs from older 1897/1897 evidence because this branch was fast-forwarded from 5056b2e to main commit 885d188, which includes later merged content/code baseline.

pnpm --filter @skorly/api-football test
RUN v3.2.4 /Users/johnmacmini/workspace/Football site/packages/api-football
✓ src/client.test.ts (2 tests) 5ms
Test Files 1 passed (1)
Tests 2 passed (2)
Exit status: 0

@skorly/predict-model test-script check:
jq -r '.scripts // {}' packages/predict-model/package.json
{
  "typecheck": "tsc --noEmit"
}

pnpm --dir packages/predict-model run test
ERR_PNPM_NO_SCRIPT Missing script: test
Command "test" not found.
Exit status: 1
```

Chrome + Worker runtime output:
```text
wrangler tail command:
pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
tail output during Chrome window:
^C
Worker error events observed: 0

Chrome account:
url=https://skorly.cc/id/akun
title=Akun saya | Skorly
h1=Akun saya
worker1101Text=false
visibleErrorCount=0
skeletonCount=0
loadingTextCount=0

Chrome match prediction / forecast / comments:
url=https://skorly.cc/id/pertandingan/mexico-vs-south-africa-20260611
title=Mexico vs South Africa | Skorly
h1=Mexico vs South Africa
worker1101Text=false
visibleErrorCount=0
skeletonCount=0
loadingTextCount=0
scoreInputs=Mexico:1, South Africa:0
containsForecast=true
containsComments=true

Chrome score prediction save:
clicked=true
buttonText=Ubah tebakan
worker1101Text=false
visibleErrorCount=0
containsSaved=true

Chrome bracket save:
url=https://skorly.cc/id/prediksi
title=Prediksi bagan — Piala Dunia 2026 | Skorly
h1=Prediksi bagan
clicked=true
buttonText=Ubah bagan
worker1101Text=false
visibleErrorCount=0
skeletonCount=0
containsSaved=true

Chrome /id/liga repeated authenticated GET:
run 1: title="Liga mini privat | Skorly", h1="Liga mini privat", worker1101Text=false, visibleErrorCount=0, skeletonCount=0
run 2: title="Liga mini privat | Skorly", h1="Liga mini privat", worker1101Text=false, visibleErrorCount=0, skeletonCount=0
run 3: title="Liga mini privat | Skorly", h1="Liga mini privat", worker1101Text=false, visibleErrorCount=0, skeletonCount=0
run 4: title="Liga mini privat | Skorly", h1="Liga mini privat", worker1101Text=false, visibleErrorCount=0, skeletonCount=0
run 5: title="Liga mini privat | Skorly", h1="Liga mini privat", worker1101Text=false, visibleErrorCount=0, skeletonCount=0

Chrome mini-league create/detail:
inputCount=1
createButtonCount=1
clicked=true
detailUrl=https://skorly.cc/id/liga/lg-e7079e
title=P0 runtime 1780556840038 | Skorly
h1=P0 runtime 1780556840038
worker1101Text=false
visibleErrorCount=0
skeletonCount=0

Chrome live score:
url=https://skorly.cc/zh/shishi-bifen
title=2026 世界杯实时比分与赛果 | Skorly
h1=实时比分与赛果
worker1101Text=false
visibleErrorCount=0
skeletonCount=1
loadingTextCount=0
```

Production SEO smoke output:
```text
{
  "timestampUtc": "2026-06-04T07:08:25.944Z",
  "sitemap": {
    "url": "https://skorly.cc/sitemap.xml",
    "status": 200,
    "elapsedMs": 2735,
    "contentType": "application/xml",
    "locCount": 1822,
    "bodyHasWorker1101": false
  },
  "newsSitemap": {
    "url": "https://skorly.cc/news-sitemap.xml",
    "status": 200,
    "elapsedMs": 1481,
    "contentType": "application/xml",
    "locCount": 36,
    "bodyHasWorker1101": false
  },
  "articleSampleUrl": "https://skorly.cc/id/artikel/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-",
  "pages": [
    {
      "label": "team-brazil",
      "status": 200,
      "canonical": "https://skorly.cc/id/tim/brazil",
      "hreflangCount": 5,
      "h1Count": 1,
      "jsonLdCount": 2,
      "jsonLdParsedCount": 2,
      "jsonLdErrors": [],
      "bodyHasWorker1101": false,
      "bodyHasServerError": false
    },
    {
      "label": "match-mexico-south-africa",
      "status": 200,
      "canonical": "https://skorly.cc/id/pertandingan/mexico-vs-south-africa-20260611",
      "hreflangCount": 5,
      "h1Count": 1,
      "jsonLdCount": 2,
      "jsonLdParsedCount": 2,
      "jsonLdErrors": [],
      "eventCoverage": {
        "hasSportsEvent": true,
        "hasStartDate": true,
        "hasLocationName": true,
        "hasLocationLocality": true,
        "hasImage": true,
        "hasDescription": true,
        "hasPerformer": true,
        "hasOrganizer": true,
        "hasEventStatus": true,
        "locationName": "Estadio Banorte",
        "locationLocality": "Mexico City"
      },
      "bodyHasWorker1101": false,
      "bodyHasServerError": false
    },
    {
      "label": "article-sample",
      "status": 200,
      "canonical": "https://skorly.cc/id/artikel/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-",
      "hreflangCount": 5,
      "h1Count": 1,
      "jsonLdCount": 2,
      "jsonLdParsedCount": 2,
      "jsonLdErrors": [],
      "bodyHasWorker1101": false,
      "bodyHasServerError": false
    },
    { "label": "team-missing", "status": 404, "bodyHasWorker1101": false, "bodyHasServerError": false },
    { "label": "match-missing", "status": 404, "bodyHasWorker1101": false, "bodyHasServerError": false },
    { "label": "article-missing", "status": 404, "bodyHasWorker1101": false, "bodyHasServerError": false }
  ],
  "failures": []
}
```
Verdict vs acceptance: `codex/review` now contains the two fixed P0 runtime commits and preserves the event structured data commit `5056b2e`. The affected P0 client runtime modules import `runtime-api-client`, the route-handler inventory contains prediction, forecast, live score, events, comments, bracket, mini league, push, premium, team groups, and home personalization API routes, and the scoped legacy Server Action import scan for those runtime modules has no output. Local gates passed: `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm --filter @skorly/api-football test`. `@skorly/predict-model` has no `test` script; no test pass is claimed for that package. Production Chrome runtime checks completed with Worker error events observed = 0, no visible 1101/500 error text, and no loading text. SEO smoke returned no failures and confirmed SportsEvent JSON-LD coverage on the sampled match page.
Linked finding: P0-1

### E-36 Subscribe API accepts missing or fake Turnstile token
Matrix row: SEO And Platform Endpoints / `/api/subscribe`; API, Security, Privacy Matrix / Subscribe API; User Flow Matrix / Subscribe invalid input
Env: prod
Time (UTC): 2026-06-04T08:09:11.541Z
Method: Production POST requests to `https://skorly.cc/api/subscribe` with valid non-CAPTCHA fields and missing/fake `turnstileToken`; `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error` was running during the request window; `pnpm --dir apps/web exec wrangler secret list --name skorly-web` listed production Worker secret names only.
Raw output:
```text
node <<'NODE'
const base = 'https://skorly.cc';
const ts = new Date().toISOString();
const cases = [
  {
    name: 'subscribe-valid-missing-turnstile',
    body: { email: `codex-review-missing-${Date.now()}@example.com`, locale: 'id', consent: true, source: 'review-api-smoke' },
  },
  {
    name: 'subscribe-valid-fake-turnstile',
    body: { email: `codex-review-fake-${Date.now()}@example.com`, locale: 'id', consent: true, source: 'review-api-smoke', turnstileToken: 'invalid-token' },
  },
];
console.log(JSON.stringify({ timestampUtc: ts, base }));
for (const c of cases) {
  const started = Date.now();
  const res = await fetch(base + '/api/subscribe', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(c.body),
  });
  const body = await res.text();
  console.log(JSON.stringify({
    name: c.name,
    request: { email: c.body.email, locale: c.body.locale, consent: c.body.consent, source: c.body.source, turnstileToken: c.body.turnstileToken ?? null },
    status: res.status,
    contentType: res.headers.get('content-type'),
    ms: Date.now() - started,
    worker1101Text: body.includes('Worker threw exception') || body.includes('1101'),
    secretLeakText: /SUPABASE|SERVICE_ROLE|TURNSTILE|RESEND|AUTH_SECRET/i.test(body),
    body: body.replace(/\s+/g, ' ').slice(0, 260),
  }));
}
NODE

{"timestampUtc":"2026-06-04T08:09:11.541Z","base":"https://skorly.cc"}
{"name":"subscribe-valid-missing-turnstile","request":{"email":"codex-review-missing-1780560551542@example.com","locale":"id","consent":true,"source":"review-api-smoke","turnstileToken":null},"status":200,"contentType":"application/json","ms":2405,"worker1101Text":false,"secretLeakText":false,"body":"{\"ok\":true,\"pending\":true}"}
{"name":"subscribe-valid-fake-turnstile","request":{"email":"codex-review-fake-1780560551542@example.com","locale":"id","consent":true,"source":"review-api-smoke","turnstileToken":"invalid-token"},"status":200,"contentType":"application/json","ms":1576,"worker1101Text":false,"secretLeakText":false,"body":"{\"ok\":true,\"pending\":true}"}

pnpm --dir apps/web exec wrangler secret list --name skorly-web
[
  {
    "name": "SUPABASE_SERVICE_ROLE_KEY",
    "type": "secret_text"
  }
]

sed -n '1,40p' apps/web/lib/turnstile.ts
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured (local/dev) -> skip
  if (!token) return false;
  ...
}

pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
<no JSON event lines emitted during the 2026-06-04T08:09:11Z API request window>

ps -ax -o pid=,command= | rg "wrangler tail skorly-web"
82858 /bin/zsh -c ps -ax -o pid=,command= | rg "wrangler tail skorly-web"
82860 rg wrangler tail skorly-web
```
Verdict vs acceptance: Fails. With `email` valid, `consent=true`, and `locale=id`, the missing-token request returned `200 {"ok":true,"pending":true}` and the fake-token request returned `200 {"ok":true,"pending":true}`. The endpoint acceptance requires missing CAPTCHA to return 4xx and the security/privacy row requires stable validation without private leakage. The Worker secret-name list contains `SUPABASE_SERVICE_ROLE_KEY` and does not contain `TURNSTILE_SECRET_KEY`; the source returns true when that secret is absent, which matches the production response.
Linked finding: P1-1

### E-37 P1-1 subscribe Turnstile fail-closed and production verification
Matrix row: SEO/API endpoint `/api/subscribe`; API, Security, Privacy Matrix / Subscribe API; User Flow / Subscribe invalid input
Env: local + prod
Time (UTC): 2026-06-04T08:40:59Z
Method: Code change in `apps/web/lib/turnstile.ts`; runtime site-key fallback in `apps/web/components/auth/turnstile.tsx` and `apps/web/app/api/turnstile/site-key/route.ts`; Cloudflare Worker secret configuration; local helper checks; `pnpm lint`; `pnpm typecheck`; `pnpm build`; direct production deploy; production API checks; Chrome real subscribe flow; `wrangler tail --status error` with a temporary DNS override for `tail.developers.workers.dev`.
Raw output:
```text
Code change:
apps/web/lib/turnstile.ts
const secret = process.env.TURNSTILE_SECRET_KEY;
if (!secret) return false;
if (!token) return false;

apps/web/components/auth/turnstile.tsx
BUILD_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null
If build-time site key is absent, fetch("/api/turnstile/site-key") and render Turnstile after a non-empty siteKey response.

apps/web/app/api/turnstile/site-key/route.ts
GET returns 200 {"ok":true,"siteKey":...} when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` or `TURNSTILE_SITE_KEY` is configured; returns 404 notConfigured otherwise.

pnpm --dir apps/web exec wrangler secret put TURNSTILE_SECRET_KEY --name skorly-web
✨ Success! Uploaded secret TURNSTILE_SECRET_KEY

pnpm --dir apps/web exec wrangler secret put TURNSTILE_SITE_KEY --name skorly-web
✨ Success! Uploaded secret TURNSTILE_SITE_KEY

pnpm --dir apps/web exec wrangler secret list --name skorly-web
[
  { "name": "SUPABASE_SERVICE_ROLE_KEY", "type": "secret_text" },
  { "name": "TURNSTILE_SECRET_KEY", "type": "secret_text" },
  { "name": "TURNSTILE_SITE_KEY", "type": "secret_text" }
]

env -u TURNSTILE_SECRET_KEY pnpm exec tsx -e "<verifyTurnstile check>"
{"missingSecretMissingToken":false,"missingSecretFakeToken":false}

set -a; . ./.env; set +a; pnpm exec tsx -e "<verifyTurnstile check>"
{"configuredMissingToken":false,"configuredFakeToken":false}

pnpm lint
apps/web lint$ eslint .
apps/web lint: Done
Exit status: 0

pnpm typecheck
packages/predict-model typecheck: Done
packages/types typecheck: Done
packages/ui typecheck: Done
packages/api-football typecheck: Done
packages/ai-content typecheck: Done
packages/db typecheck: Done
packages/news typecheck: Done
apps/web typecheck: Done
apps/jobs typecheck: Done
Exit status: 0

pnpm build
✓ Generating static pages using 3 workers (1922/1922) in 3.5min
Route table includes: ƒ /api/turnstile/site-key
Exit status: 0

Static page count explanation:
The build count changed from 1921/1921 to 1922/1922 because the fix adds one dynamic route: /api/turnstile/site-key.

pnpm --filter @skorly/web cf:deploy
✓ Generating static pages using 3 workers (1922/1922) in 3.3min
✨ Success! Uploaded 1595 files (444 already uploaded) (90.96 sec)
Total Upload: 14914.41 KiB / gzip: 2862.57 KiB
Worker Startup Time: 27 ms
Uploaded skorly-web (112.16 sec)
Deployed skorly-web triggers (5.25 sec)
Current Version ID: 7ce09fcd-1084-46d2-846f-d13edcb328ad
```

Production API output:
```text
GET https://skorly.cc/api/turnstile/site-key
{"name":"site-key-route","status":200,"ms":2210,"contentType":"application/json","bodyHasSiteKey":true,"siteKeyLength":24,"bodyWithoutSiteKey":{"ok":true,"siteKey":"<redacted-public-site-key>"},"secretLeakText":false,"worker1101Text":false}

POST https://skorly.cc/api/subscribe without turnstileToken
{"name":"missing-token-connected-tail","status":403,"ms":2543,"body":"{\"ok\":false,\"error\":\"captcha\"}","secretLeakText":false,"worker1101Text":false}

POST https://skorly.cc/api/subscribe with turnstileToken="invalid-token"
{"name":"fake-token-connected-tail","status":403,"ms":583,"body":"{\"ok\":false,\"error\":\"captcha\"}","secretLeakText":false,"worker1101Text":false}
```

Chrome real subscribe output:
```text
URL: https://skorly.cc/id
email: codex-p1-real-connected-1780562398128@example.com
tokenPollLast:
  tokenLength: 816
  turnstileDivCount: 1
  formCount: 1
submitResult:
  submitted: true
  buttonText: Kirim Panduan Saya
post-submit:
  formCount: 0
  successTextPresent: true
  captchaErrorText: false
  rateLimitedText: false
  worker1101Text: false
timestampUtc: 2026-06-04T08:40:17.082Z
```

wrangler tail output:
```text
System resolver diagnostic:
dig +short tail.developers.workers.dev
64.13.192.74

dig @1.1.1.1 +short tail.developers.workers.dev
172.67.133.177
104.21.5.179

wrangler tail without DNS override:
Successfully created tail, expires at 2026-06-04T12:21:53Z
Error [ERR_TLS_CERT_ALTNAME_INVALID]: Hostname/IP does not match certificate's altnames:
Host: tail.developers.workers.dev. is not in the cert's altnames: DNS:*.facebook.com, ...

NODE_OPTIONS="--require=/tmp/cf-tail-dns-override.XXXXXX.cjs" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self
Successfully created tail, expires at 2026-06-04T12:21:53Z
Connected to skorly-web, waiting for logs...

During the connected tail window, the missing-token API request, fake-token API request, and Chrome real subscribe flow above were executed.

tail stop output:
^C
Worker error event lines observed during connected tail window: 0
```
Verdict vs acceptance: Pass. Production has `TURNSTILE_SECRET_KEY` and `TURNSTILE_SITE_KEY` configured. The server verifier returns false when the secret is absent, missing token returns 403 captcha, fake token returns 403 captcha, and the response bodies checked do not contain private secret names or secret values. The Chrome flow rendered a real Turnstile widget through the runtime site-key fallback, produced a token with length 816, submitted the subscribe form, and replaced the form with the success state. `wrangler tail --status error` was connected during the production API and Chrome checks and emitted 0 error event lines. The local build added one route, so static generation changed from 1921 to 1922 pages.
Linked finding: P1-1

### E-38 Independent P1-1 post-deploy verification
Matrix row: SEO/API endpoint `/api/subscribe`; API, Security, Privacy Matrix / Subscribe API; User Flow / Subscribe invalid input
Env: prod
Time (UTC): 2026-06-04T09:02:06.543Z
Method: Independent review-session verification after PR #16 merge. Checked current Worker deployment version, production Worker secret names, production API responses, Chrome real subscribe flow on `https://skorly.cc/zh`, and `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error` during API and Chrome windows.
Raw output:
```text
git log --oneline --decorate -5 origin/main
9a95cc1 (origin/main, origin/HEAD) Merge pull request #16 from john-hoe/codex/p1-subscribe-turnstile
b03bd97 (HEAD -> codex/p1-subscribe-turnstile) Fix subscribe Turnstile verification
ed7018e Merge pull request #15 from john-hoe/codex/review
e30428c (codex/review) Fix review branch P0 runtime baseline
885d188 (main) Document PR 14 production verification

git diff --stat HEAD..origin/main
<no output>

pnpm --dir apps/web exec wrangler deployments list --name skorly-web
Created:     2026-06-04T08:47:58.799Z
Version(s):  (100%) 916217ff-ebe3-47c1-acd0-b2c72cd76406
                 Created:  2026-06-04T08:47:55.747Z

sed -n '1,120p' apps/web/lib/turnstile.ts
const secret = process.env.TURNSTILE_SECRET_KEY;
if (!secret) return false;
if (!token) return false;

find apps/web/app/api/turnstile -type f -maxdepth 3 -print -exec sed -n '1,120p' {} \;
apps/web/app/api/turnstile/site-key/route.ts
const siteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? process.env.TURNSTILE_SITE_KEY;
if (!siteKey) {
  return NextResponse.json({ ok: false, error: "notConfigured" }, { status: 404 });
}
return NextResponse.json({ ok: true, siteKey });

pnpm --dir apps/web exec wrangler secret list --name skorly-web
[
  { "name": "SUPABASE_SERVICE_ROLE_KEY", "type": "secret_text" },
  { "name": "TURNSTILE_SECRET_KEY", "type": "secret_text" },
  { "name": "TURNSTILE_SITE_KEY", "type": "secret_text" }
]

Production API verification at 2026-06-04T09:00:03.759Z:
{"name":"turnstile-site-key","status":200,"location":null,"contentType":"application/json","ms":2471,"worker1101Text":false,"secretLeakText":false,"parsed":{"ok":true,"siteKey":"[redacted length 24]"}}
{"name":"subscribe-valid-missing-turnstile","status":403,"location":null,"contentType":"application/json","ms":647,"worker1101Text":false,"secretLeakText":false,"parsed":{"ok":false,"error":"captcha"},"body":"{\"ok\":false,\"error\":\"captcha\"}"}
{"name":"subscribe-valid-fake-turnstile","status":403,"location":null,"contentType":"application/json","ms":567,"worker1101Text":false,"secretLeakText":false,"parsed":{"ok":false,"error":"captcha"},"body":"{\"ok\":false,\"error\":\"captcha\"}"}

wrangler tail for API verification:
pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
<no JSON event lines emitted during the 2026-06-04T09:00:03Z API request window>
^C

Chrome real subscribe pre-submit state on https://skorly.cc/zh:
{
  "email": "codex-review-ui-1780563806919@example.com",
  "before": {
    "buttonText": "发送指南",
    "consentChecked": true,
    "emailValue": "codex-review-ui-1780563806919@example.com",
    "tokenLength": 816,
    "url": "https://skorly.cc/zh"
  }
}

Chrome real subscribe post-submit state:
{
  "after": {
    "bodyHasCaptchaError": false,
    "bodyHasRuntimeError": false,
    "formCount": 0,
    "successElementText": "就差一步——请查收邮件！\n\n我们已发送确认链接，点击即可开始接收独家预测。",
    "tokenInputs": 0,
    "url": "https://skorly.cc/zh"
  }
}

wrangler tail for Chrome submit:
pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
<no JSON event lines emitted during the 2026-06-04T09:02:06Z Chrome submit window>
^C
```
Verdict vs acceptance: Pass. Current production deployment is version `916217ff-ebe3-47c1-acd0-b2c72cd76406`, and `origin/main` contains PR #16 commit `9a95cc1`. Production has both Turnstile secrets listed by name. Missing token and fake token both returned `403 {"ok":false,"error":"captcha"}` with `worker1101Text=false` and `secretLeakText=false`. Chrome rendered a real Turnstile response token with length 816, submitted the subscribe form, removed the form, and displayed the email-confirmation success text. `wrangler tail --status error` emitted 0 JSON error event lines during the independent API and Chrome verification windows.
Linked finding: P1-1

### E-39 Subscribe confirm/unsubscribe token route verification
Matrix row: SEO/API endpoint `/api/subscribe/confirm`; SEO/API endpoint `/api/subscribe/unsubscribe`; API, Security, Privacy Matrix / Confirm/unsubscribe
Env: prod
Time (UTC): 2026-06-04T09:09:36.416Z
Method: Queried the previously submitted review subscriber by test email with service-role access and printed only non-secret state fields; then hit production confirm/unsubscribe routes with missing token, invalid token, and the redacted real token while `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error` was running.
Raw output:
```text
Precheck subscriber row:
{
  "timestampUtc": "2026-06-04T09:09:09.598Z",
  "status": 200,
  "email": "codex-review-ui-1780563806919@example.com",
  "found": true,
  "id": 7,
  "tokenLength": 36,
  "confirmedAtExists": false,
  "unsubscribedAtExists": false,
  "consentMarketing": true
}

Production route verification:
{
  "timestampUtc": "2026-06-04T09:09:36.416Z",
  "base": "https://skorly.cc",
  "email": "codex-review-ui-1780563806919@example.com",
  "tokenLength": 36,
  "before": {
    "found": true,
    "id": 7,
    "tokenLength": 36,
    "confirmedAtExists": false,
    "unsubscribedAtExists": false,
    "consentMarketing": true
  },
  "responses": [
    {
      "name": "confirm-missing-token",
      "status": 400,
      "contentType": "text/html; charset=utf-8",
      "ms": 2365,
      "worker1101Text": false,
      "secretLeakText": false,
      "hasConfirmOkZh": false,
      "hasUnsubscribeOkZh": false,
      "hasBadZh": true
    },
    {
      "name": "confirm-invalid-token",
      "status": 400,
      "contentType": "text/html; charset=utf-8",
      "ms": 2232,
      "worker1101Text": false,
      "secretLeakText": false,
      "hasConfirmOkZh": false,
      "hasUnsubscribeOkZh": false,
      "hasBadZh": true
    },
    {
      "name": "unsubscribe-missing-token",
      "status": 400,
      "contentType": "text/html; charset=utf-8",
      "ms": 296,
      "worker1101Text": false,
      "secretLeakText": false,
      "hasConfirmOkZh": false,
      "hasUnsubscribeOkZh": false,
      "hasBadZh": true
    },
    {
      "name": "unsubscribe-invalid-token",
      "status": 400,
      "contentType": "text/html; charset=utf-8",
      "ms": 522,
      "worker1101Text": false,
      "secretLeakText": false,
      "hasConfirmOkZh": false,
      "hasUnsubscribeOkZh": false,
      "hasBadZh": true
    },
    {
      "name": "confirm-real-token",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "ms": 925,
      "worker1101Text": false,
      "secretLeakText": false,
      "hasConfirmOkZh": true,
      "hasUnsubscribeOkZh": false,
      "hasBadZh": false
    },
    {
      "name": "unsubscribe-real-token",
      "status": 200,
      "contentType": "text/html; charset=utf-8",
      "ms": 501,
      "worker1101Text": false,
      "secretLeakText": false,
      "hasConfirmOkZh": false,
      "hasUnsubscribeOkZh": true,
      "hasBadZh": false
    }
  ],
  "afterConfirm": {
    "found": true,
    "id": 7,
    "tokenLength": 36,
    "confirmedAtExists": true,
    "unsubscribedAtExists": false,
    "consentMarketing": true
  },
  "afterUnsubscribe": {
    "found": true,
    "id": 7,
    "tokenLength": 36,
    "confirmedAtExists": true,
    "unsubscribedAtExists": true,
    "consentMarketing": false
  }
}

wrangler tail:
pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
<no JSON event lines emitted during the 2026-06-04T09:09:36Z confirm/unsubscribe request window>
^C
```
Verdict vs acceptance: Pass. Missing and invalid confirm/unsubscribe tokens returned 400 localized HTML with invalid-link text and no secret leakage. The real confirm token returned 200, produced the localized confirm-success text, and changed the subscriber row from `confirmedAtExists=false` to `confirmedAtExists=true`. The same real token then returned 200 from unsubscribe, produced the localized unsubscribe-success text, and changed the subscriber row to `unsubscribedAtExists=true` with `consentMarketing=false`. `wrangler tail --status error` emitted 0 JSON error event lines during the route verification window.
Linked finding: none

### E-40 Auth callback real signup token returns production 500
Matrix row: SEO/API endpoint `/auth/callback`; User Flow Matrix / Email confirmation
Env: prod
Time (UTC): 2026-06-04T09:19:10.894Z
Method: Production invalid-callback checks via HTTP; Supabase admin-generated signup verification tokens with `redirectTo=https://skorly.cc/auth/callback?next=/id/akun`; production callback hit with token redacted; Supabase admin user-state check after callback; attempted `wrangler tail` normal and DNS-overridden sessions during callback windows.
Raw output:
```text
Invalid callback checks:
{"timestampUtc":"2026-06-04T09:14:12.460Z","base":"https://skorly.cc"}
{"name":"auth-callback-missing","status":307,"location":"https://skorly.cc/id/masuk?error=auth","ms":2168,"bodyLength":0,"worker1101Text":false,"secretLeakText":false}
{"name":"auth-callback-fake-code","status":307,"location":"https://skorly.cc/id/masuk?error=auth","ms":1149,"bodyLength":0,"worker1101Text":false,"secretLeakText":false}
{"name":"auth-callback-bad-next","status":307,"location":"https://skorly.cc/id/masuk?error=auth","ms":256,"bodyLength":0,"worker1101Text":false,"secretLeakText":false}
{"name":"auth-callback-double-slash-next","status":307,"location":"https://skorly.cc/id/masuk?error=auth","ms":263,"bodyLength":0,"worker1101Text":false,"secretLeakText":false}

Supabase admin generateLink shape:
{
  "timestampUtc": "2026-06-04T09:13:33.062Z",
  "email": "codex-auth-callback-1780564410483@example.com",
  "userIdExists": true,
  "hashedTokenLength": 56,
  "verificationType": "signup",
  "callbackHost": "skorly.cc",
  "callbackPath": "/auth/callback"
}

Real generated signup token callback attempt 1:
{
  "timestampUtc": "2026-06-04T09:16:35.259Z",
  "email": "codex-auth-callback-1780564410483@example.com",
  "hashedTokenLength": 56,
  "verificationType": "signup",
  "response": {
    "status": 500,
    "location": null,
    "contentType": null,
    "ms": 4155,
    "bodyLength": 0,
    "setCookieCount": 0,
    "cookieNames": [],
    "worker1101Text": false,
    "secretLeakText": false
  },
  "user": {
    "idExists": true,
    "emailConfirmedAtExists": false,
    "lastSignInAtExists": false
  }
}

Same generated signup token callback attempt 2:
{
  "timestampUtc": "2026-06-04T09:17:14.097Z",
  "email": "codex-auth-callback-1780564410483@example.com",
  "hashedTokenLength": 56,
  "verificationType": "signup",
  "response": {
    "status": 500,
    "location": null,
    "contentType": null,
    "ms": 3038,
    "bodyLength": 0,
    "setCookieCount": 0,
    "cookieNames": [],
    "worker1101Text": false,
    "secretLeakText": false,
    "body": ""
  },
  "user": {
    "idExists": true,
    "emailConfirmedAtExists": false,
    "lastSignInAtExists": false
  }
}

Fresh generated signup token callback attempt:
{
  "timestampUtc": "2026-06-04T09:17:52.742Z",
  "email": "codex-auth-callback-fresh-1780564669165@example.com",
  "userIdExists": true,
  "hashedTokenLength": 56,
  "verificationType": "signup",
  "response": {
    "status": 500,
    "location": null,
    "contentType": null,
    "ms": 2054,
    "bodyLength": 0,
    "setCookieCount": 0,
    "worker1101Text": false,
    "secretLeakText": false,
    "body": ""
  },
  "user": {
    "idExists": true,
    "emailConfirmedAtExists": false,
    "lastSignInAtExists": false
  }
}

Fresh generated signup token callback attempt while DNS-overridden wrangler tail process was running:
{
  "timestampUtc": "2026-06-04T09:19:10.894Z",
  "email": "codex-auth-callback-tail-1780564747023@example.com",
  "userIdExists": true,
  "hashedTokenLength": 56,
  "verificationType": "signup",
  "response": {
    "status": 500,
    "location": null,
    "contentType": null,
    "ms": 1607,
    "bodyLength": 0,
    "setCookieCount": 0,
    "worker1101Text": false,
    "secretLeakText": false,
    "body": ""
  },
  "user": {
    "idExists": true,
    "emailConfirmedAtExists": false,
    "lastSignInAtExists": false
  }
}

wrangler tail attempts:
pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
Error: Client network socket disconnected before secure TLS connection was established
code: 'ECONNRESET'
host: 'tail.developers.workers.dev'

dig +short tail.developers.workers.dev
31.13.82.33

dig @1.1.1.1 +short tail.developers.workers.dev
172.67.133.177
104.21.5.179

NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
<no JSON event lines emitted during the 2026-06-04T09:19:10Z fresh callback request window>
^C
```
Verdict vs acceptance: Fails. Invalid and malicious `next` callback inputs redirect safely to `https://skorly.cc/id/masuk?error=auth`, but real Supabase-generated signup verification tokens fail the production callback. Three generated signup-token attempts returned HTTP 500, emitted no session cookies, and left the associated Supabase users with `emailConfirmedAtExists=false` and `lastSignInAtExists=false`. This fails the callback acceptance that a real email token creates a production session and the email-confirmation flow acceptance that the confirmed user can access `/id/akun`.
Linked finding: P0-2

### E-43 Independent P0-2 auth callback recheck
Matrix row: SEO/API endpoint `/auth/callback`; User Flow Matrix / Email confirmation
Env: prod
Time (UTC): 2026-06-04T11:34:20.027Z
Method: Verified `origin/main` at PR #18, checked production deployment version, generated fresh Supabase signup verification tokens with token values redacted, hit production `/auth/callback` via HTTP, followed another fresh callback in Playwright-driven Chrome with a temporary profile, checked Supabase user state, and ran DNS-overridden `wrangler tail` during both callback windows.
Raw output:
```text
git log --oneline --decorate -8 origin/main
0d8b1a5 (HEAD -> codex/p0-auth-callback, origin/main, origin/HEAD, main) Merge pull request #18 from john-hoe/codex/p0-auth-callback
8f10351 Document auth callback verification
aa86b0a Fix auth callback cookie redirect
c6b97f2 Merge pull request #17 from john-hoe/codex/fix-organizer-url-structured-data
aef1c02 fix sports event organizer url
9a95cc1 Merge pull request #16 from john-hoe/codex/p1-subscribe-turnstile

git diff --stat HEAD..origin/main
<no output>

pnpm --dir apps/web exec wrangler deployments list --name skorly-web
Created:     2026-06-04T10:12:29.335Z
Version(s):  (100%) 0e809ff5-6a5d-4cb6-8d21-d5cf3cdde655
                 Created:  2026-06-04T10:12:26.382Z

apps/web/app/auth/callback/route.ts
successResponse = noStoreRedirect(`${origin}${next}`)
createServerClient(..., {
  cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(cookiesToSet, headers) {
      for (const { name, value, options } of cookiesToSet) {
        successResponse.cookies.set(name, value, options);
      }
      for (const [key, value] of Object.entries(headers)) {
        successResponse.headers.set(key, value);
      }
    },
  },
})

HTTP callback verification:
{
  "timestampUtc": "2026-06-04T11:29:52.665Z",
  "base": "https://skorly.cc",
  "originMain": "0d8b1a5",
  "generated": {
    "email": "codex-p0-auth-verify-1780572587921@example.com",
    "userIdExists": true,
    "hashedTokenLength": 56,
    "verificationType": "signup",
    "redirectToHost": "skorly.cc",
    "redirectToPath": "/auth/callback"
  },
  "invalidChecks": [
    {
      "name": "auth-callback-missing",
      "status": 307,
      "location": "https://skorly.cc/id/masuk?error=auth",
      "setCookieCount": 0,
      "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
      "worker1101Text": false,
      "secretLeakText": false
    },
    {
      "name": "auth-callback-fake-code",
      "status": 307,
      "location": "https://skorly.cc/id/masuk?error=auth",
      "setCookieCount": 0,
      "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
      "worker1101Text": false,
      "secretLeakText": false
    },
    {
      "name": "auth-callback-bad-next",
      "status": 307,
      "location": "https://skorly.cc/id/masuk?error=auth",
      "setCookieCount": 0,
      "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
      "worker1101Text": false,
      "secretLeakText": false
    },
    {
      "name": "auth-callback-double-slash-next",
      "status": 307,
      "location": "https://skorly.cc/id/masuk?error=auth",
      "setCookieCount": 0,
      "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
      "worker1101Text": false,
      "secretLeakText": false
    }
  ],
  "realCallback": {
    "name": "auth-callback-real-signup-token",
    "status": 307,
    "location": "https://skorly.cc/id/akun",
    "ms": 1101,
    "bodyLength": 0,
    "setCookieCount": 1,
    "cookieNames": ["sb-majrlaxktengachwrskk-auth-token"],
    "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
    "worker1101Text": false,
    "secretLeakText": false
  },
  "user": {
    "idExists": true,
    "emailConfirmedAtExists": true,
    "lastSignInAtExists": true
  }
}

Playwright-driven Chrome callback verification:
{
  "timestampUtc": "2026-06-04T11:34:20.027Z",
  "browserName": "chrome",
  "email": "codex-p0-auth-browser-1780572838112@example.com",
  "generated": {
    "userIdExists": true,
    "hashedTokenLength": 56,
    "verificationType": "signup",
    "redirectToHost": "skorly.cc",
    "redirectToPath": "/auth/callback"
  },
  "navigation": {
    "initialResponseStatus": 200,
    "finalUrl": "https://skorly.cc/id/akun",
    "title": "Akun saya | Skorly",
    "h1": "Akun saya",
    "ms": 17646,
    "bodyHasExpectedEmail": false,
    "bodyHasAccountText": true,
    "bodyHasLoginError": false,
    "bodyHasRuntimeError": false
  },
  "cookies": {
    "count": 3,
    "names": ["sb-majrlaxktengachwrskk-auth-token"],
    "authCookieCount": 1
  },
  "user": {
    "idExists": true,
    "emailConfirmedAtExists": true,
    "lastSignInAtExists": true
  },
  "consoleErrors": []
}

wrangler tail command:
NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self

wrangler tail output during HTTP callback window:
Successfully created tail, expires at 2026-06-04T12:21:53Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>

wrangler tail output during Playwright-driven Chrome callback window:
Successfully created tail, expires at 2026-06-04T12:21:53Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>
```
Verdict vs acceptance: Pass. Invalid params, fake code, malicious absolute `next`, and protocol-relative `next` still redirect to the localized login error page without external redirect. A fresh Supabase signup verification token now returns `307` to `https://skorly.cc/id/akun`, sets one Supabase auth cookie, and leaves the generated user with `emailConfirmedAtExists=true` and `lastSignInAtExists=true`. Playwright-driven Chrome with a temporary profile followed a fresh real callback to `https://skorly.cc/id/akun`, rendered `Akun saya | Skorly` with `h1="Akun saya"`, had one auth cookie, no login/runtime error text, and no console errors. DNS-overridden `wrangler tail --status error` was connected during both callback verification windows and emitted no error event lines.
Linked finding: P0-2

### E-41 P0-2 auth callback signup verification fix
Matrix row: SEO/API endpoint `/auth/callback`; User Flow Matrix / Email confirmation
Env: local + prod
Time (UTC): 2026-06-04T10:00:56.712Z
Method: Source fix in `apps/web/app/auth/callback/route.ts`; local gates; local production server real Supabase signup-token callback; direct production deploy with OpenNext/Cloudflare; production HTTP invalid/real-token callback checks; Chrome real callback navigation; Supabase admin user-state checks; DNS-overridden `wrangler tail --status error`; production SEO smoke.
Raw output:
```text
Source change:
apps/web/app/auth/callback/route.ts now creates a callback-scoped @supabase/ssr server client from NextRequest cookies and writes auth cookies plus cache headers onto the exact NextResponse.redirect returned on success. The route no longer depends on the generic Server Component cookie helper for this auth callback response.

Local gates:
pnpm lint
apps/web lint$ eslint .
apps/web lint: Done
Exit status: 0

pnpm typecheck
packages/predict-model typecheck$ tsc --noEmit
packages/types typecheck$ tsc --noEmit
packages/ui typecheck$ tsc --noEmit
packages/ai-content typecheck$ tsc --noEmit
packages/db typecheck$ tsc --noEmit
packages/api-football typecheck$ tsc --noEmit
packages/news typecheck$ tsc --noEmit
apps/web typecheck$ tsc --noEmit
apps/jobs typecheck$ tsc --noEmit
Exit status: 0

pnpm --filter @skorly/api-football test
Test Files  1 passed (1)
Tests  2 passed (2)
Exit status: 0

pnpm --dir packages/predict-model run test
ERR_PNPM_NO_SCRIPT Missing script: test
Command "test" not found.
Exit status: 1

pnpm build
Next.js 16.2.6 (Turbopack)
Compiled successfully in 10.9s
Generating static pages using 3 workers (1922/1922) in 3.3min
Route table includes dynamic /auth/callback and the existing SSG route families:
  /[locale]/artikel/[slug] [+1007 more paths]
  /[locale]/pertandingan/[slug] [+285 more paths]
  /[locale]/cerita/[slug] [+285 more paths]
  /[locale]/tim/[slug] [+189 more paths]
Exit status: 0

Local production server callback:
{
  "timestampUtc": "2026-06-04T09:49:29.206Z",
  "response": {
    "status": 307,
    "location": "http://localhost:3100/id/akun",
    "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
    "expires": "0",
    "pragma": "no-cache",
    "bodyLength": 0,
    "setCookieCount": 1,
    "cookieNames": ["sb-majrlaxktengachwrskk-auth-token"]
  },
  "user": {
    "emailConfirmedAtExists": true,
    "lastSignInAtExists": true
  }
}

Local invalid callback checks:
{"name":"missing","status":307,"location":"http://localhost:3100/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}
{"name":"fake-code","status":307,"location":"http://localhost:3100/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}
{"name":"bad-next","status":307,"location":"http://localhost:3100/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}
{"name":"double-slash-next","status":307,"location":"http://localhost:3100/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}

Direct production deploy:
pnpm --filter @skorly/web cf:deploy
OpenNext build:
Compiled successfully in 8.4s
Generating static pages using 3 workers (1922/1922) in 3.3min
Uploaded skorly-web (114.25 sec)
Deployed skorly-web triggers (3.31 sec)
Current Version ID: 6bb071d3-3f04-4743-87db-477705c2d226
Exit status: 0

Production invalid callback checks:
{"name":"missing","status":307,"location":"https://skorly.cc/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}
{"name":"fake-code","status":307,"location":"https://skorly.cc/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}
{"name":"bad-next","status":307,"location":"https://skorly.cc/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}
{"name":"double-slash-next","status":307,"location":"https://skorly.cc/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}

Production real generated signup token callbacks:
[
  {
    "i": 0,
    "status": 307,
    "location": "https://skorly.cc/id/akun",
    "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
    "expires": "0",
    "pragma": "no-cache",
    "bodyLength": 0,
    "setCookieCount": 1,
    "cookieNames": ["sb-majrlaxktengachwrskk-auth-token"],
    "emailConfirmedAtExists": true,
    "lastSignInAtExists": true
  },
  {
    "i": 1,
    "status": 307,
    "location": "https://skorly.cc/id/akun",
    "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
    "expires": "0",
    "pragma": "no-cache",
    "bodyLength": 0,
    "setCookieCount": 1,
    "cookieNames": ["sb-majrlaxktengachwrskk-auth-token"],
    "emailConfirmedAtExists": true,
    "lastSignInAtExists": true
  },
  {
    "i": 2,
    "status": 307,
    "location": "https://skorly.cc/id/akun",
    "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
    "expires": "0",
    "pragma": "no-cache",
    "bodyLength": 0,
    "setCookieCount": 1,
    "cookieNames": ["sb-majrlaxktengachwrskk-auth-token"],
    "emailConfirmedAtExists": true,
    "lastSignInAtExists": true
  }
]

Chrome real callback:
{
  "timestampUtc": "2026-06-04T09:59:00.799Z",
  "finalUrl": "https://skorly.cc/id/akun",
  "title": "Akun saya | Skorly",
  "bodyTextSample": "Skorly\\nSkor Langsung\\nPiala Dunia 2026\\nPertandingan\\nTim\\nBerita\\nArtikel\\nKlasemen\\nLiga\\n🔔\\nMasuk\\nDaftar\\nID\\nVI\\nEN\\n中文\\nBerita & analisis sepak bola Piala Dunia 2026\\nAkun saya\\n\\nKeanggotaan: Anggota",
  "workerOrErrorTextCount": 0,
  "consoleErrorCount": 0,
  "consoleErrors": []
}

Supabase user state after Chrome callback:
{
  "timestampUtc": "2026-06-04T09:59:13.606Z",
  "idExists": true,
  "emailConfirmedAtExists": true,
  "lastSignInAtExists": true
}

Controlled wrangler tail window:
NODE_OPTIONS="<DNS override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
Triggered fresh generated signup token callback while tail was running:
{"timestampUtc":"2026-06-04T09:59:49.779Z","status":307,"location":"https://skorly.cc/id/akun","setCookiePresent":true,"emailConfirmedAtExists":true,"lastSignInAtExists":true}
TAIL_LOG_BYTES=0
TAIL_LOG_CONTENT_BEGIN
TAIL_LOG_CONTENT_END

Production SEO smoke:
{
  "timestampUtc": "2026-06-04T10:00:56.712Z",
  "articleUrl": "https://skorly.cc/id/artikel/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-",
  "failures": [],
  "results": [
    {"name":"sitemap","status":200,"expect":200,"worker1101Text":false},
    {"name":"news-sitemap","status":200,"expect":200,"worker1101Text":false},
    {"name":"team","status":200,"expect":200,"canonical":true,"hreflangCount":5,"title":true,"description":true,"jsonLdCount":2,"jsonLdParseOk":true,"worker1101Text":false},
    {"name":"match","status":200,"expect":200,"canonical":true,"hreflangCount":5,"title":true,"description":true,"jsonLdCount":2,"jsonLdParseOk":true,"worker1101Text":false},
    {"name":"article","status":200,"expect":200,"canonical":true,"hreflangCount":5,"title":true,"description":true,"jsonLdCount":2,"jsonLdParseOk":true,"worker1101Text":false},
    {"name":"missing-team","status":404,"expect":404,"worker1101Text":false},
    {"name":"missing-match","status":404,"expect":404,"worker1101Text":false},
    {"name":"missing-article","status":404,"expect":404,"worker1101Text":false}
  ]
}
```
Verdict vs acceptance: Pass. Invalid and malicious callback inputs redirect to the localized login error page without an external redirect. Fresh signup verification tokens redirect to `/id/akun`, set the Supabase auth cookie, and set `email_confirmed_at` / `last_sign_in_at`. Chrome followed a real callback URL to `https://skorly.cc/id/akun` with no 500/1101/runtime error text and no console errors. The controlled `wrangler tail --status error` window produced 0 bytes / 0 JSON error events during a fresh successful callback. SEO smoke had `failures=[]`. `@skorly/predict-model` has no `test` script, so no test pass is claimed for that package.
Linked finding: P0-2

### E-42 Final main deploy P0-2 auth callback production recheck
Matrix row: SEO/API endpoint `/auth/callback`; User Flow Matrix / Email confirmation
Env: prod
Time (UTC): 2026-06-04T10:14:37.780Z
Method: After PR #18 merge, fast-forwarded the clean `main` deploy worktree to merge commit `0d8b1a52c595a8add18cf191c53e9079e01b42fb`, deployed with OpenNext/Cloudflare, then reran production HTTP callback checks, Chrome real callback navigation, Supabase admin user-state check, `wrangler tail --status error`, and SEO smoke.
Raw output:
```text
Main deploy worktree:
git -C '/Users/johnmacmini/workspace/Football site-deploy' pull --ff-only
Updating c6b97f2..0d8b1a5
Fast-forward
0d8b1a52c595a8add18cf191c53e9079e01b42fb

Final main deploy:
set -a; source '/Users/johnmacmini/workspace/Football site/.env'; set +a; pnpm --filter @skorly/web cf:deploy
Compiled successfully in 7.4s
Generating static pages using 3 workers (1922/1922) in 3.5min
Uploaded skorly-web (109.42 sec)
Deployed skorly-web triggers (6.29 sec)
Current Version ID: 0e809ff5-6a5d-4cb6-8d21-d5cf3cdde655
Exit status: 0

Final production HTTP callback checks:
{
  "timestampUtc": "2026-06-04T10:13:22.475Z",
  "invalid": [
    {"name":"missing","status":307,"location":"https://skorly.cc/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0},
    {"name":"fake-code","status":307,"location":"https://skorly.cc/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0},
    {"name":"bad-next","status":307,"location":"https://skorly.cc/id/masuk?error=auth","cacheControl":"private, no-cache, no-store, must-revalidate, max-age=0","bodyLength":0}
  ],
  "real": {
    "status": 307,
    "location": "https://skorly.cc/id/akun",
    "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0",
    "bodyLength": 0,
    "setCookieCount": 1,
    "cookieNames": ["sb-majrlaxktengachwrskk-auth-token"],
    "emailConfirmedAtExists": true,
    "lastSignInAtExists": true
  }
}

Final Chrome real callback:
{
  "timestampUtc": "2026-06-04T10:13:50.788Z",
  "finalUrl": "https://skorly.cc/id/akun",
  "title": "Akun saya | Skorly",
  "workerOrErrorTextCount": 0,
  "consoleErrorCount": 0,
  "consoleErrors": []
}

Final Supabase user state after Chrome callback:
{
  "timestampUtc": "2026-06-04T10:14:03.611Z",
  "idExists": true,
  "emailConfirmedAtExists": true,
  "lastSignInAtExists": true
}

Final wrangler tail window:
NODE_OPTIONS="<DNS override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error
<no output before Ctrl-C during 2026-06-04T10:13:22Z through 2026-06-04T10:14:03Z callback verification window>

Final production SEO smoke:
{
  "timestampUtc": "2026-06-04T10:14:37.780Z",
  "articleUrl": "https://skorly.cc/id/artikel/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-",
  "failures": [],
  "results": [
    {"name":"sitemap","status":200,"expect":200,"worker1101Text":false},
    {"name":"news-sitemap","status":200,"expect":200,"worker1101Text":false},
    {"name":"team","status":200,"expect":200,"canonical":true,"hreflangCount":5,"title":true,"description":true,"jsonLdCount":2,"jsonLdParseOk":true,"worker1101Text":false},
    {"name":"match","status":200,"expect":200,"canonical":true,"hreflangCount":5,"title":true,"description":true,"jsonLdCount":2,"jsonLdParseOk":true,"worker1101Text":false},
    {"name":"article","status":200,"expect":200,"canonical":true,"hreflangCount":5,"title":true,"description":true,"jsonLdCount":2,"jsonLdParseOk":true,"worker1101Text":false},
    {"name":"missing-team","status":404,"expect":404,"worker1101Text":false},
    {"name":"missing-match","status":404,"expect":404,"worker1101Text":false},
    {"name":"missing-article","status":404,"expect":404,"worker1101Text":false}
  ]
}
```
Verdict vs acceptance: Pass. Final main commit `0d8b1a52c595a8add18cf191c53e9079e01b42fb` was deployed as Worker version `0e809ff5-6a5d-4cb6-8d21-d5cf3cdde655`. Invalid callback inputs redirect to the localized login error page. A fresh signup verification token redirects to `/id/akun`, sets the Supabase auth cookie, and confirms the user. Chrome followed a real callback URL to `https://skorly.cc/id/akun` with no 500/1101/runtime error text and no console errors. The error-tail window emitted no output during the final callback verification window. SEO smoke had `failures=[]`.
Linked finding: P0-2

### E-44 Logged-in auth pages and logout/session refresh
Matrix row: User Flow Matrix / Logout; User Flow Matrix / Logged-in auth pages; API, Security, Privacy Matrix / Auth session refresh; Interactive Inventory Matrix / `auth/sign-out-button.tsx`
Env: prod
Time (UTC): 2026-06-04T11:40:16.418Z
Method: Playwright-driven Chrome with a temporary profile. Created a fresh Supabase signup verification token, followed production `/auth/callback` to establish a session, opened logged-in auth pages, clicked the production sign-out button, revisited protected `/id/akun`, and ran DNS-overridden `wrangler tail --status error --ip self` during the browser window.
Raw output:
```text
wrangler tail command:
NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self
Successfully created tail, expires at 2026-06-04T12:21:53Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>

Playwright-driven Chrome output:
{
  "timestampUtc": "2026-06-04T11:40:16.418Z",
  "browserName": "chrome",
  "email": "codex-auth-session-1780573152345@example.com",
  "generated": {
    "userIdExists": true,
    "hashedTokenLength": 56,
    "verificationType": "signup"
  },
  "logoutClicked": true,
  "events": [
    {
      "label": "after-callback-account",
      "url": "https://skorly.cc/id/akun",
      "title": "Akun saya | Skorly",
      "h1": "Akun saya",
      "bodyHasLoginForm": false,
      "bodyHasAccountText": true,
      "bodyHasLogout": true,
      "bodyHasRuntimeError": false
    },
    {
      "label": "logged-in-open-login",
      "url": "https://skorly.cc/id/akun",
      "title": "Akun saya | Skorly",
      "h1": "Akun saya",
      "bodyHasLoginForm": false,
      "bodyHasAccountText": true,
      "bodyHasLogout": true,
      "bodyHasRuntimeError": false
    },
    {
      "label": "logged-in-open-register",
      "url": "https://skorly.cc/id/akun",
      "title": "Akun saya | Skorly",
      "h1": "Akun saya",
      "bodyHasLoginForm": false,
      "bodyHasAccountText": true,
      "bodyHasLogout": true,
      "bodyHasRuntimeError": false
    },
    {
      "label": "after-logout-click",
      "url": "https://skorly.cc/id",
      "title": "Piala Dunia 2026: Jadwal & Prediksi",
      "h1": "Piala Dunia 2026",
      "bodyHasLoginForm": false,
      "bodyHasAccountText": true,
      "bodyHasLogout": false,
      "bodyHasRuntimeError": false
    },
    {
      "label": "logged-out-open-account",
      "url": "https://skorly.cc/id/masuk",
      "title": "Selamat datang kembali | Skorly",
      "h1": "Selamat datang kembali",
      "bodyHasLoginForm": true,
      "bodyHasAccountText": false,
      "bodyHasLogout": false,
      "bodyHasRuntimeError": false
    }
  ],
  "cookiesAfterLogout": {
    "count": 2,
    "authCookieCount": 0,
    "authCookieNames": []
  },
  "consoleErrors": [
    "%c%d font-size:0;color:transparent NaN",
    "%c%d font-size:0;color:transparent NaN",
    "Failed to load resource: the server responded with a status of 401 ()"
  ]
}
```
Verdict vs acceptance: Pass for the listed matrix rows. A logged-in user opening `/id/masuk` and `/id/daftar` was redirected to `/id/akun` with no login/register form shown. The sign-out button was clicked, the browser landed on `/id`, and auth cookies matching `auth-token|supabase|sb-` were absent after logout. A logged-out revisit to protected `/id/akun` landed on `/id/masuk` with the login form visible. No 1101/500/runtime error text was visible, and `wrangler tail --status error` emitted no error event lines. The console entries are recorded here but this evidence is not used to clear the separate console-error/global UI matrix rows.
Linked finding: none

### E-45 Account profile update production form
Matrix row: Interactive Inventory Matrix / `auth/account-form.tsx`; User Flow Matrix / Account update
Env: prod
Time (UTC): 2026-06-04T12:57:32Z
Method: DNS-overridden `wrangler tail --status error --ip self` plus Playwright-driven Chrome with a temporary profile. Created a fresh Supabase signup verification token, followed production `/auth/callback` to establish a session, edited the account form, submitted it, reloaded `/id/akun`, and checked the `profiles` row plus Supabase auth user metadata via service-role admin. Token values and secrets were not printed.
Raw output:
```text
wrangler tail command:
NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self
Successfully created tail, expires at 2026-06-04T18:52:06Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>

Playwright-driven Chrome output:
{
  "testUser": {
    "email": "codex-account-update-1780577732553@example.com",
    "userIdPrefix": "6d823086",
    "verificationType": "signup",
    "tokenHashLength": 56
  },
  "before": {
    "finalUrl": "https://skorly.cc/id/akun",
    "title": "Akun saya | Skorly",
    "h1": "Akun saya",
    "displayNameValue": "Codex account 732553",
    "whatsappValue": "",
    "consentChecked": false
  },
  "accountUpdate": {
    "successTextVisible": true,
    "selectedTeam": {
      "value": "36",
      "text": "Algeria"
    },
    "afterReload": {
      "finalUrl": "https://skorly.cc/id/akun",
      "title": "Akun saya | Skorly",
      "h1": "Akun saya",
      "displayNameValue": "Codex saved 732553",
      "whatsappValue": "+628577732553",
      "favoriteTeamValue": "36",
      "consentChecked": true
    },
    "databaseProfile": {
      "email": "codex-account-update-1780577732553@example.com",
      "display_name": "Codex saved 732553",
      "whatsapp_number": "+628577732553",
      "favorite_team_id": 36,
      "consent_marketing": true
    },
    "authUserDisplayName": "Codex saved 732553"
  },
  "authCookies": [
    {
      "name": "sb-majrlaxktengachwrskk-auth-token",
      "domain": "skorly.cc",
      "path": "/",
      "httpOnly": false,
      "secure": false,
      "sameSite": "Lax",
      "expires": 1815137746.584755
    }
  ],
  "bodyHasRuntimeError": false,
  "consoleErrors": [],
  "pageErrors": []
}
```
Verdict vs acceptance: Pass for account update. The account form submitted successfully, displayed `Profil kamu sudah disimpan.`, and after reload `/id/akun` still showed display name `Codex saved 732553`, WhatsApp `+628577732553`, favorite team id `36`, and marketing consent checked. The database `profiles` row matched those values, Supabase auth user metadata contained the updated display name, Chrome had no console/page errors, and the Worker error tail emitted no error event lines. Cookie attributes observed during this flow are not cleared by this evidence; they are evaluated separately in E-46.
Linked finding: none

### E-46 Supabase auth cookie missing HttpOnly and Secure flags
Matrix row: API, Security, And Privacy Matrix / Session cookie attributes
Env: prod
Time (UTC): 2026-06-04T12:57:32Z
Method: Used the E-45 Playwright-driven Chrome account session to capture production auth cookie attributes, then generated a second fresh Supabase signup verification token and fetched production `/auth/callback` with redirects disabled to summarize the raw `Set-Cookie` attributes without printing token values.
Raw output:
```text
Playwright cookie attributes from E-45:
[
  {
    "name": "sb-majrlaxktengachwrskk-auth-token",
    "domain": "skorly.cc",
    "path": "/",
    "httpOnly": false,
    "secure": false,
    "sameSite": "Lax",
    "expires": 1815137746.584755
  }
]

Direct production callback Set-Cookie summary:
{
  "email": "codex-cookie-attrs-1780577788739@example.com",
  "status": 307,
  "location": "https://skorly.cc/id/akun",
  "cookieCount": 1,
  "cookies": [
    {
      "name": "sb-majrlaxktengachwrskk-auth-token",
      "hasHttpOnly": false,
      "hasSecure": false,
      "sameSite": "SameSite=lax",
      "maxAge": "Max-Age=34560000",
      "attrNames": [
        "expires",
        "max-age",
        "path",
        "samesite"
      ]
    }
  ]
}
```
Verdict vs acceptance: Fail. The matrix acceptance requires auth cookies to have `HttpOnly`, `Secure`, and `SameSite` set correctly in production. The production auth cookie has `SameSite=lax`, but both independent checks show `HttpOnly=false` and `Secure=false` / `hasHttpOnly=false` and `hasSecure=false`.
Linked finding: P1-2

### E-47 P1-2 auth cookie hardening fix and production verification
Matrix row: API, Security, And Privacy Matrix / Session cookie attributes
Env: local + prod
Time (UTC): 2026-06-04T13:45:06Z
Method: Implemented hardened Supabase SSR cookie options at all server write boundaries, replaced the header client-side Supabase session read with a server-mediated `/api/auth/session` route, ran local gates, deployed to Cloudflare, generated fresh Supabase signup verification tokens, fetched production `/auth/callback` with redirects disabled, supplied the returned cookie to production session/account requests, ran production SEO smoke samples, and monitored Worker errors with `wrangler tail --status error`.
Raw output:
```text
Source inventory:
rg -n "auth\.get(User|Session)|onAuthStateChange|getSession\(|createSupabaseBrowserClient\(|document\.cookie|cookies\.set\(|response\.cookies\.set\(|setAll\(" apps/web
apps/web/middleware.ts:59:        setAll(cookiesToSet, headers) {
apps/web/middleware.ts:61:            response.cookies.set(name, value, withSupabaseAuthCookieOptions(options));
apps/web/middleware.ts:76:    await supabase.auth.getUser();
apps/web/lib/supabase/client.ts:4:export function createSupabaseBrowserClient() {
apps/web/lib/supabase/server.ts:21:        setAll(cookiesToSet) {
apps/web/lib/supabase/server.ts:43:    const { data, error } = await supabase.auth.getUser();
apps/web/components/auth/oauth-buttons.tsx:16:    const supabase = createSupabaseBrowserClient();
apps/web/app/auth/callback/route.ts:28:        setAll(cookiesToSet, headers) {
apps/web/app/auth/callback/route.ts:30:            successResponse.cookies.set(name, value, withSupabaseAuthCookieOptions(options));

@supabase/ssr local package evidence:
node_modules/.pnpm/@supabase+ssr@0.10.3_@supabase+supabase-js@2.106.2/node_modules/@supabase/ssr/src/utils/constants.ts:
DEFAULT_COOKIE_OPTIONS = { path: "/", sameSite: "lax", httpOnly: false, maxAge: 400 * 24 * 60 * 60 }

git diff --check
<no output>

pnpm --filter @skorly/web lint
> @skorly/web@0.1.0 lint /Users/johnmacmini/workspace/Football site/apps/web
> eslint .

pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site/apps/web
> tsc --noEmit

pnpm lint
> skorly@0.1.0 lint /Users/johnmacmini/workspace/Football site
> pnpm -r lint
Scope: 9 of 10 workspace projects
apps/web lint$ eslint .
apps/web lint: Done

pnpm typecheck
> skorly@0.1.0 typecheck /Users/johnmacmini/workspace/Football site
> pnpm -r typecheck
Scope: 9 of 10 workspace projects
packages/predict-model typecheck$ tsc --noEmit
packages/types typecheck$ tsc --noEmit
packages/ui typecheck$ tsc --noEmit
packages/types typecheck: Done
packages/predict-model typecheck: Done
packages/ui typecheck: Done
packages/db typecheck$ tsc --noEmit
packages/ai-content typecheck$ tsc --noEmit
packages/api-football typecheck$ tsc --noEmit
packages/api-football typecheck: Done
packages/ai-content typecheck: Done
packages/db typecheck: Done
apps/web typecheck$ tsc --noEmit
packages/news typecheck$ tsc --noEmit
packages/news typecheck: Done
apps/web typecheck: Done
apps/jobs typecheck$ tsc --noEmit
apps/jobs typecheck: Done

pnpm --filter @skorly/api-football test
> @skorly/api-football@0.1.0 test /Users/johnmacmini/workspace/Football site/packages/api-football
> vitest run
RUN  v3.2.4 /Users/johnmacmini/workspace/Football site/packages/api-football
✓ src/client.test.ts (2 tests) 4ms
Test Files  1 passed (1)
Tests  2 passed (2)

pnpm --dir packages/predict-model run test
ERR_PNPM_NO_SCRIPT Missing script: test
Command "test" not found.

pnpm build
✓ Generating static pages using 3 workers (1923/1923) in 4.0min
Route table included:
├ ƒ /api/auth/session
├ ƒ /auth/callback
└ ○ /sitemap.xml

Post-build route count checks:
find apps/web/.next/server/app -name '*.html' | wc -l
1584
find apps/web/.next/server/app -path '*/artikel/*' -name '*.html' | wc -l
1010
find apps/web/.next/server/app -path '*/pertandingan/*' -name '*.html' | wc -l
288
find apps/web/.next/server/app -path '*/cerita/*' -name '*.body' | wc -l
288
find apps/web/.next/server/app -path '*/tim/*' -name '*.html' | wc -l
192
find apps/web/.next/server/app -path '*api/auth/session*' -maxdepth 8 -type f | sed -n '1,40p'
apps/web/.next/server/app/api/auth/session/route.js
apps/web/.next/server/app/api/auth/session/route_client-reference-manifest.js
apps/web/.next/server/app/api/auth/session/route.js.map
apps/web/.next/server/app/api/auth/session/route/build-manifest.json
apps/web/.next/server/app/api/auth/session/route/app-paths-manifest.json
apps/web/.next/server/app/api/auth/session/route/server-reference-manifest.json
apps/web/.next/server/app/api/auth/session/route.js.nft.json

Local production callback verification:
{
  "environment": "local next start http://localhost:3100",
  "utc": "2026-06-04T13:26:15.912Z",
  "generated": {
    "emailPrefix": "codex-cookie-local-1780579566624-9285af",
    "tokenHashLength": 56,
    "verificationType": "signup"
  },
  "callback": {
    "status": 307,
    "location": "http://localhost:3100/id/akun",
    "setCookieCount": 1,
    "authSetCookieCount": 1,
    "authCookie": {
      "name": "sb-majrlaxktengachwrskk-auth-token",
      "hasHttpOnly": true,
      "hasSecure": true,
      "sameSite": "SameSite=lax",
      "hasMaxAge": true,
      "hasExpires": true,
      "attrNames": ["expires", "httponly", "max-age", "path", "samesite", "secure"]
    }
  },
  "sessionApi": {
    "status": 200,
    "body": { "authenticated": true },
    "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0"
  },
  "accountWithCookie": {
    "status": 200,
    "location": null
  }
}

Cloudflare deploy:
pnpm --filter @skorly/web cf:deploy
✓ Generating static pages using 3 workers (1923/1923) in 4.1min
Uploaded 1590 files (449 already uploaded) (85.81 sec)
Deployed skorly-web triggers (6.08 sec)
  skorly.cc (custom domain)
  www.skorly.cc (custom domain)
Current Version ID: b46ac47f-d2e9-41c4-85e2-c7900a3ed214

Production direct callback verification:
{
  "environment": "production direct https://skorly.cc",
  "utc": "2026-06-04T13:34:31.801Z",
  "generated": {
    "emailPrefix": "codex-cookie-prod-direct-1780580059680-7f4aed",
    "tokenHashLength": 56,
    "verificationType": "signup"
  },
  "callback": {
    "status": 307,
    "location": "https://skorly.cc/id/akun",
    "setCookieCount": 1,
    "authSetCookieCount": 1,
    "authCookie": {
      "name": "sb-majrlaxktengachwrskk-auth-token",
      "hasHttpOnly": true,
      "hasSecure": true,
      "sameSite": "SameSite=lax",
      "hasMaxAge": true,
      "hasExpires": true,
      "attrNames": ["expires", "httponly", "max-age", "path", "samesite", "secure"]
    }
  },
  "sessionApi": {
    "status": 200,
    "body": { "authenticated": true },
    "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0"
  },
  "accountWithCookie": {
    "status": 200,
    "location": null
  },
  "userState": {
    "emailConfirmedAtExists": true,
    "lastSignInAtExists": true
  }
}

Production SEO smoke:
{
  "utc": "2026-06-04T13:43:31.946Z",
  "sitemap": { "status": 200, "has1101": false, "has500Text": false },
  "newsSitemap": { "status": 200, "has1101": false, "has500Text": false },
  "team": {
    "status": 200,
    "checks": { "title": true, "metaDescription": true, "canonical": true, "hreflang": 5, "h1": 1, "jsonLd": { "count": 2, "parsed": 2 } },
    "has1101": false,
    "has500Text": false
  },
  "match": {
    "status": 200,
    "checks": { "title": true, "metaDescription": true, "canonical": true, "hreflang": 5, "h1": 1, "jsonLd": { "count": 2, "parsed": 2 } },
    "has1101": false,
    "has500Text": false
  },
  "article": {
    "status": 200,
    "checks": { "title": true, "metaDescription": true, "canonical": true, "hreflang": 5, "h1": 1, "jsonLd": { "count": 2, "parsed": 2 } },
    "has1101": false,
    "has500Text": false
  },
  "missingTeam": { "status": 404, "has1101": false, "has500Text": false },
  "missingMatch": { "status": 404, "has1101": false, "has500Text": false },
  "missingArticle": { "status": 404, "has1101": false, "has500Text": false }
}

Worker error tail:
zsh -lc 'set -a; source .env; set +a; ... pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error'
Window covered production direct callback and production SEO smoke between 2026-06-04T13:34:31Z and 2026-06-04T13:43:31Z.
Output:
<no JSON event lines>
```
Verdict vs acceptance: Pass for the original broken control. The production raw `Set-Cookie` reproducer from E-46 no longer reproduces missing `HttpOnly` or `Secure`; the fresh production auth cookie has `HttpOnly`, `Secure`, and `SameSite=lax`. The hardened cookie still authenticates server-mediated requests: `/api/auth/session` returned authenticated, `/id/akun` returned 200, and Supabase admin recorded confirmed email plus last sign-in. Public SEO samples returned expected 200/404 statuses with no 1101/500 text. Worker error tail emitted no error events during the production auth and SEO smoke window. Chrome cookie-store reinspection is separated in E-48 because the Chrome automation control layer could not navigate controlled tabs.
Linked finding: P1-2

### E-48 Chrome automation recheck blocked at navigation control layer
Matrix row: API, Security, And Privacy Matrix / Session cookie attributes
Env: prod Chrome automation
Time (UTC): 2026-06-04T13:45:06Z
Method: Used the Chrome skill through the Codex Chrome Extension. Created controlled Chrome tabs, attempted production callback navigation, attempted ordinary public page navigation to `https://skorly.cc/id`, attempted address-bar keyboard navigation, and ran the Chrome plugin diagnostic scripts.
Raw output:
```text
Chrome bootstrap:
{
  "ok": true,
  "tabId": "1378036564",
  "tabs": 3
}

Fresh token generation for Chrome attempt:
{
  "ok": true,
  "emailPrefix": "codex-cookie-prod-chrome-1780580366770-301a64",
  "tokenHashLength": 56,
  "verificationType": "signup"
}

Production callback via tab.goto:
js execution timed out; kernel reset, rerun your request

Production callback via window.location.assign:
TypeError: window.location.assign is not a function

Bounded tab.goto(callbackUrl):
{
  "gotoOutcome": "goto-timeout-20s",
  "url": "about:blank",
  "title": "about:blank",
  "bodyStart": "",
  "sessionApiError": "Error: TypeError: fetch is not a function...",
  "consoleErrors": []
}

Plain public URL navigation control check:
{
  "startUrl": "about:blank",
  "gotoTimeoutMs": 15000,
  "finalUrl": "about:blank",
  "title": "about:blank",
  "bodyStart": ""
}

Address-bar keyboard navigation check:
{
  "startUrl": "about:blank",
  "afterUrl": "about:blank",
  "title": "about:blank",
  "bodyStart": ""
}

Chrome diagnostics:
{
  "chromeIsRunning": "Google Chrome running: yes",
  "installedBrowsers": {
    "installed_browsers": [
      {
        "name": "Google Chrome",
        "path": "/Applications/Google Chrome.app",
        "version": "149.0.7827.53"
      }
    ]
  },
  "extension": {
    "installed": true,
    "enabled": true,
    "selectedProfileDirectory": "Default",
    "exitCode": 0
  },
  "nativeHost": {
    "exists": true,
    "nameMatches": true,
    "hasExpectedOrigin": true,
    "correct": true,
    "problem": null
  }
}
```
Verdict vs acceptance: Blocked for Chrome automation only. The Chrome plugin connected and diagnostics passed, but controlled tabs did not navigate away from `about:blank`, including a plain public `https://skorly.cc/id` check. No Chrome cookie-store attribute result is claimed from this evidence. E-47 contains the pass evidence for the production raw `Set-Cookie` reproducer, source inventory, server-mediated session route, deploy, SEO smoke, and Worker error tail.
Linked finding: P1-2

### E-49 Independent P1-2 auth cookie and auth-flow recheck
Matrix row: API, Security, And Privacy Matrix / Session cookie attributes
Env: prod
Time (UTC): 2026-06-04T23:55:50.591Z
Method: Review-session independent verification after PR #20 and PR #21 were on `origin/main`. Checked source cookie hardening, latest Worker deployment list, ran DNS-overridden `wrangler tail --status error --ip self`, generated fresh Supabase signup verification tokens with token values redacted, hit production `/auth/callback` directly with redirects disabled, followed a second real callback in Playwright-driven Google Chrome, inspected Chrome cookie-store attributes, called `/api/auth/session` from the page, verified header auth state, submitted the account form, reloaded persisted profile state, clicked logout, and revisited protected `/id/akun`.
Raw output:
```text
Source/deploy baseline:
git log -3 --oneline --decorate HEAD
f0e1ce2 (HEAD -> main, origin/main, origin/HEAD) Merge pull request #21 from john-hoe/codex/fix-opennext-cache-build-id
3705967 (origin/codex/fix-opennext-cache-build-id, codex/fix-opennext-cache-build-id) fix OpenNext build cache key
92587a2 Merge pull request #20 from john-hoe/codex/p1-auth-cookie-flags

apps/web/lib/supabase/cookies.ts:
sameSite: "lax"
httpOnly: true
secure: process.env.NODE_ENV !== "development"

wrangler deployments list latest entries:
2026-06-04T13:33:24.316Z b46ac47f-d2e9-41c4-85e2-c7900a3ed214
2026-06-04T13:57:07.273Z 32f0524f-657a-449e-83ba-fc29a2d1d733
2026-06-04T13:58:15.648Z f7c42c2c-871d-4e7a-8848-b2a028fc70f0
2026-06-04T14:07:29.513Z 11d93c93-1082-421d-a989-fc412f87bf04

wrangler tail command:
NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self
Successfully created tail, expires at 2026-06-05T05:54:08Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>

Independent production verification:
{
  "timestampUtc": "2026-06-04T23:55:50.591Z",
  "directCallback": {
    "emailPrefix": "codex-p1-cookie-independent-1780617307883",
    "status": 307,
    "location": "https://skorly.cc/id/akun",
    "authCookieCount": 1,
    "authCookies": [
      {
        "name": "sb-majrlaxktengachwrskk-auth-token",
        "hasHttpOnly": true,
        "hasSecure": true,
        "sameSite": "SameSite=lax",
        "maxAge": "Max-Age=34560000",
        "attrNames": ["expires", "httponly", "max-age", "path", "samesite", "secure"]
      }
    ],
    "sessionApi": {
      "status": 200,
      "body": { "authenticated": true },
      "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0"
    },
    "userState": {
      "emailConfirmedAtExists": true,
      "lastSignInAtExists": true
    }
  },
  "chromeCallback": {
    "emailPrefix": "codex-p1-cookie-browser-1780617307883",
    "browserName": "chrome",
    "callbackPage": {
      "finalUrl": "https://skorly.cc/id/akun",
      "title": "Akun saya | Skorly",
      "h1": "Akun saya",
      "bodyHasRuntimeError": false
    },
    "browserCookies": [
      {
        "name": "sb-majrlaxktengachwrskk-auth-token",
        "domain": "skorly.cc",
        "path": "/",
        "httpOnly": true,
        "secure": true,
        "sameSite": "Lax",
        "expires": 1815177321.75992
      }
    ],
    "sessionFromPage": {
      "status": 200,
      "body": { "authenticated": true },
      "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0"
    },
    "homeHeaderState": {
      "finalUrl": "https://skorly.cc/id",
      "accountLinks": 1,
      "loginLinks": 0,
      "bodyHasRuntimeError": false
    },
    "accountUpdate": {
      "accountUpdateSuccess": true,
      "accountAfterReload": {
        "displayNameValue": "Cookie fixed 307883",
        "whatsappValue": "+628617307883",
        "consentChecked": true
      },
      "databaseProfile": {
        "display_name": "Cookie fixed 307883",
        "whatsapp_number": "+628617307883",
        "consent_marketing": true
      }
    },
    "postLogout": {
      "finalUrl": "https://skorly.cc/id/masuk",
      "loginFormVisible": true,
      "authCookieCount": 0
    },
    "userState": {
      "emailConfirmedAtExists": true,
      "lastSignInAtExists": true
    },
    "bodyHasRuntimeError": false,
    "consoleErrors": [],
    "pageErrors": []
  }
}
```
Verdict vs acceptance: Pass. The original E-46 failure no longer reproduces in direct production HTTP or Chrome cookie-store inspection: the Supabase auth cookie has `HttpOnly=true`, `Secure=true`, and `SameSite=lax`. Authenticated flows still work with the hardened cookie: `/api/auth/session` returned authenticated, `/id/akun` rendered, the header showed one account link and zero login links, account update persisted after reload and in the database, logout cleared the auth cookie, and logged-out `/id/akun` redirected to `/id/masuk`. The browser run had no console/page errors and no visible 1101/500/runtime error text. `wrangler tail --status error` emitted no error event lines during the verification window.
Linked finding: P1-2

### E-50 Password reset form and OAuth gate production check
Matrix row: Interactive Inventory Matrix / `auth/reset-form.tsx`; Interactive Inventory Matrix / `auth/oauth-buttons.tsx`; User Flow Matrix / OAuth login; API, Security, And Privacy Matrix / OAuth provider config
Env: prod
Time (UTC): 2026-06-05T00:02:35.089Z
Method: DNS-overridden `wrangler tail --status error --ip self` plus Playwright-driven Google Chrome. Created a confirmed Supabase auth user, generated a fresh recovery token with `redirectTo=https://skorly.cc/auth/callback?next=/id/atur-ulang-sandi`, followed the production callback to the reset page, submitted the reset form with a new password, verified page redirect/session state, verified old/new password behavior via Supabase anon sign-in, then opened logged-out `/id/masuk` and `/id/daftar` to verify OAuth gate-off behavior. Token values and auth secrets were not printed.
Raw output:
```text
wrangler tail command:
NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self
Successfully created tail, expires at 2026-06-05T05:54:08Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>

Playwright-driven Chrome and Supabase output:
{
  "timestampUtc": "2026-06-05T00:02:35.089Z",
  "passwordReset": {
    "emailPrefix": "codex-reset-flow-1780617720419",
    "userIdPrefix": "3200a48a",
    "generated": {
      "tokenHashLength": 56,
      "verificationType": "recovery"
    },
    "resetPageBefore": {
      "url": "https://skorly.cc/id/atur-ulang-sandi",
      "title": "Buat kata sandi baru | Skorly",
      "h1": "Buat kata sandi baru",
      "passwordInputCount": 1,
      "bodyHasRuntimeError": false
    },
    "cookiesBeforeReset": [
      {
        "name": "sb-majrlaxktengachwrskk-auth-token",
        "httpOnly": true,
        "secure": true,
        "sameSite": "Lax"
      }
    ],
    "successTextVisible": true,
    "accountAfterReset": {
      "url": "https://skorly.cc/id/akun",
      "title": "Akun saya | Skorly",
      "h1": "Akun saya",
      "bodyHasRuntimeError": false
    },
    "sessionFromPage": {
      "status": 200,
      "body": { "authenticated": true },
      "cacheControl": "private, no-cache, no-store, must-revalidate, max-age=0"
    },
    "passwordSignIn": {
      "oldPasswordError": "Invalid login credentials",
      "oldPasswordSession": false,
      "newPasswordError": null,
      "newPasswordSession": true
    },
    "userState": {
      "emailConfirmedAtExists": true,
      "lastSignInAtExists": true
    }
  },
  "oauthGate": {
    "env": {
      "NEXT_PUBLIC_ENABLE_OAUTH_root": null,
      "hasGoogleClientPublic": false,
      "hasFacebookClientPublic": false
    },
    "loginGate": {
      "label": "login-page",
      "url": "https://skorly.cc/id/masuk",
      "title": "Selamat datang kembali | Skorly",
      "h1": "Selamat datang kembali",
      "hasGoogleText": false,
      "hasFacebookText": false,
      "googleButtonCount": 0,
      "facebookButtonCount": 0,
      "passwordInputCount": 1,
      "bodyHasRuntimeError": false,
      "buttonTexts": ["🔔", "ID", "VI", "EN", "中文", "🔔", "ID", "VI", "EN", "中文", "Masuk"]
    },
    "registerGate": {
      "label": "register-page",
      "url": "https://skorly.cc/id/daftar",
      "title": "Buat akun kamu | Skorly",
      "h1": "Buat akun kamu",
      "hasGoogleText": false,
      "hasFacebookText": false,
      "googleButtonCount": 0,
      "facebookButtonCount": 0,
      "passwordInputCount": 1,
      "bodyHasRuntimeError": false,
      "buttonTexts": ["🔔", "ID", "VI", "EN", "中文", "🔔", "ID", "VI", "EN", "中文", "Daftar"]
    },
    "consoleErrors": []
  },
  "chromeConsoleErrors": [],
  "pageErrors": []
}
```
Verdict vs acceptance: Pass for the listed matrix rows. The production recovery callback opened `/id/atur-ulang-sandi`, rendered the reset form, submitted `resetPasswordAction`, showed the localized success state, redirected to `/id/akun`, and left `/api/auth/session` authenticated. Supabase anon sign-in with the old password failed and sign-in with the new password succeeded, proving the reset changed the password. The OAuth gate is off in local public env inventory and production login/register pages showed no Google/Facebook text or buttons while keeping the normal password forms. `wrangler tail --status error` emitted no error event lines. This evidence does not clear the separate `auth/forgot-form.tsx` or User Flow / Forgot password rows because no production forgot-password form submission or real reset email delivery was verified here.
Linked finding: none

### E-51 Turnstile-gated auth forms blocked by current Chrome automation challenge
Matrix row: Interactive Inventory Matrix / `auth/register-form.tsx`; Interactive Inventory Matrix / `auth/login-form.tsx`; Interactive Inventory Matrix / `auth/forgot-form.tsx`; Interactive Inventory Matrix / `auth/turnstile.tsx`; User Flow Matrix / Register; User Flow Matrix / Login; User Flow Matrix / Forgot password
Env: prod Chrome automation
Time (UTC): 2026-06-05T00:09:30Z
Method: DNS-overridden `wrangler tail --status error --ip self` plus Playwright-driven Google Chrome. Opened the homepage subscribe form, login page, register page, and forgot-password page in the same Chrome environment. Waited up to 45 seconds per page for `input[name="cf-turnstile-response"]` to receive a token. Then ran a focused homepage network diagnostic for Cloudflare Turnstile responses. No auth form was submitted because no valid Turnstile token was produced.
Raw output:
```text
wrangler tail command:
NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self
Successfully created tail, expires at 2026-06-05T05:54:08Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>

Turnstile token wait result, one Chrome context:
{
  "timestampUtc": "2026-06-05T00:08:11.853Z",
  "results": [
    {
      "label": "home-subscribe",
      "url": "https://skorly.cc/id",
      "tokenResult": null,
      "inputValueLength": 0,
      "iframeCount": 0,
      "turnstileScriptPresent": true,
      "bodyHasRuntimeError": false
    },
    {
      "label": "login",
      "url": "https://skorly.cc/id/masuk",
      "tokenResult": null,
      "inputValueLength": 0,
      "iframeCount": 0,
      "turnstileScriptPresent": true,
      "bodyHasRuntimeError": false
    },
    {
      "label": "register",
      "url": "https://skorly.cc/id/daftar",
      "tokenResult": null,
      "inputValueLength": 0,
      "iframeCount": 0,
      "turnstileScriptPresent": true,
      "bodyHasRuntimeError": false
    },
    {
      "label": "forgot",
      "url": "https://skorly.cc/id/lupa-sandi",
      "tokenResult": null,
      "inputValueLength": 0,
      "iframeCount": 0,
      "turnstileScriptPresent": true,
      "bodyHasRuntimeError": false
    }
  ]
}

Focused homepage Turnstile network diagnostic:
{
  "timestampUtc": "2026-06-05T00:08:58.264Z",
  "data": {
    "inputLen": 0,
    "iframeCount": 0,
    "turnstileScriptCount": 1,
    "windowTurnstileType": "object",
    "cfTurnstileDivCount": 1
  },
  "events": [
    {"url":"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit","status":302},
    {"url":"https://challenges.cloudflare.com/turnstile/v0/g/8fc8ed1d8752/api.js","status":200},
    {"url":"https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/f/ov2/av0/rch/.../new/flexible?lang=auto","status":200},
    {"url":"https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/flow/...","status":200},
    {"url":"https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/pat/...","status":401}
  ],
  "consoleMessages": [
    "Request for the Private Access Token challenge.",
    "The next request for the Private Access Token challenge may return a 401 and show a warning in console.",
    "Failed to load resource: the server responded with a status of 401 ()"
  ]
}
```
Verdict vs acceptance: Needs external verification for the listed Turnstile-gated auth form submissions. The same automation environment failed to obtain a Turnstile token on both the homepage subscribe form and the auth forms: token length stayed 0, iframe count stayed 0, and the focused network diagnostic showed Cloudflare Turnstile scripts loaded but a Private Access Token challenge request returned 401. Because previous production evidence E-38 produced a real Turnstile token and successful subscribe submission in Chrome, this result is treated as an automation/challenge limitation, not as a product failure. Login, register, and forgot-password form submissions still require a real browser session that obtains a valid Turnstile token, plus real email/reset-link verification where applicable.
Linked finding: none

### E-52 Footer, legal pages, and client bundle secret scan
Matrix row: Interactive Inventory Matrix / `site-footer.tsx`; UX Matrix / Footer; API, Security, And Privacy Matrix / Legal pages; API, Security, And Privacy Matrix / Client bundle secrets
Env: prod
Time (UTC): 2026-06-05T01:56:10.054Z
Method: DNS-overridden `wrangler tail --status error --ip self`, production HTTP fetches, Playwright-driven Google Chrome footer inspection across `id`, `en`, `vi`, and `zh`, and production JS bundle scan. The bundle scan fetched 10 production `/_next/static` script URLs from `https://skorly.cc/id`, searched for exact private secret values from local env without printing those values, and searched for private secret variable names.
Raw output:
```text
wrangler tail command:
NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self
Successfully created tail, expires at 2026-06-05T05:54:08Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>

Legal page HTTP status sample:
[
  {"url":"https://skorly.cc/id/privacy","status":200,"title":"Kebijakan Privasi | Skorly","h1Count":1,"bodyHas1101":false,"bodyHas500Text":false},
  {"url":"https://skorly.cc/id/terms","status":200,"title":"Syarat &amp; Ketentuan | Skorly","h1Count":1,"bodyHas1101":false,"bodyHas500Text":false},
  {"url":"https://skorly.cc/en/privacy","status":200,"title":"Privacy Policy | Skorly","h1Count":1,"bodyHas1101":false,"bodyHas500Text":false},
  {"url":"https://skorly.cc/en/terms","status":200,"title":"Terms of Service | Skorly","h1Count":1,"bodyHas1101":false,"bodyHas500Text":false},
  {"url":"https://skorly.cc/vi/privacy","status":200,"title":"Chính sách bảo mật | Skorly","h1Count":1,"bodyHas1101":false,"bodyHas500Text":false},
  {"url":"https://skorly.cc/vi/terms","status":200,"title":"Điều khoản dịch vụ | Skorly","h1Count":1,"bodyHas1101":false,"bodyHas500Text":false},
  {"url":"https://skorly.cc/zh/privacy","status":200,"title":"隐私政策 | Skorly","h1Count":1,"bodyHas1101":false,"bodyHas500Text":false},
  {"url":"https://skorly.cc/zh/terms","status":200,"title":"服务条款 | Skorly","h1Count":1,"bodyHas1101":false,"bodyHas500Text":false}
]

Footer link and layout sample:
[
  {
    "locale": "id",
    "footerVisible": true,
    "privacyHref": "https://skorly.cc/id/privacy",
    "termsHref": "https://skorly.cc/id/terms",
    "contactHref": "mailto:business@skorly.cc",
    "horizontalOverflowPx": 0,
    "bodyHasRuntimeError": false
  },
  {
    "locale": "en",
    "footerVisible": true,
    "privacyHref": "https://skorly.cc/en/privacy",
    "termsHref": "https://skorly.cc/en/terms",
    "contactHref": "mailto:business@skorly.cc",
    "horizontalOverflowPx": 0,
    "bodyHasRuntimeError": false
  },
  {
    "locale": "vi",
    "footerVisible": true,
    "privacyHref": "https://skorly.cc/vi/privacy",
    "termsHref": "https://skorly.cc/vi/terms",
    "contactHref": "mailto:business@skorly.cc",
    "horizontalOverflowPx": 0,
    "bodyHasRuntimeError": false
  },
  {
    "locale": "zh",
    "footerVisible": true,
    "privacyHref": "https://skorly.cc/zh/privacy",
    "termsHref": "https://skorly.cc/zh/terms",
    "contactHref": "mailto:business@skorly.cc",
    "horizontalOverflowPx": 0,
    "bodyHasRuntimeError": false
  }
]

Client bundle secret scan:
{
  "scriptCount": 10,
  "fetchedCount": 10,
  "bytes": 717697,
  "secretValueHits": [],
  "secretNameHits": [],
  "publicSupabaseUrlPresent": false,
  "publicAnonKeyPresent": false
}

Chrome console errors:
[]
```
Verdict vs acceptance: Pass for the listed matrix rows. Footer legal/contact links were visible and locale-scoped on all four sampled home pages; privacy and terms pages returned 200 with one H1 and no 1101/500 text; footer horizontal overflow was 0px at 1365px viewport. The production client JS bundle scan found zero exact private secret value hits and zero private secret-name hits. `wrangler tail --status error` emitted no error event lines during the production window.
Linked finding: none

### E-53 Security response headers missing on production HTML responses
Matrix row: API, Security, And Privacy Matrix / Security response headers
Env: prod
Time (UTC): 2026-06-05T01:56:10.054Z
Method: DNS-overridden `wrangler tail --status error --ip self`; production HTTP fetches of four locale home pages, eight legal pages, and logged-out protected `/id/akun`; header summary captured `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`, and `Permissions-Policy`.
Raw output:
```text
wrangler tail command:
NODE_OPTIONS="--import=data:text/javascript,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format pretty --status error --ip self
Successfully created tail, expires at 2026-06-05T05:54:08Z
Connected to skorly-web, waiting for logs...
<no error event lines before ^C>

Security header summary:
[
  {"url":"https://skorly.cc/id","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/en","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/vi","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/zh","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/id/privacy","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/id/terms","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/en/privacy","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/en/terms","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/vi/privacy","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/vi/terms","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/zh/privacy","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/zh/terms","status":200,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null},
  {"url":"https://skorly.cc/id/akun","status":307,"hsts":null,"xFrameOptions":null,"xContentTypeOptions":null,"referrerPolicy":null,"csp":null,"permissionsPolicy":null}
]
```
Verdict vs acceptance: Fail. The matrix acceptance requires sensible production security headers and clickjacking protection. All 13 sampled HTML/redirect responses lacked `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`, and `Permissions-Policy`. `wrangler tail --status error` emitted no error event lines, so the issue is missing header policy rather than a runtime exception.
Linked finding: P1-3

### E-54 P1-3 production security response headers fixed
Matrix row: API, Security, And Privacy Matrix / Security response headers
Env: local production server + prod
Time (UTC): 2026-06-05T02:42:30Z
Method: Added route-wide security headers in `apps/web/next.config.ts`, ran local gates, built the app, checked local production responses, deployed commit `1c261ae` to Cloudflare Workers, reran the original E-53 production sample set plus one Web Story and both sitemap endpoints, and monitored `wrangler tail --status error` during the production sample window.
Raw output:
```text
Code change:
apps/web/next.config.ts
- `headers()` now applies:
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), midi=(), xr-spatial-tracking=(), browsing-topics=()
  Content-Security-Policy: includes default-src 'self', frame-ancestors 'self', Turnstile, Supabase REST/realtime, Google analytics/tag manager, AMP runtime, Twitter widgets, YouTube frames, worker-src 'self' blob:, and media/img allowances.

Local gates:
$ pnpm lint
apps/web lint: Done

$ pnpm typecheck
packages/predict-model typecheck: Done
packages/ui typecheck: Done
packages/types typecheck: Done
packages/api-football typecheck: Done
packages/ai-content typecheck: Done
packages/db typecheck: Done
packages/news typecheck: Done
apps/web typecheck: Done
apps/jobs typecheck: Done

$ pnpm --filter @skorly/api-football test
Test Files  1 passed (1)
Tests       2 passed (2)

$ pnpm --filter @skorly/predict-model test
<no output>

$ cat packages/predict-model/package.json
"scripts": {
  "typecheck": "tsc --noEmit"
}

$ git diff --check
<no output>

$ pnpm build
✓ Generating static pages using 3 workers (1923/1923) in 4.6min

Local header smoke against http://localhost:3100:
- Paths: /id, /en, /vi, /zh, /id/privacy, /id/terms, /en/privacy, /en/terms, /vi/privacy, /vi/terms, /zh/privacy, /zh/terms, /id/akun, /id/cerita/mexico-vs-south-africa-20260611, /sitemap.xml, /news-sitemap.xml
- Statuses: 15x 200, 1x 307 (/id/akun -> /id/masuk)
- allHeadersPresent=true for 16/16
- has1101Or500Body=false for 16/16
- Web Story sample: ampStory=true, canonical=true, hreflangCount=5, jsonLdCount=1

Local browser smoke:
- http://localhost:3100/id: h1Count=1, canonical=true, hreflangCount=5, jsonLdCount=1, turnstileScripts=1, applicationError=false, cspErrorCount=0
- http://localhost:3100/id/masuk: h1Count=1, jsonLdCount=1, turnstileScripts=1, applicationError=false, cspErrorCount=0
- http://localhost:3100/id/cerita/mexico-vs-south-africa-20260611: ampStory=true, ampRuntimeScripts=2, canonical=true, hreflangCount=5, jsonLdCount=1, applicationError=false, cspErrorCount=0

Deploy:
$ pnpm --filter @skorly/web cf:deploy
✓ Generating static pages using 3 workers (1923/1923) in 4.3min
Worker saved in `.open-next/worker.js` 🚀
OpenNext build complete.
Uploaded skorly-web (102.21 sec)
Deployed skorly-web triggers (4.29 sec)
  skorly.cc (custom domain)
  www.skorly.cc (custom domain)
Current Version ID: 15bffbce-fa5c-4914-8c9b-031d1d2b01fd

Production header smoke against https://skorly.cc:
- Paths: /id, /en, /vi, /zh, /id/privacy, /id/terms, /en/privacy, /en/terms, /vi/privacy, /vi/terms, /zh/privacy, /zh/terms, /id/akun, /id/cerita/mexico-vs-south-africa-20260611, /sitemap.xml, /news-sitemap.xml
- Statuses: 15x 200, 1x 307 (/id/akun -> /id/masuk)
- allHeadersPresent=true for 16/16
- has1101Or500Body=false for 16/16
- strict-transport-security=max-age=31536000; includeSubDomains; preload
- x-frame-options=SAMEORIGIN
- x-content-type-options=nosniff
- referrer-policy=strict-origin-when-cross-origin
- content-security-policy contains frame-ancestors 'self', https://challenges.cloudflare.com, and https://cdn.ampproject.org
- permissions-policy=camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), midi=(), xr-spatial-tracking=(), browsing-topics=()
- Web Story sample: status=200, ampStory=true, canonical=true, hreflangCount=5, jsonLdCount=1
- /sitemap.xml: status=200, contentType=application/xml
- /news-sitemap.xml: status=200, contentType=application/xml

wrangler tail:
$ pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error --ip self
Error: Client network socket disconnected before secure TLS connection was established
code: ECONNRESET
host: tail.developers.workers.dev

$ NODE_OPTIONS="--import=data:text/javascript;base64,<dns override for tail.developers.workers.dev to 104.21.5.179>" pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error --ip self
<no error event lines during the production sample window>
```
Verdict vs acceptance: Pass. The original E-53 production header failure no longer reproduces: all 13 original HTML/redirect samples and three extended smoke endpoints returned all six target headers. Expected statuses were preserved, `/id/akun` still redirected to `/id/masuk`, sitemap endpoints returned 200 XML, the Web Story sample retained AMP/story SEO signals, and the production error-tail window emitted 0 error event lines.
Linked finding: P1-3
