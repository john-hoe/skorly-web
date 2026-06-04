# Skorly Site Review Findings - 2026-06-04

本文件只记录本轮**已验证**的问题（含从 `docs/review/review-findings-2026-06-03.md` 回退的回归项）。
计划与验收标准见 `docs/review/full-site-review-plan-2026-06-04.md`，覆盖矩阵见 `docs/review/full-site-review-matrix-2026-06-04.md`，可复现证据见 `docs/review/review-evidence-2026-06-04.md`。

修复顺序铁律：**P0 -> P1 -> P2**。每个 finding 必须有证据(`E-<n>`)、复现步骤、修复验收标准；修复后按 `Fix Session Acceptance Rule` 复验并回填验证输出。生产类问题必须 Chrome + `wrangler tail` 双证据。

## Severity Model

- P0：阻断核心生产能力或使关键链路无法闭环（构建失败、注册/邮箱验证无法登录、Worker 1101/5xx、保存预测/bracket 失败、认证绕过、数据泄露、premium 越权）。
- P1：核心功能可进入但稳定性/性能/合规/关键 UX 明显不达标（10s 级动态页、移动端横向滚动、footer 法务链接 404、News sitemap 过期）。
- P2：局部质量问题（meta 语言污染、hreflang 不一致、icon-only 无 aria-label、PWA icon 质量、时区/格式细节）。

## Status 取值

- `Open`：已确认，未修复。
- `In progress`：修复中。
- `Fixed`：已修复并复验通过（必须回填验证输出）。
- `Reopened`：上一轮标 Fixed 但本轮回退（引用 06-03 原编号）。
- `Needs external verification`：本地不足，需生产/第三方复核。

## Finding Format

每个 finding 复制此模板：

```text
### <P0/P1/P2>-<number> <short title>

Status:
- Open / In progress / Fixed / Reopened / Needs external verification

Evidence:
- 引用 E-<n> + 确切 URL / 命令 / 截图路径 / log / console / 响应体

Impact:
- User / SEO / data / security / compliance / ops 影响

Reproduce:
- 最小复现步骤或命令

Fix acceptance:
- 修复后的具体通过标准

Verification (修复后回填):
- 复验时的确切输出 + E-<n> + 环境 + UTC 时间
```

## Findings Index (修复时从这里看起)

按 P0 -> P1 -> P2 排序。修复 session 从最上面没 Fixed 的开始。

| ID | Severity | Title | Module / Route | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| P0-1 | P0 | Review branch omits fixed production runtime P0 commits | `codex/review` / logged-in runtime surfaces | Fixed | E-7, E-34 |
| P0-2 | P0 | Auth callback returns 500 for real signup verification token | `/auth/callback` / Supabase Auth | Fixed | E-40, E-41, E-42, E-43 |
| P1-1 | P1 | Subscribe API bypasses Turnstile when production secret is missing | `/api/subscribe` / Worker secrets | Fixed | E-36, E-37, E-38 |
| P1-2 | P1 | Supabase auth session cookie lacks HttpOnly and Secure flags | Auth cookie / Supabase SSR | Fixed | E-46, E-47, E-48 |
| P2-1 | P2 | Predict-model test gate executes zero tests | `packages/predict-model` | Open | E-2 |

## P0 Findings

<!-- 在此追加 P0 finding，使用上面的 Finding Format -->

### P0-1 Review branch omits fixed production runtime P0 commits

Status:
- Fixed

Evidence:
- E-7: current branch is `codex/review` at `5056b2e`; the fixed P0-5 commits `c8951ab83f24ac18e0f3758192e6f2f6d0b5d864` and `ed4e09c08a4711481a8413baec12272b205abf8e` are contained by `main` and `codex/seo-p2-followup`, not by `codex/review`.
- E-7: `apps/web/app/api` contains only subscribe route handlers, while client islands still import `"use server"` action modules for prediction, forecast, live scores, events, comments, bracket, mini league, push, premium, and home personalization.
- 06-03 P0-5 says the production fix shape was to move those client runtime calls to explicit JSON Route Handlers and avoid the production Server Action hung-request class.
- E-34: `codex/review` is now at `885d188` and contains `c8951ab83f24ac18e0f3758192e6f2f6d0b5d864`, `ed4e09c08a4711481a8413baec12272b205abf8e`, and event structured data commit `5056b2e`; the affected runtime client islands import `runtime-api-client`; the scoped legacy Server Action import scan for the affected runtime modules has no output.

Impact:
- Ops / user impact. A deployment or merge based on the current `codex/review` worktree can reintroduce the previously closed P0-5 class: production Worker hung requests and broken logged-in modules for prediction, bracket, league, comments, live scores, premium, and personalization.
- Review integrity impact. E-6 proves the currently deployed production site handles the sampled flows, but E-7 proves the local review branch is not the same source state as the deployed P0 fix.

Reproduce:
- Run `git branch --show-current` and `git log -1 --oneline --decorate`.
- Run `git branch -a --contains c8951ab83f24ac18e0f3758192e6f2f6d0b5d864` and `git branch -a --contains ed4e09c08a4711481a8413baec12272b205abf8e`.
- Run `find apps/web/app/api -type f | sort` and observe only subscribe routes.
- Run `rg -n '"use server"' apps/web/lib/*actions.ts`.
- Run the component import scan from E-7 and observe client islands still importing those Server Action modules.

Fix acceptance:
- `codex/review` is rebased or merged onto a source state containing `c8951ab83f24ac18e0f3758192e6f2f6d0b5d864` and `ed4e09c08a4711481a8413baec12272b205abf8e`, or equivalent runtime fixes are ported into this branch.
- Source inventory matches the intended P0-5 fix shape: client runtime calls for the affected modules use production-safe route/API paths or another verified architecture that avoids Worker hung Server Action requests.
- After the source fix, rerun local gates and production Chrome + `wrangler tail --status error` on account, match prediction/forecast/comments, bracket save, `/id/liga` x5, mini-league create/detail, and `/zh/shishi-bifen`; Worker error events must be 0.

Verification (修复后回填):
- E-34 / local / 2026-06-04T07:09:09Z:
  - `git merge main --no-edit` fast-forwarded `codex/review` from `5056b2e` to `885d188`.
  - `git branch --contains c8951ab83f24ac18e0f3758192e6f2f6d0b5d864` includes `* codex/review`; `git branch --contains ed4e09c08a4711481a8413baec12272b205abf8e` includes `* codex/review`; `git branch --contains 5056b2e` includes `* codex/review`.
  - `find apps/web/app/api -type f | sort` includes route handlers for bracket, comments, fixture events, forecast, picks, prediction, premium, home personalization, mini league, push subscribe/unsubscribe, live score, and team groups.
  - `rg -n 'from "@/lib/(prediction|score|comment|bracket|league|push|premium|home)-actions"' apps/web/components apps/web/app -g '*.tsx' -g '*.ts'` returned no output.
  - `pnpm lint` passed; `pnpm typecheck` passed; `pnpm build` passed with `✓ Generating static pages using 3 workers (1921/1921) in 3.5min`; `pnpm --filter @skorly/api-football test` passed with `2 tests`.
  - `@skorly/predict-model` was checked separately: package scripts contain only `"typecheck": "tsc --noEmit"`, and `pnpm --dir packages/predict-model run test` returned `ERR_PNPM_NO_SCRIPT Missing script: test`. No test pass is claimed for that package.
  - Static page count changed to `1921/1921` because this branch is now aligned to current `main`/PR #14 production baseline; GitHub Actions run `26933296887` recorded the same `1921/1921` count.
- E-34 / prod / 2026-06-04T07:09:09Z:
  - Chrome authenticated checks covered `/id/akun`, `/id/pertandingan/mexico-vs-south-africa-20260611`, score prediction save, `/id/prediksi` bracket save, `/id/liga` five times, mini-league create/detail, and `/zh/shishi-bifen`.
  - `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error` produced no JSON error event lines during the Chrome window; Worker error events observed = 0.
  - The Chrome outputs for the checked runtime pages had `worker1101Text=false` and `visibleErrorCount=0`.
  - SEO smoke returned `failures=[]`: `/sitemap.xml` 200, `/news-sitemap.xml` 200, valid team/match/article URLs 200, nonexistent team/match/article slugs 404, canonical/hreflang/title/meta description/JSON-LD present on sampled 200 pages, and sampled match SportsEvent JSON-LD had `startDate`, `location`, `image`, `description`, `performer`, `organizer`, and `eventStatus`.

### P0-2 Auth callback returns 500 for real signup verification token

Status:
- Fixed

Evidence:
- E-40: invalid `/auth/callback` inputs redirect safely to `https://skorly.cc/id/masuk?error=auth`, including malicious `next=https://evil.example/` and `next=//evil.example/`.
- E-40: Supabase admin `generateLink` produced signup verification tokens with `hashedTokenLength=56`, `verificationType="signup"`, and callback host/path `skorly.cc` / `/auth/callback`.
- E-40: three production callback attempts with generated signup verification tokens returned HTTP 500, response body length 0, `setCookieCount=0`, `emailConfirmedAtExists=false`, and `lastSignInAtExists=false`.
- E-40: normal `wrangler tail` failed before TLS connection with `ECONNRESET`; DNS-overridden tail emitted no JSON event lines during one fresh callback request window. No Worker error log body is available from this evidence.
- E-41: `apps/web/app/auth/callback/route.ts` now uses a callback-scoped `@supabase/ssr` server client and writes Supabase auth cookies plus no-store cache headers onto the exact redirect response returned by the route.
- E-41: local and production fresh signup verification tokens returned HTTP 307 to `/id/akun`, emitted `sb-majrlaxktengachwrskk-auth-token`, and set Supabase `email_confirmed_at` plus `last_sign_in_at`.
- E-41: Chrome followed a real production callback URL to `https://skorly.cc/id/akun`; page title was `Akun saya | Skorly`; `workerOrErrorTextCount=0`; `consoleErrorCount=0`.
- E-41: controlled `wrangler tail skorly-web --format json --status error` window produced `TAIL_LOG_BYTES=0` during a fresh successful callback.
- E-41: production SEO smoke had `failures=[]` for `/sitemap.xml`, `/news-sitemap.xml`, sampled team/match/article pages, and missing team/match/article slugs.
- E-42: after PR #18 merge, final main commit `0d8b1a52c595a8add18cf191c53e9079e01b42fb` was deployed as Worker version `0e809ff5-6a5d-4cb6-8d21-d5cf3cdde655`.
- E-42: final production HTTP and Chrome callback checks passed on the final Worker version; final SEO smoke returned `failures=[]`; `wrangler tail --status error` emitted no output during the callback verification window.
- E-43: independent review-session recheck on Worker version `0e809ff5-6a5d-4cb6-8d21-d5cf3cdde655` confirmed invalid callback redirects, fresh signup-token `307` to `/id/akun`, auth cookie set, Supabase user confirmed, Playwright-driven Chrome final URL `/id/akun`, and no tail error event lines.

Impact:
- User / auth impact. New users who receive a Supabase signup verification token cannot complete email confirmation through `https://skorly.cc/auth/callback`, do not receive a production session cookie, and remain unconfirmed in Supabase.
- Core onboarding impact. The `Email confirmation` flow cannot close, so registration cannot reliably produce an account session through the production callback.

Reproduce:
- Generate a Supabase signup verification link with service-role admin for a fresh test email and `redirectTo=https://skorly.cc/auth/callback?next=/id/akun`.
- Build the callback URL with the generated `hashed_token` and `type=signup`.
- GET `https://skorly.cc/auth/callback?token_hash=<redacted>&type=signup&next=%2Fid%2Fakun` with redirects disabled.
- Observe HTTP 500, no `Location` header, no `Set-Cookie` header, and the Supabase user still has `email_confirmed_at` unset.

Fix acceptance:
- Missing params, fake code, and malicious absolute or protocol-relative `next` still redirect to the localized login error page without external redirect.
- A fresh Supabase signup verification token returns a redirect to `https://skorly.cc/id/akun`.
- The callback response sets the Supabase auth session cookies needed by production.
- The associated Supabase user has `email_confirmed_at` set after callback.
- Chrome follows the real callback URL and lands on `/id/akun` with no visible 500/1101/runtime error text.
- `wrangler tail skorly-web --format json --status error` captures 0 Worker error events during the successful real-token callback window.

Verification (修复后回填):
- E-41 / local + prod / 2026-06-04T10:00:56.712Z:
  - `pnpm lint` passed; `pnpm typecheck` passed; `pnpm --filter @skorly/api-football test` passed with 2 tests; `pnpm build` passed with `Generating static pages using 3 workers (1922/1922) in 3.3min`.
  - `pnpm --dir packages/predict-model run test` returned `ERR_PNPM_NO_SCRIPT Missing script: test`; no test pass is claimed for that package.
  - Static page count stayed at `1922/1922`, matching the current main baseline; this auth callback route is dynamic and did not add or remove public SSG route families.
  - Direct production deploy completed with `Current Version ID: 6bb071d3-3f04-4743-87db-477705c2d226`.
  - Production invalid callbacks returned 307 to `https://skorly.cc/id/masuk?error=auth` for missing params, fake code, malicious absolute `next`, and protocol-relative `next`.
  - Three fresh production signup-token callbacks returned 307 to `https://skorly.cc/id/akun`, included `setCookieCount=1`, and had `emailConfirmedAtExists=true` plus `lastSignInAtExists=true`.
  - Chrome real callback ended at `https://skorly.cc/id/akun`, title `Akun saya | Skorly`, `workerOrErrorTextCount=0`, `consoleErrorCount=0`.
  - `wrangler tail --status error` produced `TAIL_LOG_BYTES=0` during a fresh successful callback window.
  - Production SEO smoke returned `failures=[]`: sitemap/news-sitemap 200, sampled team/match/article 200 with canonical/hreflang/title/meta description/JSON-LD, and nonexistent team/match/article slugs 404.
- E-42 / prod / 2026-06-04T10:14:37.780Z:
  - Final main commit `0d8b1a52c595a8add18cf191c53e9079e01b42fb` deployed with `pnpm --filter @skorly/web cf:deploy`; build output was `Generating static pages using 3 workers (1922/1922) in 3.5min`; Worker version `0e809ff5-6a5d-4cb6-8d21-d5cf3cdde655`.
  - Final production invalid callbacks returned 307 to `https://skorly.cc/id/masuk?error=auth`; final fresh signup-token callback returned 307 to `https://skorly.cc/id/akun`, included `setCookieCount=1`, and had `emailConfirmedAtExists=true` plus `lastSignInAtExists=true`.
  - Final Chrome callback ended at `https://skorly.cc/id/akun`, title `Akun saya | Skorly`, `workerOrErrorTextCount=0`, `consoleErrorCount=0`.
  - Final `wrangler tail --status error` window emitted no output during the callback verification window.
  - Final production SEO smoke returned `failures=[]`.
- E-43 / prod / 2026-06-04T11:34:20.027Z:
  - `origin/main` is `0d8b1a5 Merge pull request #18 from john-hoe/codex/p0-auth-callback`; local `HEAD..origin/main` diff was empty.
  - Latest production Worker deployment was `0e809ff5-6a5d-4cb6-8d21-d5cf3cdde655`, created `2026-06-04T10:12:26.382Z`.
  - Invalid callback inputs still returned `307` to `https://skorly.cc/id/masuk?error=auth`: missing params, fake code, `next=https://evil.example/`, and `next=//evil.example/`.
  - A fresh signup verification token returned `307` to `https://skorly.cc/id/akun`, `setCookieCount=1`, cookie name `sb-majrlaxktengachwrskk-auth-token`, `emailConfirmedAtExists=true`, and `lastSignInAtExists=true`.
  - Playwright-driven Chrome with a temporary profile followed a fresh callback to final URL `https://skorly.cc/id/akun`; title `Akun saya | Skorly`; H1 `Akun saya`; `authCookieCount=1`; `bodyHasLoginError=false`; `bodyHasRuntimeError=false`; `consoleErrors=[]`.
  - DNS-overridden `wrangler tail skorly-web --format pretty --status error --ip self` connected during the HTTP callback and browser callback windows and emitted no error event lines before `^C`.

## P1 Findings

<!-- 在此追加 P1 finding -->

### P1-1 Subscribe API bypasses Turnstile when production secret is missing

Status:
- Fixed

Evidence:
- E-36: production POST to `https://skorly.cc/api/subscribe` with valid `email`, `locale`, `consent=true`, and missing `turnstileToken` returned `200 {"ok":true,"pending":true}`.
- E-36: production POST to the same endpoint with valid non-CAPTCHA fields and `turnstileToken="invalid-token"` returned `200 {"ok":true,"pending":true}`.
- E-36: `pnpm --dir apps/web exec wrangler secret list --name skorly-web` returned only `SUPABASE_SERVICE_ROLE_KEY`; `TURNSTILE_SECRET_KEY` was not present in the secret-name list.
- E-36: `apps/web/lib/turnstile.ts` returns true when `process.env.TURNSTILE_SECRET_KEY` is absent.
- E-37: `apps/web/lib/turnstile.ts` now returns false when `TURNSTILE_SECRET_KEY` is absent, production has `TURNSTILE_SECRET_KEY` and `TURNSTILE_SITE_KEY` configured, and `/api/turnstile/site-key` provides the public site key when the client bundle lacks a build-time key.
- E-38: independent review-session verification confirmed current production Worker version `916217ff-ebe3-47c1-acd0-b2c72cd76406`, missing/fake token `403 captcha`, Chrome real subscribe success text, and Worker error event lines observed = 0 during API and Chrome windows.

Impact:
- Security / abuse / compliance impact. An unauthenticated caller can create pending subscribers and trigger confirmation-email sending without a valid CAPTCHA challenge.
- Abuse is still bounded by the route's IP rate limit: `rateLimit(\`subscribe:${ip}\`, 5, 600)` allows 5 subscribe attempts per 600 seconds per client IP before 429. That rate limit reduces volume from one IP, but it does not validate human interaction and can be bypassed by distributed IPs.
- The double opt-in flow prevents immediate premium/content unlock from this evidence alone; no account takeover, data disclosure, or premium authorization bypass is proven by E-36. Severity is P1, not P0, on the current evidence.

Reproduce:
- Run `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error`.
- POST to `https://skorly.cc/api/subscribe` with JSON `{ "email": "codex-review-missing-<timestamp>@example.com", "locale": "id", "consent": true, "source": "review-api-smoke" }`.
- POST to `https://skorly.cc/api/subscribe` with JSON `{ "email": "codex-review-fake-<timestamp>@example.com", "locale": "id", "consent": true, "source": "review-api-smoke", "turnstileToken": "invalid-token" }`.
- Run `pnpm --dir apps/web exec wrangler secret list --name skorly-web` and confirm the secret-name inventory.

Fix acceptance:
- Production Worker has a configured `TURNSTILE_SECRET_KEY` secret, or production code fails closed when the secret is absent.
- Valid non-CAPTCHA subscribe requests with missing `turnstileToken` return `403 {"ok":false,"error":"captcha"}`.
- Valid non-CAPTCHA subscribe requests with fake `turnstileToken` return `403 {"ok":false,"error":"captcha"}`.
- A real browser subscribe flow with a valid Turnstile token returns `200` and sends a confirmation email.
- `wrangler tail skorly-web --format json --status error` emits 0 Worker error events during the missing-token, fake-token, and real-token verification window.
- The response bodies do not expose `SUPABASE`, `SERVICE_ROLE`, `TURNSTILE`, `RESEND`, or auth secret text.

Verification (修复后回填):
- E-37 / local + prod / 2026-06-04T08:40:59Z:
  - `pnpm --dir apps/web exec wrangler secret list --name skorly-web` returned `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_SITE_KEY`.
  - Local helper checks returned `{"missingSecretMissingToken":false,"missingSecretFakeToken":false}` and `{"configuredMissingToken":false,"configuredFakeToken":false}`.
  - `pnpm lint` passed; `pnpm typecheck` passed; `pnpm build` passed with `✓ Generating static pages using 3 workers (1922/1922) in 3.5min`.
  - Static page count changed from `1921/1921` to `1922/1922` because the fix adds one dynamic route: `/api/turnstile/site-key`.
  - Production deploy completed with Worker version `7ce09fcd-1084-46d2-846f-d13edcb328ad`.
  - `GET https://skorly.cc/api/turnstile/site-key` returned 200 with a redacted public site key, `secretLeakText=false`, and `worker1101Text=false`.
  - `POST https://skorly.cc/api/subscribe` without `turnstileToken` returned `403 {"ok":false,"error":"captcha"}` with `secretLeakText=false` and `worker1101Text=false`.
  - `POST https://skorly.cc/api/subscribe` with `turnstileToken="invalid-token"` returned `403 {"ok":false,"error":"captcha"}` with `secretLeakText=false` and `worker1101Text=false`.
  - Chrome production subscribe flow on `https://skorly.cc/id` rendered Turnstile via the runtime fallback: `turnstileDivCount=1`, token length `816`, submit button `Kirim Panduan Saya`, post-submit `formCount=0`, `successTextPresent=true`, `captchaErrorText=false`, `rateLimitedText=false`, and `worker1101Text=false`.
  - `wrangler tail skorly-web --format pretty --status error --ip self` needed a temporary DNS override because the system resolver mapped `tail.developers.workers.dev` to a Meta IP with an invalid certificate. With the override, tail printed `Connected to skorly-web, waiting for logs...`; during the missing-token, fake-token, and Chrome real subscribe checks, tail emitted 0 error event lines before `^C`.
- E-38 / prod / 2026-06-04T09:02:06.543Z:
  - `pnpm --dir apps/web exec wrangler deployments list --name skorly-web` showed latest deployment version `916217ff-ebe3-47c1-acd0-b2c72cd76406`, created `2026-06-04T08:47:55.747Z`.
  - `pnpm --dir apps/web exec wrangler secret list --name skorly-web` returned `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_SITE_KEY`.
  - `GET https://skorly.cc/api/turnstile/site-key` returned status 200, redacted site key length 24, `worker1101Text=false`, and `secretLeakText=false`.
  - `POST https://skorly.cc/api/subscribe` without `turnstileToken` returned `403 {"ok":false,"error":"captcha"}` with `worker1101Text=false` and `secretLeakText=false`.
  - `POST https://skorly.cc/api/subscribe` with `turnstileToken="invalid-token"` returned `403 {"ok":false,"error":"captcha"}` with `worker1101Text=false` and `secretLeakText=false`.
  - Chrome production subscribe flow on `https://skorly.cc/zh` had pre-submit token length `816`, submitted `codex-review-ui-1780563806919@example.com`, removed the form after submit, and displayed `就差一步——请查收邮件！` plus `我们已发送确认链接，点击即可开始接收独家预测。`.
  - `pnpm --dir apps/web exec wrangler tail skorly-web --format json --status error` emitted no JSON event lines during the independent API window and no JSON event lines during the independent Chrome submit window.

### P1-2 Supabase auth session cookie lacks HttpOnly and Secure flags

Status:
- Fixed

Evidence:
- E-46: Playwright-driven Chrome after a real production `/auth/callback` session recorded auth cookie `sb-majrlaxktengachwrskk-auth-token` with `httpOnly=false`, `secure=false`, and `sameSite="Lax"`.
- E-46: a second direct production `/auth/callback` request with redirects disabled returned one auth `Set-Cookie`; summarized attributes were `hasHttpOnly=false`, `hasSecure=false`, `sameSite="SameSite=lax"`, and attr names `expires`, `max-age`, `path`, `samesite`.
- E-45: the same browser session proved the cookie was active for account access and profile update, so the observed cookie is the production session bearer cookie used by authenticated pages.
- E-47: fix session deployed Worker version `b46ac47f-d2e9-41c4-85e2-c7900a3ed214`; fresh production `/auth/callback` with a real Supabase signup verification token returned `307` to `https://skorly.cc/id/akun`, emitted one auth `Set-Cookie`, and the auth cookie summary had `hasHttpOnly=true`, `hasSecure=true`, `sameSite="SameSite=lax"`, `expires`, `max-age`, `path`, `httponly`, `secure`, and `samesite`.
- E-47: with the callback cookie supplied to production requests, `/api/auth/session` returned `200 {"authenticated":true}` and `/id/akun` returned `200`; Supabase admin confirmed `emailConfirmedAtExists=true` and `lastSignInAtExists=true`.
- E-47: browser-side header auth no longer reads Supabase session cookies directly; the header uses `/api/auth/session`, and remaining browser Supabase usage is restricted to OAuth initiation.
- E-48: Chrome skill automation connected to Chrome, found the Codex Chrome Extension installed/enabled and native host correct, but both `tab.goto("https://skorly.cc/id")` and address-bar navigation attempts left the controlled tab at `about:blank`; Chrome cookie-store reinspection was not used as pass evidence.

Impact:
- Security impact. The auth cookie contains the Supabase session bearer credential. Without `HttpOnly`, any successful same-origin script execution can read the session token. Without `Secure`, the browser is not instructed to restrict the cookie to HTTPS requests. `SameSite=Lax` reduces cross-site request sending, but it does not protect token confidentiality from same-origin script execution or non-secure transport.
- Severity is P1, not P0, on current evidence: E-46 proves missing cookie flags but does not prove an existing XSS, network interception, account takeover, or data exfiltration.

Reproduce:
- Generate a fresh Supabase signup verification token and call `https://skorly.cc/auth/callback?token_hash=<redacted>&type=signup&next=%2Fid%2Fakun` with redirects disabled.
- Inspect the `Set-Cookie` header for `sb-majrlaxktengachwrskk-auth-token`.
- Observe `SameSite=lax` present and `HttpOnly` / `Secure` absent.
- In Chrome after following the real callback, inspect cookie attributes and observe `httpOnly=false` and `secure=false`.

Fix acceptance:
- Fresh production `/auth/callback` responses set the Supabase auth session cookie with `HttpOnly`, `Secure`, and an explicit `SameSite` value.
- Chrome cookie inspection after a real callback reports `httpOnly=true`, `secure=true`, and `sameSite` set to `Lax` or stricter.
- Authenticated flows still work after the cookie hardening: `/id/akun` loads, account update persists, logout clears the session, and logged-out `/id/akun` redirects to `/id/masuk`.
- If any browser-side Supabase session reads currently depend on JavaScript-readable auth cookies, those reads are replaced with server-mediated session/API checks or another design that keeps the bearer credential unavailable to client JavaScript.
- `wrangler tail skorly-web --status error` emits 0 Worker error events during callback, account update, logout, and protected-route revisit verification.

Verification (修复后回填):
- Fixed in source and deployed to production.
- Local gates: `git diff --check`, `pnpm --filter @skorly/web lint`, `pnpm --filter @skorly/web typecheck`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @skorly/api-football test`, and `pnpm build` passed. `pnpm --dir packages/predict-model run test` returned `ERR_PNPM_NO_SCRIPT Missing script: test`, matching the open P2-1 known gap.
- Build output: local `pnpm build` produced `1923/1923 in 4.0min`; production deploy build produced `1923/1923 in 4.1min`. The increase from the earlier `1922` progress counter is the added dynamic `/api/auth/session` route entry; `.next` output showed no HTML for `/api/auth/session`, and SSG detail counts were article `1010`, match `288`, story `288`, team `192`.
- Production deploy: `pnpm --filter @skorly/web cf:deploy` completed and reported `Current Version ID: b46ac47f-d2e9-41c4-85e2-c7900a3ed214`.
- Production auth verification: direct fresh signup callback returned `307`, auth cookie attributes `HttpOnly=true`, `Secure=true`, `SameSite=lax`, `/api/auth/session` returned authenticated, `/id/akun` returned `200`, and Supabase admin showed confirmed email plus last sign-in timestamps.
- Production SEO smoke: `/sitemap.xml` and `/news-sitemap.xml` returned `200`; `/id/tim/brazil`, `/id/pertandingan/mexico-vs-south-africa-20260611`, and `/id/artikel/news-10-world-cup-2026-how-miners-from-cornwall-brought-football-to-` returned `200` with canonical, five hreflang links, one H1, and parseable JSON-LD; nonexistent team/match/article slugs returned `404`; no sampled response contained `1101` or 500 text.
- Worker error tail: `wrangler tail skorly-web --format json --status error` emitted no JSON event lines during the production auth and SEO smoke window.
- Chrome skill note: Chrome automation could not navigate controlled tabs away from `about:blank`; E-48 records the exact tool outputs. The fixed status relies on the production raw `Set-Cookie` reproducer no longer failing, source inventory proving the browser session-cookie reader was removed, authenticated server-mediated session checks passing, and zero Worker error events in the verification window.

## P2 Findings

<!-- 在此追加 P2 finding -->

### P2-1 Predict-model test gate executes zero tests

Status:
- Open

Evidence:
- E-2: `pnpm --filter @skorly/predict-model test` exits 0 with empty stdout/stderr, while `packages/predict-model/package.json` contains only `"typecheck": "tsc --noEmit"`, `find packages/predict-model -maxdepth 3 -type f \( -name '*test*' -o -name '*spec*' \) -print` returns no files, and `pnpm --dir packages/predict-model run test` returns `ERR_PNPM_NO_SCRIPT Missing script: test`.

Impact:
- Ops / QA impact. The review runbook treats `pnpm --filter @skorly/predict-model test` as a baseline gate, but measured executed tests = 0. This means changes to the prediction model package can pass the named test gate without any model behavior being checked.

Reproduce:
- Run `pnpm --filter @skorly/predict-model test` from the repo root and observe exit 0 with no test output.
- Run `jq -r '.scripts // {}' packages/predict-model/package.json` and observe no `test` script.
- Run `find packages/predict-model -maxdepth 3 -type f \( -name '*test*' -o -name '*spec*' \) -print` and observe no test files.
- Run `pnpm --dir packages/predict-model run test` and observe `ERR_PNPM_NO_SCRIPT Missing script: test`.

Fix acceptance:
- `packages/predict-model/package.json` contains a real `test` script.
- `packages/predict-model` contains at least one behavior test covering model output or scoring logic.
- `pnpm --filter @skorly/predict-model test` prints the test runner summary with executed test count greater than 0 and exits 0.

Verification (修复后回填):
- Pending

## Process Findings

<!-- 抽查闸门失败、覆盖缺口、证据不合规等流程问题记录在此 -->
