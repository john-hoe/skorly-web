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

### P1-6 Mobile header causes horizontal scrolling on core pages

Status 2026-06-04 follow-up:

- Fixed in code.
- The mobile header no longer renders the full desktop nav, notification bell, auth links, and locale switcher in one row.
- Below the `lg` breakpoint, the header now renders brand + auth action + a localized native `details` menu.
- The locale switcher and notification bell moved inside the mobile menu, eliminating the previously measured right-edge overflow from the inline locale buttons.

Relevant files:

- `apps/web/components/site-header.tsx`
- `apps/web/messages/en.json`
- `apps/web/messages/id.json`
- `apps/web/messages/vi.json`
- `apps/web/messages/zh.json`

Verification 2026-06-04:

```text
Message catalog parse
messages ok

SSR HTML check against local production server:
curl -s http://127.0.0.1:3100/id
{"status":"html-read","hasHeader":true,"hasMobileDetails":true,"hasMenu":true,"hasDesktopLgNav":true,"hasLocaleSwitcher":true,"hasLogin":true}

Browser verification note:
- In-app Browser blocked http://localhost:3100 and http://127.0.0.1:3100 with ERR_BLOCKED_BY_CLIENT.
- After restarting the local production server from the final build, the same Browser surface loaded http://127.0.0.1:3100/id as an internal "This page couldn't load" error page while still reporting the page title.
- System Chrome / Playwright also hit local browser-surface failures; the Playwright bundled headless shell exited on launch with TargetClosedError.
- Browser screenshots were not used as passing evidence.

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

### P2-8 Logged-in users can still open login/register pages

Status 2026-06-04 follow-up:

- Fixed in code.
- `/[locale]/masuk` and `/[locale]/daftar` now call the existing server-side Supabase auth helper.
- If `getSessionUser()` returns a verified user, both pages redirect locale-aware to `/akun`.
- Unauthenticated users still receive the login/register forms.

Relevant files:

- `apps/web/app/[locale]/masuk/page.tsx`
- `apps/web/app/[locale]/daftar/page.tsx`
- `apps/web/lib/supabase/server.ts`

Verification 2026-06-04:

```text
Supabase current docs check:
- Current SSR guidance uses @supabase/ssr with cookies for server-side auth.
- Current docs state getUser() returns an up-to-date user record from the Auth server, while getSession() should not be trusted by itself for server authorization.
- This fix reuses the existing getSessionUser() helper, which wraps supabase.auth.getUser().

Unauthenticated local production check:
/id/masuk 200
/id/daftar 200

Build route classification:
├ ƒ /[locale]/daftar
├ ƒ /[locale]/masuk

Authenticated redirect still requires a real browser session after deploy:
- Passing criterion: authenticated production Chrome visit to https://skorly.cc/id/masuk and https://skorly.cc/id/daftar redirects to /id/akun.

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
```

## P1/P2 Gate Verification

Status 2026-06-04 follow-up:

- P1-6 and P2-8 follow-up fixes are locally green on branch `codex/mobile-auth-followups`.
- Root lint, root typecheck, `@skorly/web` typecheck, and root build passed.
- Local production server was started with the existing private `.env` from the main workspace only for verification; no env values were printed or committed.

Verification 2026-06-04:

```text
pnpm --filter @skorly/web typecheck
> @skorly/web@0.1.0 typecheck /Users/johnmacmini/workspace/Football site-deploy/apps/web
> tsc --noEmit
Exit status: 0

pnpm --filter @skorly/web lint
> @skorly/web@0.1.0 lint /Users/johnmacmini/workspace/Football site-deploy/apps/web
> eslint .
Exit status: 0

pnpm typecheck
Scope: 9 of 10 workspace projects
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

pnpm lint
Scope: 9 of 10 workspace projects
apps/web lint: Done
Exit status: 0

pnpm build
✓ Compiled successfully in 8.4s
Finished TypeScript in 2.7s
✓ Generating static pages using 3 workers (95/95) in 243ms
Exit status: 0

git diff --check
Exit status: 0

Production deployment verification 2026-06-04:
- Local Wrangler deploy attempted after merge, but failed with Cloudflare API `Authentication error [code: 10000]` from the local token. This was not marked as deployed.
- Existing GitHub Actions `Daily News` workflow was dispatched with `count=0` and `skip_radar=true`, so it skipped radar and produced no new news before build/deploy.
- A scheduled older run on `88fc1ea44fc8369102d65e60c28e0c5fbd0860d2` was already in progress and finished first. The follow-up deployment run below then deployed app commit `30a360c155512a742bc40da0a7d2c5b71908bffb`.

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

Production HTTP SEO/auth smoke:
https://skorly.cc/id
status=200 canonical=true hreflang=5 jsonLd=true h1=1 noindex=false
warm repeat timings: 918ms, 713ms, 720ms, 705ms

https://skorly.cc/id/tim
status=200 canonical=true hreflang=5 jsonLd=true h1=1 noindex=false ttfb=517ms

https://skorly.cc/id/pertandingan/mexico-vs-south-africa-20260611
status=200 canonical=true hreflang=5 jsonLd=true h1=1 noindex=false ttfb=421ms

https://skorly.cc/id/masuk
status=200 noindex=true h1=1

https://skorly.cc/id/daftar
status=200 noindex=true h1=1
```
```

Status 2026-06-03:

- P1 and P2 fixes are complete on branch `codex/p1-p2-review-fixes`.
- Root lint, root typecheck, and `@skorly/web` typecheck passed after the fixes.
- A full production build passed after the code changes before this document-only update.

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

## Verified Working Areas

- API-Football package tests passed: 2 tests.
- Public page templates mostly render with data.
- Archive filters work.
- Locale switcher works at route level.
- Bracket builder works for guest selection flow: final four -> finalists -> champion -> login-to-save.
- SEO/PWA endpoints return 200:
  - `/og`
  - `/sitemap.xml`
  - `/news-sitemap.xml`
  - `/robots.txt`
  - `/manifest.webmanifest`
  - `/sw.js`
- Subscribe API validation rejects invalid input correctly.

## Not Fully Verified

These require real auth/session, valid Turnstile, notification permission, or external email delivery:

- Saving predictions as logged-in user.
- Saving bracket as logged-in user.
- Creating/joining mini leagues.
- Posting/liking/reporting comments.
- Successful subscribe double opt-in email delivery.
- Web Push subscription.
- Real email verification with a fresh Supabase confirmation link after Dashboard config is corrected.

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
Read docs/review-findings-2026-06-03.md. Fix only P0 issues first. Do not work on P1/P2 until pnpm build, pnpm typecheck, and @skorly/web typecheck pass. Preserve unrelated working-tree changes. After each fix, update the doc with status and verification output.
```
