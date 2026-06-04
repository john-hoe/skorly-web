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
