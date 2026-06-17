# Skorly Site Review Findings - 2026-06-03

本文件只记录已验证问题，不做修复决策替代。修复 session 应按 P0 -> P1 -> P2 的顺序处理，并在每个修复后重新运行对应验证命令。

## Review Scope

- 前端站点：`apps/web`
- 核心公开页面：首页、比分、世界杯中心、赛程、球队、球队详情、新闻、归档、文章详情、排行榜、liga、prediksi、nonton、登录/注册/忘记密码、Web Stories
- API/SEO/PWA：`/og`、`/sitemap.xml`、`/news-sitemap.xml`、`/robots.txt`、`/manifest.webmanifest`、`/sw.js`、`/api/subscribe`
- 自动化检查：`pnpm typecheck`、`pnpm lint`、`pnpm build`、`pnpm --filter @skorly/api-football test`

## Severity Model

- P0：阻止生产构建、登录/注册闭环、核心发布能力。
- P1：用户关键路径可用但有明显稳定性、性能或 hydration 风险。
- P2：内容质量、局部 UI/UX、本地化、SEO 细节问题。

## P0 Findings

### P0-1 Production build fails during static generation

Actual:

```text
pnpm build
...
Failed to build /[locale]/piala-dunia-2026/page: /vi/piala-dunia-2026 after 3 attempts.
Export encountered an error on /[locale]/piala-dunia-2026/page: /vi/piala-dunia-2026, exiting the build.
Next.js build worker exited with code: 1
```

Evidence:

- Static generation total: `1870` pages.
- Build progressed to around `1636/1870`, then `/[locale]/piala-dunia-2026/page` exceeded `staticPageGenerationTimeout: 120` on all locales.
- The page itself only calls `getGroupNames()` and `getUpcomingFixtures(8)`, so the likely root cause is static generation worker/database connection pressure or stalled query scheduling rather than JSX complexity.

Relevant files:

- `apps/web/app/[locale]/piala-dunia-2026/page.tsx`
- `apps/web/next.config.ts`
- `packages/db/src/client.ts`
- `packages/db/src/queries.ts`

Reproduce:

```bash
set -a; source .env; set +a; pnpm build
```

Fix direction:

- First profile build-time database calls and identify which query stalls.
- Avoid repeated DB calls during SSG where possible: cache shared fixture/group data per build process, batch shared data, or reduce static generation surface.
- Consider moving some high-volume detail pages to ISR/dynamic rendering instead of pre-rendering all locales for all slugs.
- Revisit `experimental.cpus: 1` vs Supabase pool limits. Single worker reduces memory but makes one stalled page block the whole build.

Status 2026-06-03:

- Fixed.
- Changed `/[locale]/piala-dunia-2026` to dynamic rendering and added a 10s fallback around its hub DB reads, so stalled Supabase reads cannot fail static generation.
- During verification, the same static-generation timeout pattern appeared on `/[locale]/skor/page` for `/id/skor` and `/vi/skor`. Because scores are live data, changed `/[locale]/skor` to dynamic rendering and added a 10s fallback around live/results DB reads.

Verification 2026-06-03:

```text
pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site/apps/web
> tsc --noEmit

Exit status: 0

set -a; source .env; set +a; pnpm build
...
✓ Compiled successfully in 5.9s
Finished TypeScript in 2.2s ...
Generating static pages using 1 worker (1849/1870)
✓ Generating static pages using 1 worker (1870/1870) in 5.5min
...
├ ƒ /[locale]/piala-dunia-2026
├ ƒ /[locale]/skor

Exit status: 0
```

### P0-2 Root typecheck fails in jobs package

Actual:

```text
pnpm typecheck
apps/jobs typecheck: ../../packages/ai-content/src/llm-client.ts(...): error TS2591: Cannot find name 'process'.
apps/jobs typecheck: ../../packages/db/src/client.ts(20,15): error TS2591: Cannot find name 'process'.
```

Cause:

- `apps/jobs/tsconfig.json` uses only `types: ["@cloudflare/workers-types"]`.
- Jobs imports shared packages that reference `process.env`, so TypeScript has no Node `process` type in that compilation context.

Relevant files:

- `apps/jobs/tsconfig.json`
- `packages/ai-content/src/llm-client.ts`
- `packages/db/src/client.ts`

Reproduce:

```bash
pnpm typecheck
```

Fix direction:

- Add a safe ambient declaration for `process.env` in shared packages, or adjust jobs TS config/types so shared package env access typechecks without implying Node runtime APIs in Workers.
- Do not blindly add broad Node runtime assumptions to Worker code without checking Cloudflare compatibility.

Status 2026-06-03:

- Fixed.
- Added `apps/jobs/src/process-env.d.ts` with a narrow ambient `process.env` declaration for the jobs TypeScript program.
- Did not add broad Node types to the Worker compile context. This matches `apps/jobs/src/env.ts`, which hydrates `globalThis.process.env` from Worker env bindings at runtime.

Verification 2026-06-03:

```text
pnpm typecheck
> skorly@0.1.0 typecheck /Users/johnmacmini/workspace/Football site
> pnpm -r typecheck

...
apps/web typecheck: Done
apps/jobs typecheck$ tsc --noEmit
apps/jobs typecheck: Done

Exit status: 0
```

### P0-3 Email verification redirect can bypass `/auth/callback`

Actual reported link:

```text
https://majrlaxktengachwrskk.supabase.co/auth/v1/verify?...&type=signup&redirect_to=http://localhost:3000
```

Why this is broken:

- Supabase email verification must eventually land on the app callback route.
- The app callback route exchanges the PKCE `code` or verifies `token_hash/type` and writes Supabase session cookies.
- If Supabase redirects only to `http://localhost:3000`, the app does not run `/auth/callback`, so the user may be verified at Supabase level but not logged into Skorly.

Current defensive patch already added:

- `apps/web/middleware.ts` now redirects root auth landings to `/auth/callback`.
- Verified with fake values:

```text
http://localhost:3000/?code=fake-code
-> /auth/callback?code=fake-code&next=%2Fid%2Fakun

http://localhost:3000/id?token_hash=fake&type=signup
-> /auth/callback?token_hash=fake&type=signup&next=%2Fid%2Fakun
```

Still required in Supabase Dashboard:

- Site URL should be `https://skorly.cc` in production, not localhost.
- Redirect allow list should include at least:
  - `https://skorly.cc/auth/callback`
  - `https://skorly.cc/**`
  - `http://localhost:3000/**` for local testing
- Email template should use `{{ .ConfirmationURL }}` or `{{ .RedirectTo }}` correctly, not a hardcoded `{{ .SiteURL }}` root-only link.

Relevant files:

- `apps/web/lib/auth-actions.ts`
- `apps/web/app/auth/callback/route.ts`
- `apps/web/middleware.ts`

Verification:

```bash
pnpm --filter @skorly/web typecheck
curl -I 'http://localhost:3000/?code=fake-code'
curl -I 'http://localhost:3000/id?token_hash=fake&type=signup'
```

Status 2026-06-03:

- Code-side defensive flow verified.
- `signUpAction` and `forgotPasswordAction` generate `/auth/callback?next=...` redirect URLs.
- `middleware.ts` catches root/locale-root auth landings that contain `code` or `token_hash/type` and redirects them into `/auth/callback`.
- `/auth/callback` remains the only route that exchanges PKCE `code` or verifies `token_hash/type` and writes Supabase session cookies.
- Production still requires the Supabase Dashboard settings listed above; code cannot enforce the hosted email template or redirect allow list.

Verification 2026-06-03:

```text
pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site/apps/web
> tsc --noEmit

Exit status: 0

pnpm --dir apps/web exec next dev --webpack --port 3000
▲ Next.js 16.2.6 (webpack)
- Local:         http://localhost:3000
✓ Ready in 228ms

curl -I 'http://localhost:3000/?code=fake-code'
HTTP/1.1 307 Temporary Redirect
location: /auth/callback?code=fake-code&next=%2Fid%2Fakun

curl -I 'http://localhost:3000/id?token_hash=fake&type=signup'
HTTP/1.1 307 Temporary Redirect
location: /auth/callback?token_hash=fake&type=signup&next=%2Fid%2Fakun

curl -I 'http://localhost:3000/vi?code=fake-code&type=recovery'
HTTP/1.1 307 Temporary Redirect
location: /auth/callback?code=fake-code&type=recovery&next=%2Fvi%2Fatur-ulang-sandi

curl -I 'http://localhost:3000/auth/callback?code=fake-code&next=%2Fid%2Fakun'
HTTP/1.1 307 Temporary Redirect
location: http://localhost:3000/id/masuk?error=auth
```

Production recheck 2026-06-03:

- Failed for the full production email-verification loop.
- Exact-address registration with `john@johnsvega.cc` is not a clean new-user test because `auth.users` already showed that address as `confirmed=true`, created at `2026-06-03T03:17:00.977Z`.
- A fresh plus-address registration `john+skorly-e2e-1780467739878@johnsvega.cc` succeeded at the UI layer and created an unconfirmed Supabase user. `auth.users.confirmation_sent_at` was `2026-06-03T06:22:22.946Z`.
- The real confirmation email arrived after roughly 2 minutes, but it landed in Migadu spam/junk, not inbox.
- The real email link still points to Supabase verify with `type=signup` and `redirect_to=http://localhost:3000`:

```text
origin: https://majrlaxktengachwrskk.supabase.co
pathname: /auth/v1/verify
type: signup
redirect_to: http://localhost:3000
token: redacted
```

- After link consumption, Supabase marked the plus test user as `confirmed=true` at `2026-06-03T06:25:17.780Z`, but the browser did not obtain a Skorly production session.
- Visiting `https://skorly.cc/id/akun` after the verification attempt redirected to `https://skorly.cc/id/masuk`.

Conclusion:

- Supabase-level email confirmation works.
- Skorly production email verification is still broken from the user's perspective because the hosted email/redirect configuration sends users to `http://localhost:3000` instead of `https://skorly.cc/auth/callback?...`.
- This cannot be fixed by `apps/web/middleware.ts` alone. Supabase Dashboard Site URL, Redirect URLs, and/or email template configuration must be corrected, then retested with another fresh email token.
- Also verify the production value passed by `apps/web/lib/auth-actions.ts#getOrigin()`. The function currently prefers request `Origin`/`Host` headers before `NEXT_PUBLIC_SITE_URL`; if the production runtime is supplying localhost-style headers, the app can pass a bad `emailRedirectTo` even when the code path exists.

Required post-fix verification loop:

- After any P0-3 fix, use the Chrome skill against the real production site, not only local curl or unit tests.
- Register with a fresh inbox-routable address, for example a new `john+skorly-e2e-<timestamp>@johnsvega.cc` plus address.
- Open Migadu Webmail in Chrome and check both inbox and spam/junk for the new confirmation email.
- Inspect the confirmation email link before clicking it. Passing criteria: `redirect_to` must point to `https://skorly.cc/auth/callback?...`, not `http://localhost:3000`.
- Click the confirmation link in Chrome and wait for the final navigation. Passing criteria: the browser must land back on `skorly.cc` and the user must have a valid Skorly session.
- Verify the session by visiting `https://skorly.cc/id/akun`. Passing criteria: it stays on the account page and does not redirect to `/id/masuk`.
- Confirm Supabase user state for the fresh test address. Passing criteria: `auth.users.email_confirmed_at` is non-null and the same browser session can access the protected account page.
- If any criterion fails, do not mark P0-3 fixed. Continue repairing the configuration/code and repeat this Chrome verification loop with another fresh email token until the full production flow works.

Production fix and final recheck 2026-06-03:

- Fixed.
- Supabase Dashboard Auth URL configuration was the production root cause. `SITE_URL` was `http://localhost:3000`; it is now `https://skorly.cc`.
- Supabase Auth Redirect URLs now include:
  - `https://skorly.cc/auth/callback`
  - `https://skorly.cc/**`
  - `http://localhost:3000/**`
- Supabase Confirm sign-up email template was checked and uses `{{ .ConfirmationURL }}` for the CTA link; no hardcoded localhost was found in the template.
- First fresh production retest after Dashboard changes used `john+skorly-e2e-1780468733702@johnsvega.cc`. The real email link changed to `redirect_to=https://skorly.cc/auth/callback?next=%2Fid%2Fakun`, and Supabase confirmed the user at `2026-06-03T06:40:59.712Z`, but `/id/akun` later hit a Cloudflare Worker 1101 hang. Not marked fixed at that point.
- Deployed middleware refresh error handling and changed stalled team routes to dynamic rendering. Deployment succeeded with Worker Version ID `25f26b8c-5a91-403f-bf5e-5e7c334e8c5c`.
- Second fresh production retest used `john+skorly-e2e-1780471932130@johnsvega.cc`. The real email link again pointed to `redirect_to=https://skorly.cc/auth/callback?next=%2Fid%2Fakun`; after clicking it, Supabase set `email_confirmed_at=2026-06-03T07:34:58.477Z` and Chrome landed on `https://skorly.cc/id/akun`. Direct revisit still hit Worker 1101 before the account-page timeout fix, so it was not marked fixed yet.
- Added bounded account-page reads so a slow profile/team/prediction query cannot hang the Worker after auth succeeds. Deployed with Worker Version ID `cee1bd49-d224-4610-9667-4994dc4faf20`.
- Final Chrome recheck in the same fresh-token production session passed: `https://skorly.cc/id/akun` stayed on the account page with title `Akun saya | Skorly`, did not redirect to `/id/masuk`, and did not show Worker 1101.
- Residual non-P0 observation from `wrangler tail`: stale revalidation for `/id` and `/id/peringkat` can still log `FatalError: Dummy queue is not implemented`, and the account page can render fallback profile/team/prediction data after the 8s timeout. These did not block protected account-page access and were not expanded in this P0-3-only pass.

Final production verification output 2026-06-03:

```text
Supabase Dashboard Auth URL configuration
SITE_URL: https://skorly.cc
Redirect URLs total: 3
Confirm sign-up template CTA: {{ .ConfirmationURL }}

Real production email link, fresh address john+skorly-e2e-1780471932130@johnsvega.cc
origin: https://majrlaxktengachwrskk.supabase.co
pathname: /auth/v1/verify
type: signup
redirect_to: https://skorly.cc/auth/callback?next=%2Fid%2Fakun
token: redacted

Supabase auth.users after clicking confirmation link
email: john+skorly-e2e-1780471932130@johnsvega.cc
created_at: 2026-06-03T07:33:10.410Z
confirmation_sent_at: 2026-06-03T07:33:10.451Z
email_confirmed_at: 2026-06-03T07:34:58.477Z

Chrome final protected-page check
url: https://skorly.cc/id/akun
title: Akun saya | Skorly
hasAccountPage: true
redirectedToLogin: false
workerError1101: false

wrangler tail after final account check
GET https://skorly.cc/id/akun - Ok
GET https://skorly.cc/id/akun?_rsc=... - Ok
[account-page] getProfile exceeded 8000ms; rendering fallback data.
[account-page] getTeamOptions exceeded 8000ms; rendering fallback data.
[account-page] getUserPredictionStats exceeded 8000ms; rendering fallback data.
[account-page] getUserPredictions exceeded 8000ms; rendering fallback data.
Residual stale revalidation logs: /id and /id/peringkat -> FatalError: Dummy queue is not implemented

pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site/apps/web
> tsc --noEmit
Exit status: 0

pnpm typecheck
packages/types typecheck: Done
packages/predict-model typecheck: Done
packages/ui typecheck: Done
packages/api-football typecheck: Done
packages/ai-content typecheck: Done
packages/db typecheck: Done
packages/news typecheck: Done
apps/web typecheck: Done
apps/jobs typecheck: Done
Exit status: 0

set -a; source .env; set +a; pnpm build
✓ Compiled successfully in 9.3s
Finished TypeScript in 2.3s ...
✓ Generating static pages using 1 worker (1698/1698) in 17.7min
├ ƒ /[locale]/akun
├ ƒ /[locale]/piala-dunia-2026
├ ƒ /[locale]/skor
├ ƒ /[locale]/tim
├ ƒ /[locale]/tim/[slug]
Exit status: 0
```

## P0 Gate Verification

Status 2026-06-03:

- Code-side build/typecheck gate passed.
- Full production auth gate passed. Real production confirmation email now carries `redirect_to=https://skorly.cc/auth/callback?next=%2Fid%2Fakun`, Supabase confirms the fresh user, and Chrome can access `https://skorly.cc/id/akun` in the same session.
- P1/P2 review can continue after this P0 gate. Remaining build duration is still a measurable follow-up risk, but it is no longer a P0 build failure because final `pnpm build` exited 0.

Verification 2026-06-03:

```text
pnpm typecheck
...
apps/web typecheck: Done
apps/jobs typecheck: Done

Exit status: 0

pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site/apps/web
> tsc --noEmit

Exit status: 0

set -a; source .env; set +a; pnpm build
...
✓ Compiled successfully in 6.1s
Finished TypeScript in 2.1s ...
Generating static pages using 1 worker (1850/1870)
✓ Generating static pages using 1 worker (1870/1870) in 5.6min
...
├ ƒ /[locale]/piala-dunia-2026
├ ƒ /[locale]/skor

Exit status: 0
```

Independent recheck 2026-06-03:

- P0-1: Done. Fresh `set -a; source .env; set +a; pnpm build` exited 0. The route table still marks `├ ƒ /[locale]/piala-dunia-2026` and `├ ƒ /[locale]/skor`, so the two previously blocking pages are no longer part of static generation.
- P0-2: Done. Fresh `pnpm typecheck` exited 0, including `apps/jobs typecheck: Done`.
- P0-3: Final production-side recheck passed after Supabase Dashboard URL configuration and account-page timeout fixes. Earlier real-email rechecks failed first on `redirect_to=http://localhost:3000`, then on Worker 1101 for `/id/akun`; both failures are now closed by the final Chrome/Supabase evidence above.
- Build-duration discrepancy: this recheck generated `1870/1870` pages in `20.5min`, not the earlier `5.5min`/`5.6min`. This does not reopen the P0 build-failure issue because the build exited 0, but build time remains a measurable follow-up risk.

Independent verification output:

```text
pnpm --filter @skorly/web typecheck
Exit status: 0

pnpm typecheck
apps/web typecheck: Done
apps/jobs typecheck: Done
Exit status: 0

set -a; source .env; set +a; pnpm build
✓ Generating static pages using 1 worker (1870/1870) in 20.5min
├ ƒ /[locale]/piala-dunia-2026
├ ƒ /[locale]/skor
Exit status: 0

curl -I 'http://localhost:3000/?code=fake-code'
HTTP/1.1 307 Temporary Redirect
location: /auth/callback?code=fake-code&next=%2Fid%2Fakun

curl -I 'http://localhost:3000/id?token_hash=fake&type=signup'
HTTP/1.1 307 Temporary Redirect
location: /auth/callback?token_hash=fake&type=signup&next=%2Fid%2Fakun

curl -I 'http://localhost:3000/vi?code=fake-code&type=recovery'
HTTP/1.1 307 Temporary Redirect
location: /auth/callback?code=fake-code&type=recovery&next=%2Fvi%2Fatur-ulang-sandi

curl -I 'http://localhost:3000/auth/callback?code=fake-code&next=%2Fid%2Fakun'
HTTP/1.1 307 Temporary Redirect
location: http://localhost:3000/id/masuk?error=auth
```

### P0-4 Team detail pages return Worker 1101 in production

Actual, reported by the SEO review session after PR #1/#2 were created:

```text
/id/tim/* sitemap sample
48 URLs total
2 returned 200
45 returned 500
1 timed out after 5s
500 body: error code: 1101
```

Cause:

- PR #1 changed public team routes to runtime rendering:
  - `apps/web/app/[locale]/tim/page.tsx`
  - `apps/web/app/[locale]/tim/[slug]/page.tsx`
- `/tim/[slug]` then performed Supabase reads at Cloudflare Worker runtime for team, fixtures, and squad data.
- This moved the previous build-time DB stall risk into public SEO runtime traffic and recreated the same Worker 1101 failure class seen on other DB-backed public pages.

Fix 2026-06-03:

- Fixed.
- Restored team list and team detail pages to full SSG with `dynamicParams = false`.
- Added module-level promise caches for build-time reads:
  - `getGroupedTeams()`
  - `getAllTeamSlugs()`
  - `getTeamBySlug(slug)`
  - `getTeamFixtures(teamId)`
  - `getTeamSquad(teamId)`
- Metadata and page rendering now share cached team reads, and fixtures/squad reads remain parallel.
- Public team pages no longer require Supabase access at Cloudflare Worker runtime.

Verification 2026-06-03:

```text
pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site/apps/web
> tsc --noEmit
Exit status: 0

pnpm typecheck
packages/types typecheck: Done
packages/predict-model typecheck: Done
packages/ui typecheck: Done
packages/api-football typecheck: Done
packages/ai-content typecheck: Done
packages/db typecheck: Done
packages/news typecheck: Done
apps/web typecheck: Done
apps/jobs typecheck: Done
Exit status: 0

pnpm cf:deploy
✓ Generating static pages using 3 workers (1890/1890) in 3.6min
├ ● /[locale]/tim
│ ├ /id/tim
│ ├ /vi/tim
│ ├ /en/tim
│ └ /zh/tim
├ ● /[locale]/tim/[slug]
│ ├ /id/tim/brazil
│ ├ /id/tim/uruguay
│ ├ /id/tim/colombia
│ └ [+189 more paths]
Current Version ID: d4162c7c-a97f-48c5-93a4-b73cb3b59511
Exit status: 0

Production /id/tim/* sitemap recheck, first post-deploy pass
total: 48
ok: 48
bad: 0
p75ms: 1831
p95ms: 2067
maxms: 2088

Production /id/tim/* sitemap recheck, warm-cache pass
total: 48
ok: 48
bad: 0
p75ms: 1282
p95ms: 1340
maxms: 1938

Production all-locale team detail sitemap recheck
total: 192
ok: 192
bad: 0
p75ms: 1401
p95ms: 1516
maxms: 2208
id: total=48 ok=48 bad=0 p95=1322ms max=1369ms
vi: total=48 ok=48 bad=0 p95=1477ms max=2021ms
en: total=48 ok=48 bad=0 p95=1498ms max=2140ms
zh: total=48 ok=48 bad=0 p95=1813ms max=2208ms

Production team detail SEO sample
https://skorly.cc/id/tim/brazil 200 canonical=true hrefLang=5 jsonLd=4 h1=1 body=true
https://skorly.cc/vi/doi-tuyen/brazil 200 canonical=true hrefLang=5 jsonLd=4 h1=1 body=true
https://skorly.cc/en/team/brazil 200 canonical=true hrefLang=5 jsonLd=4 h1=1 body=true
https://skorly.cc/zh/qiudui/brazil 200 canonical=true hrefLang=5 jsonLd=4 h1=1 body=true

Production nonexistent team slug check
https://skorly.cc/id/tim/nonexistent-team-build-fix-20260603 404 1.392563
https://skorly.cc/vi/doi-tuyen/nonexistent-team-build-fix-20260603 404 1.192859
https://skorly.cc/en/team/nonexistent-team-build-fix-20260603 404 1.223407
https://skorly.cc/zh/qiudui/nonexistent-team-build-fix-20260603 404 1.228217
```

### P0-5 Production Server Actions hang in Cloudflare Worker and break logged-in modules

Status 2026-06-03 full-system review:

- Open.
- This is a new P0 discovered after the earlier P0 auth/build fixes were verified.
- Local quality gates pass, but production runtime still fails for key logged-in functionality.

Actual:

- Chrome authenticated account access still works for `/id/akun`.
- Chrome authenticated match detail page does not render prediction/forecast/comment client islands after waiting 12s.
- Chrome authenticated bracket page lets the user select teams, but saving the bracket fails with `Terjadi kesalahan. Silakan coba lagi.`
- Chrome authenticated `/id/liga` is unstable: one request rendered normally, but two logged-in requests returned Cloudflare Worker 1101.
- Public GET requests also intermittently returned Cloudflare `Worker exceeded resource limits` / 503 during the same review window, including `/id/jadwal`, `/id/cerita`, article/match/team samples, and API routes that should normally return early validation responses.
- `wrangler tail` shows the common failure class: Cloudflare cancels the Worker request because code is detected as hung, and the affected request returns 500.

Status 2026-06-04 fix session update:

- Still open.
- While validating the SEO news sitemap fix, adding `DATABASE_URL` as a Worker secret made a dynamic `/news-sitemap.xml` route intermittently trigger the same Cloudflare hung-request failure class.
- `wrangler tail` showed `The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response` for `/news-sitemap.xml?...`, with 500 responses.
- Mitigation applied for the sitemap only: removed the `@skorly/db`/Postgres runtime path from `apps/web/app/news-sitemap.xml/route.ts`, switched that route to Supabase REST over HTTPS, and deleted the temporary `DATABASE_URL` Worker secret after validation.
- P0-5 is not fixed by this sitemap mitigation; logged-in Server Actions and other dynamic modules still need a separate production runtime investigation.

Evidence:

```text
Local gates, current working tree
pnpm typecheck -> exit 0
pnpm lint -> exit 0
pnpm build -> exit 0
✓ Generating static pages using 3 workers (1890/1890) in 4.0min
pnpm --filter @skorly/api-football test -> 2 tests passed

Chrome authenticated /id/pertandingan/mexico-vs-south-africa-20260611
waited: 12s
pulseCount: 5
hasPredictTitle: false
hasForecast: false
formCount: 1
visible form: subscribe gift card only
console: Error: An unexpected response was received from the server.

wrangler tail for the same match page
POST https://skorly.cc/id/pertandingan/mexico-vs-south-africa-20260611
accept: text/x-component
next-action: present
response.status: 500
exception: The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response.

Chrome authenticated /id/prediksi
Selected: Mexico, Brazil, France, Argentina
Finalists: MEX, BRA
Champion: BRA
Save button: enabled
After click: Terjadi kesalahan. Silakan coba lagi.

wrangler tail for bracket page
POST https://skorly.cc/id/prediksi next-action=0054... response.status=500 hung
POST https://skorly.cc/id/prediksi next-action=40a7... response.status=500 hung

Chrome authenticated /id/liga
First check: Worker 1101
Second check: rendered normally
Third check: Worker 1101, Ray ID a05f8e2e3f588c59

wrangler tail for /id/liga
GET https://skorly.cc/id/liga
cf-ray: a05f8e2e3f588c59
response.status: 500
exception: The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response.

wrangler tail for live scores
POST https://skorly.cc/zh/shishi-bifen
accept: text/x-component
response.status: 500
exception: The Workers runtime canceled this request because it detected that your Worker's code had hung and would never generate a response.

Additional public/runtime instability observed in this continued review:
/id/jadwal GET returned 503 "Worker exceeded resource limits" twice, then 6 later GET retries returned 200.
/id/cerita GET returned 503 once and one request hung until client abort, then 6 later GET retries returned 200.
/id/artikel/news-10... returned 503 twice, then 200.
/id/pertandingan/mexico-vs-south-africa-20260611 returned 503 during response-header sampling and one follow-up fetch hung without client timeout.
/api/subscribe invalid-fields POST returned 503 once, although the same route normally returns 400/403/405 for validation cases.
/auth/callback with missing params returned 503 once, although it should redirect to /id/masuk?error=auth.
```

Likely affected surfaces:

- `apps/web/components/live-scoreboard.tsx` -> `apps/web/lib/score-actions.ts#getLiveScores`
- `apps/web/components/forecast-card.tsx` -> `apps/web/lib/prediction-actions.ts#getForecast`
- `apps/web/components/predict-score.tsx` -> `getMyPrediction` / `submitPrediction`
- `apps/web/components/bracket-builder.tsx` -> `getBracketAction` / `saveBracketAction`
- `apps/web/components/comments-section.tsx` -> comment server actions
- `apps/web/components/events-timeline.tsx` / `goal-highlights.tsx` -> score server actions
- `apps/web/app/[locale]/liga/page.tsx` logged-in server rendering path

Fix direction:

- Treat this as an OpenNext/Cloudflare production Server Action/runtime compatibility issue, not as isolated component bugs.
- Do not mark fixed by local `pnpm build` or local browser tests alone; the failure only showed up in production Worker execution.
- Either make these client islands call explicit Route Handlers with bounded DB reads, or prove current Server Actions are supported and bounded under `@opennextjs/cloudflare`.
- Add production-side timeouts/fallbacks around DB reads used by logged-in dynamic pages/actions, similar to the account-page timeout fix.
- For `/id/liga`, inspect the authenticated render path separately from unauthenticated HTTP checks. Unauthenticated `GET /id/liga` returned 200, while authenticated Chrome requests can 1101.
- Do not scope the fix only to logged-in Server Actions. The latest evidence shows public GET/API requests can also hit Worker resource limits under production traffic or repeated review scans.

Required post-fix verification:

- Run `wrangler tail skorly-web --format json --status error` during Chrome verification.
- In Chrome authenticated session:
  - open `/id/pertandingan/mexico-vs-south-africa-20260611`; prediction, forecast, comments/events should resolve or show explicit non-skeleton fallback within 3s.
  - save a score prediction before kickoff.
  - open `/id/prediksi`; choose four semifinalists, two finalists, one champion, then save; page must show success and no Worker 500.
  - open `/id/liga` at least 5 times; all must render, no 1101.
  - create a test mini-league and navigate to its detail page.
  - open `/zh/shishi-bifen`; no Server Action POST 500/hung should appear in tail.
- Passing criterion: zero Worker `outcome=exception` / `response.status=500` events for those flows during the verification window.

Status 2026-06-04 final fix session:

- Fixed in production.
- PR #11 `Fix production client runtime calls via API routes` merged at `c8951ab83f24ac18e0f3758192e6f2f6d0b5d864`.
- PR #12 `Fix build-time team data stalls` merged at `ed4e09c08a4711481a8413baec12272b205abf8e`.
- Production deploy completed from main commit `ed4e09c08a4711481a8413baec12272b205abf8e`.
- Cloudflare Worker version: `d26d50fa-c256-41b3-9a00-2e9d66aa1b46`.
- Fix shape:
  - Client islands for prediction, forecast, events, public picks, comments, bracket, mini league, push, premium, live scores, and home personalization now call explicit JSON Route Handlers instead of Next Server Actions.
  - Runtime database reads/writes for those routes use Supabase REST/service-role HTTPS helpers, not Worker runtime Postgres.
  - `/id/prediksi` no longer reads grouped teams during static build; `BracketBuilder` loads team groups through `/api/teams/groups`.
  - Team detail SSG now uses a cached all-team page query and bounded fallback for optional fixtures/squad data so one stalled build-time read cannot fail deployment.

Verification output:

```text
Local gates after PR #11:
pnpm --filter @skorly/web typecheck -> exit 0
pnpm lint -> exit 0
pnpm typecheck -> exit 0
pnpm build -> exit 0

PR #11 first production deploy attempt:
failed before deploy because SSG /id/tim/uruguay exceeded 120s three times.
This was not marked fixed.

Build-fix validation after PR #12:
pnpm --filter @skorly/db typecheck -> exit 0
pnpm --filter @skorly/web typecheck -> exit 0
pnpm lint -> exit 0
pnpm typecheck -> exit 0
production-env pnpm --filter @skorly/web build -> exit 0
✓ Generating static pages using 3 workers (1905/1905) in 3.2min

Production deploy:
pnpm --dir apps/web cf:deploy -> exit 0
✓ Generating static pages using 3 workers (1905/1905) in 3.2min
Uploaded 1588 files (439 already uploaded)
Worker Startup Time: 41 ms
Current Version ID: d26d50fa-c256-41b3-9a00-2e9d66aa1b46

Chrome authenticated verification:
/id/akun:
  H1: Akun saya
  skeletonCount: 0
  account stats/profile form rendered
  saved prediction row visible: Mexico vs South Africa 1-0

/id/pertandingan/mexico-vs-south-africa-20260611:
  H1: Mexico vs South Africa
  skeletonCount: 0 after 6.5s
  predictionInputs: 2
  forecastVisible: true
  commentsLoadedAuthed: true
  loginPrompt: false
  save score prediction 1-0: attempted true, saved true, skeletonCount 0

/id/prediksi:
  team groups loaded through /api/teams/groups
  hasTeams: true
  skeletonCount before save: 0
  selected semifinalists: Argentina, Brazil, France, Spain
  selected finalists: ARG, BRA
  selected champion: ARG
  saveClicked: true
  saved: true
  page showed: Bagan tersimpan!
  skeletonCount after save: 0

/id/liga repeated authenticated GET:
  5/5 rendered H1 "Liga mini privat"
  5/5 errorText false for 1101/Application error/500
  5/5 skeletonCount 0

/id/liga create mini-league:
  created: true
  detail URL: /id/liga/lg-79fd93
  detail H1: P0 Test 1780517470596
  rateLimited: false
  skeletonCount: 0
  errorText: false

/zh/shishi-bifen:
  H1: 实时比分与赛果
  errorText false for 1101/Application error/500
  The only animate-pulse node after 10s was the red live-status dot under 正在进行, not a loading skeleton.

Cloudflare error tail during the Chrome verification window:
wrangler tail skorly-web --format json --status error
output: no events
Worker outcome=exception / response.status=500 observed: 0

Public API smoke after deploy:
200 3290ms https://skorly.cc/api/teams/groups groups 12 teams 48
200 1337ms https://skorly.cc/api/fixtures/1/forecast forecast,summary,homeName,awayName
200 746ms  https://skorly.cc/api/fixtures/1/picks array 1
200 524ms  https://skorly.cc/api/score/live array 0
```

## P1 Findings

### P1-1 Lint script is invalid for current Next version

Actual:

```text
pnpm lint
apps/web lint: Invalid project directory provided, no such directory: /Users/.../apps/web/lint
```

Relevant file:

- `apps/web/package.json`

Fix direction:

- Replace `next lint` with a supported ESLint setup for Next 16, or remove root lint until ESLint config exists.
- Add actual lint config if linting is expected to be part of CI.

Status 2026-06-03:

- Fixed.
- Added `apps/web/eslint.config.mjs` using the Next 16 ESLint flat config presets.
- Changed `apps/web` lint script from the removed `next lint` command to `eslint .`.
- Added the required ESLint dev dependencies to `apps/web/package.json` / `pnpm-lock.yaml`.

Verification 2026-06-03:

```text
pnpm lint
> skorly@0.1.0 lint /Users/johnmacmini/workspace/Football site
> pnpm -r lint

Scope: 9 of 10 workspace projects
apps/web lint$ eslint .
apps/web lint: Done

Exit status: 0
```

### P1-2 Turbopack dev server crashed during route scan

Actual:

```text
RangeError: Map maximum size exceeded
at AsyncHook.init (.../app-page-turbo.runtime.dev.js...)
```

Context:

- Happened after broad route scan against `next dev` Turbopack on port `3001`.
- Webpack dev server continued to work for follow-up validation.

Fix direction:

- Treat as dev-server stability risk.
- Reproduce with route scan script before investing too much time.
- If persistent, prefer `next dev --webpack` for local QA until root cause is understood.

Status 2026-06-03:

- Fixed as a dev-workflow mitigation.
- Changed the default `apps/web` dev script to `next dev --webpack`.
- This does not claim the upstream Turbopack `RangeError: Map maximum size exceeded` bug is fixed; it removes Turbopack from the default local QA path so route scans use the stable webpack dev server.

Verification 2026-06-03:

```text
pnpm --dir apps/web dev --port 3002
> @skorly/web@0.1.0 dev /Users/johnmacmini/workspace/Football site/apps/web
> next dev --webpack --port 3002

▲ Next.js 16.2.6 (webpack)
- Local:         http://localhost:3002
✓ Ready in 225ms

Exit status after manual Ctrl-C: 0
```

### P1-3 Detail pages have high first-load latency

Measured examples in local dev:

- Match detail: `/id/pertandingan/mexico-vs-south-africa-20260611` took `14.3s`.
- Article detail: `/id/artikel/news-226-official-ghana-release-world-cup-squad-by-carlos-queiroz-htt` took `25.5s`.
- Team detail: `/id/tim/mexico` took `12.6s`.
- Forecast server action on match page took `7.5s`.

Impact:

- User-perceived load can exceed acceptable thresholds.
- Build timeout is likely related to the same data-fetching/static-generation pattern.

Fix direction:

- Reduce repeated `generateStaticParams`/DB queries.
- Cache static data for build and request scope.
- Move slow client-island actions to precomputed/cached data where possible.

Status 2026-06-03:

- Fixed/closed by the earlier full SSG + build-time cache work, and preserved by this P1/P2 pass.
- No detail page was changed to CSR.
- Current build still statically generates article, match, story, and team detail pages.
- The original 12s-25s local-dev first-load symptoms no longer reproduce against the current local production build.

Verification 2026-06-03:

```text
pnpm build
✓ Generating static pages using 3 workers (1890/1890) in 4.1min
Exit status: 0

Local production server: pnpm --dir apps/web exec next start -p 3100

Detail-page latency sample against http://localhost:3100
{"url":"http://localhost:3100/id/pertandingan/mexico-vs-south-africa-20260611","status":200,"ms":37}
{"url":"http://localhost:3100/id/artikel/news-226-official-ghana-release-world-cup-squad-by-carlos-queiroz-htt","status":200,"ms":9}
{"url":"http://localhost:3100/id/tim/mexico","status":200,"ms":5}
{"url":"http://localhost:3100/id/cerita/mexico-vs-south-africa-20260611","status":200,"ms":3}
```

### P1-4 Share buttons produce hydration mismatch

Actual:

- React hydration mismatch logged on `/id/peringkat`.
- Server generated relative share URLs, client generated absolute URLs using `window.location.origin`.

Relevant file:

- `apps/web/components/share-buttons.tsx`

Fix direction:

- Make server and initial client render deterministic.
- Example options:
  - Pass absolute URL from server.
  - Render hrefs only after mount.
  - Use a stable configured site URL instead of `window.location.origin` during initial render.

Status 2026-06-03:

- Fixed.
- `ShareButtons` now uses a stable configured site URL during initial render and no longer switches from relative server URLs to `window.location.origin` on the client.

Verification 2026-06-03:

```text
Local production check: http://localhost:3100/id/peringkat
{"path":"/id/peringkat","status":200,"ok":true,"hasProductionShareUrl":true,"hasLocalhostShareUrl":false}

pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site/apps/web
> tsc --noEmit

Exit status: 0
```

### P1-5 Dynamic live-score and World Cup hub pages have 10s-class production latency

Status 2026-06-03 full-system review:

- Open.
- This is separate from the P0 build timeout: the pages now build, but production users often wait around 10-11s for the dynamic response.

Measured production HTTP scan:

```text
GET https://skorly.cc/id/skor-langsung          200 11169ms
GET https://skorly.cc/vi/ket-qua-truc-tiep     200 11212ms
GET https://skorly.cc/en/live-scores           200 11195ms
GET https://skorly.cc/zh/shishi-bifen          200 11291ms
GET https://skorly.cc/zh/shishi-bifen          200 10295ms
GET https://skorly.cc/zh/shishi-bifen          200 10339ms
GET https://skorly.cc/zh/shishi-bifen          200 10282ms
GET https://skorly.cc/zh/shishi-bifen          503 575ms

GET https://skorly.cc/id/piala-dunia-2026      200 10496ms
GET https://skorly.cc/vi/world-cup-2026        200 10463ms
GET https://skorly.cc/en/world-cup-2026        200 10487ms
GET https://skorly.cc/zh/shijiebei-2026        200 10589ms
```

Contrast:

```text
SSG/static detail and index samples in the same scan:
/id/jadwal                                      200 334ms
/id/tim/brazil                                  200 312ms
/id/pertandingan/mexico-vs-south-africa...      200 305ms
/id/artikel/news-10...                          200 311ms
/sitemap.xml                                    200 309ms
/og                                             200 1467ms
```

Impact:

- The 10s fallback prevents build/Worker hard failure, but it creates poor first-load UX and poor crawler latency for high-intent SEO pages.
- `/zh/shishi-bifen` also showed intermittent 503 in repeated production checks, so this is a stability risk, not only a performance issue.

Fix direction:

- Move live-score and hub data to precomputed/cache-backed reads instead of request-time DB waits.
- If the data is allowed to be stale, prefer ISR/static cache or KV/R2-backed snapshots.
- Keep the timeout fallback, but reduce normal-path latency target to `<1500ms p95` for these public pages.
- Re-test with at least 5 sequential requests per locale and one concurrent batch.

### P1-6 Mobile header causes horizontal scrolling on core pages

Status 2026-06-03 full-system review:

- Open.
- Tested with in-app browser viewport `390x844`.

Measured mobile overflow:

```text
/vi                         scrollWidth=416 clientWidth=390 overflowX=true
/en                         scrollWidth=495 clientWidth=390 overflowX=true
/id/jadwal                  scrollWidth=511 clientWidth=390 overflowX=true
/id/tim                     scrollWidth=511 clientWidth=390 overflowX=true
/id/tim/brazil              scrollWidth=511 clientWidth=390 overflowX=true
/id/pertandingan/...        scrollWidth=511 clientWidth=390 overflowX=true
/id/artikel/...             scrollWidth=511 clientWidth=390 overflowX=true
/id/cerita                  scrollWidth=511 clientWidth=390 overflowX=true
/id/prediksi                scrollWidth=511 clientWidth=390 overflowX=true
/id/daftar                  scrollWidth=511 clientWidth=390 overflowX=true
/id/masuk                   scrollWidth=511 clientWidth=390 overflowX=true
/id/skor-langsung           scrollWidth=511 clientWidth=390 overflowX=true
```

Primary overflowing elements:

```text
nav.flex.items-center.gap-4.text-sm
right=511, width=426, x=85

locale switcher div
right=511, width=149, x=361

language buttons:
ID x=364 right=397
VI x=401 right=432
EN x=436 right=472
中文 x=476 right=508
```

Notes:

- `/zh` and `/zh/shishi-bifen` did not horizontally overflow in the same scan, but Chinese nav labels are compressed tightly; the fix should check all locales, not only Indonesian.
- This is user-visible UI/UX debt because a 390px phone gets unwanted sideways scrolling on almost every ID page.

Fix direction:

- Replace full desktop nav with a mobile nav/menu below the `sm` breakpoint.
- Keep locale switcher inside available width or move it into the mobile menu.
- Re-test at `360x740`, `390x844`, and `430x932`; passing criterion is `document.documentElement.scrollWidth <= window.innerWidth + 1` on all core routes.

Status 2026-06-04 follow-up:

- Fixed in code by PR #14.
- The mobile header no longer renders the full desktop nav, notification bell, auth links, and locale switcher in one row.
- Below the `lg` breakpoint, the header now renders brand + auth action + a localized native `details` menu.
- The locale switcher and notification bell moved inside the mobile menu.

Production verification 2026-06-04:
- PR #14 was marked ready and merged to `main`.
- Deployed app commit: `30a360c155512a742bc40da0a7d2c5b71908bffb`.
- Deploy run: `https://github.com/john-hoe/skorly-web/actions/runs/26933296887`.
- Worker version: `aa2d3874-62a7-45a3-be86-4e026754942d`.

```text
Production viewport check with in-app Browser:
https://skorly.cc/id @ 375x844
innerWidth=375
scrollWidth=375
overflowPx=0
offenderCount=0
hasMobileMenu=true
summaryText=Menu

https://skorly.cc/id @ 390x844
innerWidth=390
scrollWidth=390
overflowPx=0
offenderCount=0
hasMobileMenu=true
summaryText=Menu

Screenshot evidence:
/tmp/skorly-prod-mobile-390.png
```

### P1-7 Footer legal links are globally visible but 404

Status 2026-06-03 full-system review:

- Open.
- This is higher than a cosmetic footer issue because the site collects email, WhatsApp, account data, prediction data, and marketing consent.

Evidence:

```text
Footer links in apps/web/components/site-footer.tsx
href="/privacy"
href="/terms"

Production verification:
GET /privacy     -> 307 /id/privacy
GET /id/privacy  -> 404 "404: This page could not be found."
GET /terms       -> 307 /id/terms
GET /id/terms    -> 404 "404: This page could not be found."
```

Impact:

- Every page links to legal pages that do not exist.
- Trust/compliance risk is material because subscribe/register/account flows collect personal data.

Fix direction:

- Add localized `/[locale]/privacy` and `/[locale]/terms` pages, or point footer anchors to real top-level static pages that bypass locale middleware.
- Keep `noindex` only if that is intentional; otherwise include canonical metadata.
- Re-test footer links from all locales.

### P1-8 Production News sitemap is stale and contains entries older than 48 hours

Status 2026-06-03 full-system review:

- Open in production.
- Local production server using the current code is clean, so this is likely a deployment/cache-state issue rather than the current route source code.

Evidence:

```text
Production https://skorly.cc/news-sitemap.xml
status: 200
urls: 77
oldCount: 16 entries older than 48h
oldest samples: 2026-06-01T13:27Z, age about 50h at 2026-06-03T15:17Z

Production response headers:
cache-control: s-maxage=1, stale-while-revalidate=2592000
x-nextjs-cache: HIT

Current local production server from this working tree:
cache-control: public, max-age=0, s-maxage=300, stale-while-revalidate=60
urls: 61
oldCount: 0
```

Impact:

- Google News sitemap rules only allow recent news URLs; older URLs can be ignored and reduce trust in the feed.
- The production cache header does not match the current route code in `apps/web/app/news-sitemap.xml/route.ts`, which suggests stale deployment output or an OpenNext cache that was not invalidated.

Fix direction:

- Redeploy current code or explicitly purge/revalidate the production news sitemap cache.
- Confirm production headers match the source route (`s-maxage=300, stale-while-revalidate=60` unless intentionally changed).
- Recheck with current wall time: all `<news:publication_date>` values must be within the last 48 hours.

Status 2026-06-04 fix session:

- Fixed and deployed via PR #9 after PR #7 and PR #8 exposed production runtime issues.
- PR #7 made `/news-sitemap.xml` request-time dynamic, but production initially returned 200 with 0 URLs because the Worker had no `DATABASE_URL` secret.
- Adding `DATABASE_URL` restored URLs but exposed P0-5: bypass-cache production checks intermittently returned Cloudflare hung-request 500s from the Worker/Postgres path.
- PR #8 stopped cacheable 200 empty XML on route failure, but did not solve Worker/Postgres hung failures.
- PR #9 changed the route to query Supabase REST with server-only `SUPABASE_SERVICE_ROLE_KEY`, preserving request-time 48h filtering without using the Worker Postgres client.
- Temporary `DATABASE_URL` Worker secret was deleted after PR #9 validation; current Worker secrets include `SUPABASE_SERVICE_ROLE_KEY` only.

Verification output:

```text
PR #9 merged main commit:
0a3f84d9e946bd473b2a24dd136998675ad93cb2

Cloudflare deploy:
✓ Generating static pages using 3 workers (1897/1897) in 3.9min
Current Version ID after code deploy: 9d044ae1-4c09-4799-970e-b4bfdf3bb718
Current Version ID after deleting temporary DATABASE_URL secret: ecc6a1f4-bccb-44ac-916a-ce65b65f2178

Worker secrets:
[
  { "name": "SUPABASE_SERVICE_ROLE_KEY", "type": "secret_text" }
]

Production https://skorly.cc/news-sitemap.xml?postDelete=...
sample size: 10
failures: 0
urls: 32 on every sample
oldCount: 0 on every sample
source: supabase-rest on every sample
cache-control: public, max-age=0, s-maxage=300, stale-while-revalidate=60
p50: 703ms
p75: 712ms
p95: 723ms
```

## P2 Findings

### P2-1 Indonesian article summaries contain English text

Observed:

- Homepage/news/archive show Indonesian titles with English summaries.

Quantified sample:

- Query sampled latest 80 `id` published articles.
- English-keyword heuristic found at least 15 English-like summaries.
- Conservative estimate: `19%` of sampled summaries are likely English.

Example:

```text
Title: Queiroz Mengumumkan Skuad Pra-Piala Dunia Ghana...
Summary: Carlos Queiroz has officially announced Ghana's 28-player preliminary squad...
```

Fix direction:

- Add content QA gate that checks title/body/summary language per locale.
- Backfill affected summaries.
- Decide whether summaries should be generated from localized body instead of upstream source text.

Status 2026-06-03:

- Fixed for future generated news.
- `apps/jobs/scripts/run-generate-news.ts` now derives summaries from the final article body.
- Translated articles now derive summaries from the translated body instead of reusing the English source summary.
- Backfilled existing localized published news summaries in the production database for `id`, `vi`, and `zh`. The original Indonesian issue is now clean by the same 80-article heuristic used during review.

Verification 2026-06-03:

```text
Production DB backfill result
id: checked=21 suspectedBefore=21 updated=21 suspectedAfter=0
vi: checked=21 suspectedBefore=21 updated=21 suspectedAfter=13
zh: checked=21 suspectedBefore=21 updated=21 suspectedAfter=0

Follow-up production DB sample, latest 80 id published articles
{"locale":"id","sampled":80,"suspectedEnglish":0,"ok":true}
```

Full-system production recheck 2026-06-03:

- Reopened / partial fix only.
- The latest-80 database heuristic is not sufficient as the pass condition because production-visible pages still expose English summaries and meta descriptions to users and crawlers.

Evidence:

```text
https://skorly.cc/id/artikel/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-
body language: Indonesian
meta description: "Cornish miners introduced football to Mexico..."

https://skorly.cc/id/artikel/news-101-world-cup-2026-news-and-live-updates-usa-canada-and-mexico-b
meta description: "The 2026 FIFA World Cup, co-hosted by the USA..."
title issue: "USA" is mistranslated to "ASI"; in Indonesian this means breast milk, not United States.

https://skorly.cc/id/artikel/news-226-official-ghana-release-world-cup-squad-by-carlos-queiroz-htt
meta description: "Carlos Queiroz has officially announced Ghana's..."

https://skorly.cc/id/berita and https://skorly.cc/id/arsip
visible card summaries include English text such as:
"The 2026 FIFA World Cup, co-hosted by the USA..."
```

Updated fix direction:

- Sample all production-visible Indonesian article cards and article pages, not only latest database rows.
- Include `<meta name="description">`, Open Graph/Twitter descriptions, list-card summaries, and archive-card summaries in the language QA gate.
- Add a protected-term/acronym rule for `USA`, `USMNT`, `FIFA`, team names, and country codes so translation does not convert acronyms into unrelated local words.
- After backfill/redeploy, validate with both DB sampling and production HTTP/HTML sampling.

### P2-2 Countdown unit labels are hardcoded Indonesian

Actual:

- `/vi` home shows `Hari`, `Jam`, `Menit`, `Detik`.

Relevant file:

- `apps/web/components/countdown.tsx`

Fix direction:

- Move countdown units into locale message catalogs.

Status 2026-06-03:

- Fixed.
- Countdown unit labels now come from `home.countdownUnits` in each locale message catalog.

Verification 2026-06-03:

```text
Message catalog parse
messages ok

Locale message values
en: Days / Hours / Minutes / Seconds
id: Hari / Jam / Menit / Detik
vi: Ngày / Giờ / Phút / Giây
zh: 天 / 小时 / 分钟 / 秒

Local production check: http://localhost:3100/vi
{"check":"vi-countdown-units","status":200,"ok":true,"hasLocalizedUnits":true,"hasIndonesianUnits":false}
```

### P2-3 Multiple page titles duplicate `2026`

Observed:

- `Jadwal — Piala Dunia 2026 2026`
- `Web Stories — Piala Dunia 2026 2026`
- AMP story cover shows `PIALA DUNIA 2026 2026`.

Relevant files:

- `apps/web/app/[locale]/jadwal/page.tsx`
- `apps/web/app/[locale]/cerita/page.tsx`
- `apps/web/app/[locale]/cerita/[slug]/route.ts`

Cause:

- `nav.worldCup` already contains `2026`, but code appends another `2026`.

Fix direction:

- Do not append `2026` to `t("nav.worldCup")`.
- Or split message keys into `worldCup` and `worldCupYear`.

Status 2026-06-03:

- Fixed.
- Removed the extra hardcoded `2026` appended to `t("nav.worldCup")` in schedule, team index, and AMP Web Story output.

Verification 2026-06-03:

```text
Local production duplicate-title checks
{"url":"http://localhost:3100/id/jadwal","status":200,"hasDuplicate2026":false,"ok":true}
{"url":"http://localhost:3100/id/tim","status":200,"hasDuplicate2026":false,"ok":true}
{"url":"http://localhost:3100/id/cerita/mexico-vs-south-africa-20260611","status":200,"hasDuplicate2026":false,"ok":true}
```

### P2-4 Article source list renders internal URNs as blank links

Observed on article detail:

- `urn:skorly:tavily`
- `urn:skorly:db`

These appear as blank source links because `new URL("urn:...").hostname` is empty.

Relevant file:

- `apps/web/app/[locale]/artikel/[slug]/page.tsx`

Fix direction:

- Filter non-http(s) sources from public source list.
- Optionally render internal provenance in debug/admin surfaces only.

Status 2026-06-03:

- Fixed.
- Article detail pages now filter public source links to `http:` and `https:` URLs only.
- Internal provenance URNs remain available in data but are not rendered as public source links.

Verification 2026-06-03:

```text
Local production check:
http://localhost:3100/id/artikel/news-101-world-cup-2026-news-and-live-updates-usa-canada-and-mexico-b

{"path":"/id/artikel/news-101-world-cup-2026-news-and-live-updates-usa-canada-and-mexico-b","status":200,"ok":true,"hasInternalUrnSource":false}
```

### P2-5 Match page has weak above-the-fold hierarchy

Observed:

- Match page first viewport is dominated by large poster image.
- Match title/score block appears below the image.
- Page has no explicit match-level `h1`; article headings provide H1s later in the page.

Relevant file:

- `apps/web/app/[locale]/pertandingan/[slug]/page.tsx`

Impact:

- User cannot immediately confirm match context above the fold.
- SEO/accessibility heading hierarchy is weak.

Fix direction:

- Put match title/score as the page H1/header before or over the poster.
- Avoid article body H1s creating multiple competing H1s inside the same match page.

Status 2026-06-03:

- Fixed.
- Match detail pages now render the match score/title header before the poster image.
- The match title is the single page-level `h1`.

Verification 2026-06-03:

```text
Local production check:
http://localhost:3100/id/pertandingan/mexico-vs-south-africa-20260611

{"check":"match-header-above-poster","status":200,"ok":true,"h1Index":8213,"posterIndex":9831,"h1Count":1}
```

### P2-6 Web Stories index card text is cramped and partly English-style

Observed:

- Cards read like `VSMexico v South Africa`.
- Uses `v` instead of locale-aware `vs`.
- Lack of spacing hurts scanability.

Relevant file:

- `apps/web/app/[locale]/cerita/page.tsx`

Fix direction:

- Add spacing around VS.
- Use locale-aware separator and labels.

Status 2026-06-03:

- Fixed.
- Web Stories index cards now use the locale `common.vs` label and render spaced match text.
- Cards also have a stable minimum height and centered content to reduce cramped text.

Verification 2026-06-03:

```text
Local production check: http://localhost:3100/id/cerita
{"check":"story-index-vs-spacing","status":200,"ok":true,"hasSpacedVs":true,"hasCrammedVs":false}
```

### P2-7 Subscribe form error message is too generic for captcha failures

Observed:

- API returns `403 {"ok":false,"error":"captcha"}` when no valid Turnstile token is present.
- UI displays generic message: `Terjadi kesalahan. Coba lagi sebentar lagi.`

Relevant files:

- `apps/web/components/subscribe-gift-card.tsx`
- `apps/web/app/api/subscribe/route.ts`
- `apps/web/messages/*.json`

Fix direction:

- Surface specific captcha/rate-limit/invalid errors.
- Keep generic fallback for unknown server errors.

Status 2026-06-03:

- Fixed.
- Subscribe form now maps API errors to specific localized UI messages for `invalid`, `captcha`, `rateLimited`, and `generic`.
- The API contract stayed unchanged.

Verification 2026-06-03:

```text
Local production API check without Turnstile token
{"check":"subscribe-captcha-error-code","status":403,"body":"{\"ok\":false,\"error\":\"captcha\"}"}

Message catalog parse
messages ok
```

### P2-8 Logged-in users can still open the login page

Status 2026-06-03 full-system review:

- Open.
- This is not an auth-blocking P0 because `/id/akun` is accessible, but it is confusing UX.

Evidence:

```text
Chrome authenticated /id/masuk
url: https://skorly.cc/id/masuk
title: Selamat datang kembali | Skorly
header auth link: Akun saya
page h1/body: Selamat datang kembali / login form
```

Impact:

- The header correctly knows the user is logged in, while the page body still asks the same user to log in.
- This can confuse QA of auth state and users who navigate back to `/masuk`.

Fix direction:

- Redirect authenticated users away from `/masuk` and `/daftar` to `/akun` or the `next` destination.
- Or render an already-signed-in state with a clear account link and sign-out option.

Status 2026-06-04 follow-up:

- Fixed in code by PR #14.
- `/[locale]/masuk` and `/[locale]/daftar` call the existing server-side Supabase auth helper.
- If `getSessionUser()` returns a verified user, both pages redirect locale-aware to `/akun`.
- Unauthenticated users still receive the login/register forms.

Production verification 2026-06-04:
- PR #14 was marked ready and merged to `main`.
- Deployed app commit: `30a360c155512a742bc40da0a7d2c5b71908bffb`.
- Deploy run: `https://github.com/john-hoe/skorly-web/actions/runs/26933296887`.
- Worker version: `aa2d3874-62a7-45a3-be86-4e026754942d`.

```text
Unauthenticated production HTTP check:
https://skorly.cc/id/masuk
status=200
noindex=true
h1=1

https://skorly.cc/id/daftar
status=200
noindex=true
h1=1

Authenticated production Chrome check:
https://skorly.cc/id/akun
finalUrl=https://skorly.cc/id/akun
title=Akun saya | Skorly
h1=Akun saya

Requested https://skorly.cc/id/masuk
finalUrl=https://skorly.cc/id/akun
title=Akun saya | Skorly
h1=Akun saya

Requested https://skorly.cc/id/daftar
finalUrl=https://skorly.cc/id/akun
title=Akun saya | Skorly
h1=Akun saya
```

### P2-9 Rendered hreflang metadata disagrees with sitemap alternates

Status 2026-06-03 full-system review:

- Open.
- Sitemap alternates are structurally correct, but rendered page metadata and response `Link` headers are inconsistent.

Evidence:

```text
Local buildAlternates() direct check:
zh alternate: zh-Hans
x-default: https://skorly.cc/id/...

Local production HTML/Link header from http://localhost:3100:
hreflang="zh" appears instead of zh-Hans
x-default on /id/artikel/... points to http://localhost:3100/artikel/...
x-default on /id/skor-langsung points to http://localhost:3100/skor-langsung
x-default on /id home points to http://localhost:3100/

Production article sample:
x-default: https://skorly.cc/artikel/news-10...
zh alternate label: zh

Production sitemap.xml sample:
xhtml alternates include zh-Hans and x-default /id/... paths
```

Impact:

- Search engines receive different hreflang signals depending on whether they read the sitemap or rendered page metadata.
- The rendered `x-default` URL can point to a locale-less path that redirects, while canonical remains locale-specific.
- This is not P1 because canonical URLs and sitemap alternates are still mostly usable, but it is a real SEO consistency issue.

Fix direction:

- Inspect how Next metadata serializes `alternates.languages`, especially the `x-default` key and `zh-Hans` key.
- Ensure rendered page metadata, response `Link` headers, and sitemap `xhtml:link` entries use the same locale tags and final URLs.
- Passing criterion: representative home, score, article, match, and team pages render `zh-Hans` and `x-default=https://skorly.cc/id/...` without redirecting intermediate URLs.

### P2-10 PWA manifest uses a non-square OG image as an app icon

Status 2026-06-03 full-system review:

- Open.
- Not blocking because the SVG icon entries return 200, but the manifest includes an invalid-quality app-icon candidate.

Evidence:

```text
apps/web/app/manifest.ts
icons include:
{ src: "/og.png", sizes: "1200x630", type: "image/png", purpose: "any" }

apps/web/public/og.png
PNG image data, 1200 x 630

Production /manifest.webmanifest
icons returned 200:
/icon.svg
/icon.svg purpose=maskable
/og.png sizes=1200x630 purpose=any
```

Impact:

- A 1200x630 Open Graph image is not a proper PWA install icon.
- Some clients may ignore it; others may display an awkward crop or choose a lower-quality icon.

Fix direction:

- Remove `/og.png` from manifest icons.
- Add real square PNG icon sizes such as `192x192` and `512x512`; keep a proper maskable icon if needed.
- Re-run manifest fetch and icon dimension checks.

### P2-11 Compact notification bell has no useful accessible name

Status 2026-06-03 full-system review:

- Open.

Evidence:

```text
apps/web/components/site-header.tsx
<NotifyBell compact />

apps/web/components/notify-bell.tsx
subscribed compact button visible text: "🔔"
idle compact button visible text: "🔔"
no aria-label or title is set on those compact buttons
```

Impact:

- Screen readers and accessibility tooling see the compact control as an emoji-only button.
- Sighted users can infer the control, but keyboard/screen-reader users do not get a localized action label.

Fix direction:

- Add localized `aria-label` and `title` values for compact notification buttons.
- Verify the accessible name for idle, busy, subscribed, and denied states.

## P1/P2 Gate Verification

Status 2026-06-03:

- P1 and P2 fixes are complete on branch `codex/p1-p2-review-fixes`.
- Root lint, root typecheck, and `@skorly/web` typecheck passed after the fixes.
- A full production build passed after the code changes before this document-only update.
- Latest full-system production review found new open issues after those fixes: P0-5, P1-5, P1-6, and P2-8.
- Continued full-system production review added/expanded open issues: P1-7, P1-8, P2-1 reopened, P2-9, P2-10, and P2-11.
- Therefore the P1/P2 code-fix batch can be considered locally green, but the whole production system cannot be considered fully verified yet.

Verification 2026-06-03:

```text
pnpm lint
> skorly@0.1.0 lint /Users/johnmacmini/workspace/Football site
> pnpm -r lint

Scope: 9 of 10 workspace projects
apps/web lint$ eslint .
apps/web lint: Done
Exit status: 0

pnpm typecheck
packages/types typecheck: Done
packages/predict-model typecheck: Done
packages/ui typecheck: Done
packages/api-football typecheck: Done
packages/ai-content typecheck: Done
packages/db typecheck: Done
packages/news typecheck: Done
apps/web typecheck: Done
apps/jobs typecheck: Done
Exit status: 0

pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site/apps/web
> tsc --noEmit
Exit status: 0

pnpm build
✓ Generating static pages using 3 workers (1890/1890) in 4.1min
Exit status: 0
```

Latest full-system gate recheck 2026-06-03:

```text
pnpm typecheck
apps/web typecheck: Done
apps/jobs typecheck: Done
Exit status: 0

pnpm lint
apps/web lint: Done
Exit status: 0

pnpm build
✓ Compiled successfully in 10.1s
Finished TypeScript in 2.6s ...
✓ Generating static pages using 3 workers (1890/1890) in 4.0min
Exit status: 0

pnpm --filter @skorly/api-football test
✓ src/client.test.ts (2 tests)
Exit status: 0
```

Production deployment verification 2026-06-04:

```text
GitHub Actions run:
https://github.com/john-hoe/skorly-web/actions/runs/26933296887

Checkout:
fetch origin +30a360c155512a742bc40da0a7d2c5b71908bffb:refs/remotes/origin/main

Build:
Next.js 16.2.6
Compiled successfully in 6.7s
Finished TypeScript in 7.8s
Generating static pages using 3 workers (1921/1921) in 63s

Deploy:
Uploaded 1655 files (384 already uploaded) (23.34 sec)
Total Upload: 14890.50 KiB / gzip: 2864.92 KiB
Worker Startup Time: 29 ms
Uploaded skorly-web (33.16 sec)
Deployed skorly-web triggers (1.20 sec)
Current Version ID: aa2d3874-62a7-45a3-be86-4e026754942d
```

## Verified Working Areas

- API-Football package tests passed: 2 tests.
- Public page templates mostly render with data.
- Archive filters work.
- Locale switcher works at route level.
- Bracket builder works for local/guest selection flow: final four -> finalists -> champion.
- SEO/PWA endpoints return 200:
  - `/og`
  - `/sitemap.xml`
  - `/news-sitemap.xml`
  - `/robots.txt`
  - `/manifest.webmanifest`
  - `/sw.js`
- Subscribe API validation normally rejects invalid input correctly:
  - bad JSON -> 400
  - missing Turnstile token -> 403 `captcha`
  - GET `/api/subscribe` -> 405
  - intermittent 503s are covered under P0-5 production Worker instability.
- Downloaded production AMP Web Story HTML passed local AMP validation:
  - `/id/cerita/mexico-vs-south-africa-20260611`
  - remote URL validation is unreliable until P0-5 is fixed because production can return transient Worker error HTML.

## Verified Failing

- Logged-in match prediction/forecast/comments client islands on `/id/pertandingan/mexico-vs-south-africa-20260611`: fail in production because Server Action POSTs return Worker 500/hung.
- Logged-in bracket save on `/id/prediksi`: UI enables save, but production save returns `Terjadi kesalahan. Silakan coba lagi.` and `wrangler tail` shows Server Action 500/hung.
- Logged-in `/id/liga`: intermittently renders Cloudflare Worker 1101; `wrangler tail` confirms `GET /id/liga` status 500/hung for Ray ID `a05f8e2e3f588c59`.
- Public live-score client refresh on `/zh/shishi-bifen`: Server Action POST returns Worker 500/hung.
- Public dynamic live-score and World Cup hub first-load latency: 10s-class production responses on sampled locales.
- Mobile header: horizontal overflow on 390px viewport across most ID/VI/EN core pages.
- Footer legal links: `/privacy` -> `/id/privacy` -> 404 and `/terms` -> `/id/terms` -> 404.
- Production `news-sitemap.xml`: stale cache/output contains entries older than 48 hours, while local current code is clean.
- Indonesian article/list pages: production-visible summaries and meta descriptions still include English text; P2-1 is reopened.
- Rendered hreflang metadata: page HTML/Link headers output `zh` and locale-less `x-default` URLs, while sitemap alternates output `zh-Hans` and `/id/...`.
- PWA manifest: includes `/og.png` as a 1200x630 app icon candidate.
- Compact notification bell: emoji-only button has no localized accessible name.

## Still Not Fully Verified

These still require valid Turnstile, notification permission, external email delivery, or a stable post-P0-5 production runtime:

- Saving predictions as logged-in user.
- Creating/joining mini leagues after `/id/liga` is stable.
- Posting/liking/reporting comments.
- Successful subscribe double opt-in email delivery.
- Web Push subscription.
- Real email verification is currently verified fixed for the prior fresh-token test, but should be re-run after any auth/runtime deployment that changes callback/session behavior.

## Recommended Workflow

Use local document first, GitHub second.

1. Fix P0 items in a dedicated session.
2. Re-run:

```bash
pnpm --filter @skorly/web typecheck
pnpm typecheck
pnpm --filter @skorly/api-football test
pnpm build
```

3. After P0 is clean, create GitHub issues or PR checklist for remaining P1/P2 items.
4. Do not open one GitHub issue per symptom before root causes are deduplicated. For example, build timeout, detail-page latency, and SSG query pressure may share one root cause.

## Suggested Prompt For Fix Session

```text
Read docs/review/review-findings-2026-06-03.md. The current open top-priority issue is P0-5: production Cloudflare Worker hangs on Next Server Actions and logged-in modules. Fix only open P0 issues first. Do not work on P1/P2 until pnpm build, pnpm typecheck, pnpm lint, and Chrome production verification with wrangler tail all pass. Preserve unrelated working-tree changes. After each fix, update the doc with status and verification output.
```
