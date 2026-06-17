# Button UI Click Matrix - 2026-06-06

This matrix executes `docs/review/button-ui-click-review-plan-2026-06-06.md`.

Review mode: review-only. Do not change business code from this matrix.

Inventory source evidence:

- `E-122`: static source scan + production DOM crawl inventory baseline.
- `E-121`: current production external-condition gates for live data, recap embeds, YouTube-as-embed, and saved-prediction share.

Status values: `Pending`, `Pass`, `Fail`, `Needs external verification`, `Blocked`, `Skipped by design`.

## Scope Notes

- Audit unit = component/file + route pattern + persona + state + viewport + expected side effect.
- Repeated list/card links are grouped when component and route pattern are equivalent; samples must cover at least 3 items per route pattern during execution.
- Third-party share pages are checked to the safe boundary: generated URL, target, rel, and request intent. Do not publish externally.
- Current production has 72 scheduled fixtures, 0 live fixtures, 0 finished fixtures, 0 fixture events, 0 recap embeds, and 0 YouTube URLs in `article.embeds` per E-130.
- E-130 recorded that `origin/main` had `ShareButtons` callsites for ranking, league invite, and saved match prediction only. E-131 adds the article detail `ShareButtons` callsite and closes B-051 / P2-10.
- E-133 closes B-013, B-033, B-048, B-049, and B-050 on an isolated review/staging seed deploy. These rows are **not** production-pass rows; production still lacks the required live/finished/embed states from E-130.
- E-134 attempted the deterministic >=20% regression sample. E-135 closes the B-020 / P2-11 AMP Story runtime failure on production. E-137 recloses B-042 with a fresh real-Chrome/real-Turnstile post, reply, cancel rerun, and version-pinned production Worker tail with `0` JSON error event lines. The deterministic sample gate is closed by composite evidence: 9 E-134 pass rows + B-020 E-135 + B-042 E-137 = 11/11 sampled rows, or 21.6% of the 51 terminal rows.

## Matrix

| ID | Component/File | Route(s) | Persona | State | Viewport | Control / Accessible Name | Risk | Expected Result | Verification Mode | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B-001 | `site-header.tsx` | all core pages | guest/logged-in | idle | mobile+desktop | `Skorly` logo link | T0 | Navigates to localized home without error or overflow | Real click | Pass | E-123 |
| B-002 | `site-header.tsx` | all core pages | guest/logged-in | desktop nav | desktop | Desktop nav links: scores, world cup, schedule, teams, news, archive, ranking, league | T0 | Each link lands on localized 200 route; current page context is not corrupted | Real click + sampled href check | Pass | E-123 |
| B-003 | `site-header.tsx` | all core pages | guest/logged-in | mobile nav closed/open | mobile | `Menu` summary toggle | T0 | Opens/closes menu; menu remains within viewport; no horizontal overflow | Real click + keyboard activation | Pass | E-123 |
| B-004 | `site-header.tsx` | all core pages | guest/logged-in | mobile nav open | mobile | Mobile menu nav links | T0 | Sampled links navigate to localized 200 routes; menu links have usable tap targets | Real click | Pass | E-123 |
| B-005 | `header-auth.tsx` | all core pages | guest | signed out | mobile+desktop | mobile `Masuk`; desktop `Masuk`, `Daftar` | T0 | Visible auth links navigate to login/register routes; mobile `Daftar` is hidden by current layout | Real click | Pass | E-125 |
| B-006 | `header-auth.tsx` / `sign-out-button.tsx` | `/id/akun` | logged-in | signed in | mobile+desktop | sign-out button | T2 | Session clears; protected route redirects to login; no Worker error | Real click + tail | Pass | E-44, E-49, E-126 |
| B-007 | `locale-switcher.tsx` | public route samples | guest | locale switch | mobile+desktop | `ID`, `VI`, `EN`, `中文` | T1 | Non-current locale navigates to equivalent localized route; current locale disabled | Real click | Pass | E-123 |
| B-008 | `site-footer.tsx` | all core pages | guest | idle | mobile+desktop | footer nav/legal/mailto links | T0/T3 | Internal links return expected pages; mailto is safe external boundary | Real click + href-only for mailto | Pass | E-124 |
| B-009 | `analytics-provider.tsx` | any public route | guest | no consent | mobile+desktop | `Tolak` | T1 | Banner dismisses; consent stored as denied; analytics scripts/requests remain absent | Real click + storage/network | Pass | E-123 |
| B-010 | `analytics-provider.tsx` | any public route | guest | no consent | mobile+desktop | `Izinkan analitik` | T1/T3 | Banner dismisses; GA loads only after consent; no CSP error | Real click + network | Pass | E-123 |
| B-011 | `page.tsx` home | `/id` | guest | idle | mobile+desktop | hero/home CTA links | T0 | CTA links navigate to intended localized pages | Real click | Pass | E-124 |
| B-012 | `match-card.tsx` / `article-card.tsx` / `team-badge.tsx` | home/list pages | guest | sampled cards | mobile+desktop | match, article, team, story card links | T0 | At least 3 sampled cards per route pattern open 200 target pages | Real click + sampled href check | Pass | E-124 |
| B-013 | `skor/page.tsx` / `score-row.tsx` | `/id/skor-langsung` | guest | staging live/result seed | mobile+desktop | score/result row links | T0 | Existing result rows navigate to match pages; live-only rows wait for live fixture state | Real click on staging seed | Pass on staging seed | E-130, E-133 |
| B-014 | schedule page | `/id/jadwal` | guest | scheduled fixtures | mobile+desktop | schedule match card links | T0 | Sampled fixtures open match detail pages with 200 status | Real click | Pass | E-124 |
| B-015 | teams page | `/id/tim` | guest | team grid | mobile+desktop | team links | T0 | Sampled teams open team detail pages with 200 status | Real click | Pass | E-124 |
| B-016 | team detail page | `/id/tim/brazil` | guest | idle | mobile+desktop | team fixture links; current source has no team article section | T0 | Sampled fixture links navigate to match pages without overflow | Real click + source boundary | Pass | E-124 |
| B-017 | `article-grid.tsx` | `/id/berita`, `/id/arsip` | guest | article list | mobile+desktop | article card links | T0 | Sampled article links open 200 detail pages | Real click | Pass | E-124 |
| B-018 | `article-grid.tsx` | `/id/berita`, `/id/arsip` | guest | filters | mobile+desktop | filter tab buttons | T1 | Filter changes rendered list; `aria-pressed` updates | Real click | Pass | E-124 |
| B-019 | `article-grid.tsx` | `/id/berita`, `/id/arsip` | guest | list has more items | mobile+desktop | load-more button | T1 | Visible item count increases; no layout overflow | Real click | Pass | E-124 |
| B-020 | web stories page | `/id/cerita` | guest | story list | mobile+desktop | story card links | T0 | Sampled story link opens AMP story URL with 200 and no story runtime exception | Real click + HTTP status + page errors | Pass | E-124, E-134, E-135 |
| B-021 | watch page | `/id/nonton` | guest | broadcaster list | mobile+desktop | broadcaster external links | T3 | Hrefs point to legal/public destinations; `_blank`/`noopener` boundary holds | Href-only safe boundary | Pass | E-124 |
| B-022 | `share-buttons.tsx` | `/id/peringkat` | guest | ranking share | mobile+desktop | native share, WhatsApp, X, Facebook, Telegram, copy | T3 | Share URLs are deterministic; targets/rel safe; copy writes ranking URL; no external publish | Real click to safe boundary | Pass | E-118, E-125 |
| B-023 | world-cup page | `/id/piala-dunia-2026` | guest | group links | mobile+desktop | group links | T0 | Sampled group links open localized group pages | Real click | Pass | E-124 |
| B-024 | `subscribe-gift-card.tsx` | home/match/article | guest | invalid / captcha / success | mobile+desktop | subscribe form submit | T3 | Invalid states produce specific UI/API errors; real success sends confirm email only to test address | Real click + API/email/tail | Pass | E-38, E-108, E-109, E-126 |
| B-025 | `auth/login-form.tsx` | `/id/masuk` | guest | invalid / valid | mobile+desktop | login submit, forgot/register links | T2 | Invalid error shown; valid test account logs in; links navigate correctly | Real click + tail | Pass | E-128 |
| B-026 | `auth/register-form.tsx` | `/id/daftar` | guest | invalid / valid | mobile+desktop | register submit, marketing checkbox, login link | T3 | Invalid error shown; valid test registration creates user and email flow | Real click + email/tail | Pass | E-128 |
| B-027 | `auth/forgot-form.tsx` | `/id/lupa-sandi` | guest | invalid / valid | mobile+desktop | forgot submit, back login link | T3 | Valid test email receives reset link; invalid state bounded | Real click + email/tail | Pass | E-114, E-126 |
| B-028 | `auth/reset-form.tsx` | `/id/atur-ulang-sandi` | guest with recovery link | recovery token | mobile+desktop | reset password submit | T3 | Recovery link opens reset form; submit updates test password | Real click + email/auth/tail | Pass | E-50, E-114, E-126 |
| B-029 | `auth/account-form.tsx` | `/id/akun` | logged-in | profile edit | mobile+desktop | account update submit | T2 | Test profile update persists after refresh | Real click + readback | Pass | E-45, E-49, E-116, E-126 |
| B-030 | `oauth-buttons.tsx` | `/id/masuk`, `/id/daftar` | guest | feature flag | mobile+desktop | Google/Facebook OAuth buttons | T3 | If flag off, buttons absent; if on, provider callback is configured | Source/env + safe boundary | Pass | E-50, E-126 |
| B-031 | `predict-score.tsx` | match detail | guest | signed out | mobile+desktop | login CTA inside prediction card | T0 | CTA navigates to login route | Real click | Pass | E-125 |
| B-032 | `predict-score.tsx` | match detail | logged-in | scheduled fixture | mobile+desktop | score inputs and submit/update | T2 | Save/update persists for test user; invalid score error visible | Real click + API/DB/tail | Pass | E-127 |
| B-033 | `predict-score.tsx` / `share-buttons.tsx` | match detail | logged-in | staging saved + locked fixture | mobile+desktop | saved prediction share buttons | T3 | Share controls render and safe-boundary behavior passes | Real click on staging seed | Pass on staging seed | E-130, E-133 |
| B-034 | `bracket-builder.tsx` | `/id/prediksi` | guest | selecting teams | mobile+desktop | semifinalist/finalist/champion buttons | T1 | Selection limits enforce bracket rules; disabled states clear | Real click | Pass | E-125 |
| B-035 | `bracket-builder.tsx` | `/id/prediksi` | logged-in | save bracket | mobile+desktop | save bracket button | T2 | Saved bracket persists for test user | Real click + readback/tail | Pass | E-35, E-115, E-126 |
| B-036 | `bracket-builder.tsx` | `/id/prediksi` | guest/logged-in | saved local result | mobile+desktop | WhatsApp share link | T3 | WhatsApp URL encodes bracket text; no external publish | Href-only safe boundary | Pass | E-127 |
| B-037 | `league-create.tsx` | `/id/liga` | logged-in | create | mobile+desktop | create league submit | T2 | Test league created; detail page opens; cleanup recorded | Real click + readback/tail | Pass | E-35, E-107, E-115, E-126 |
| B-038 | `league-join.tsx` | invite URL | logged-in | valid invite | mobile+desktop | join league button | T2 | Test user joins; standings/member state persists | Real click + readback/tail | Pass | E-127 |
| B-039 | `league-invite.tsx` | `/id/liga/[slug]` | logged-in | owner/member | mobile+desktop | primary invite copy button | T1/T2 | Clipboard receives invite URL; feedback visible | Real click + clipboard | Pass | E-110, E-126 |
| B-040 | `league-invite.tsx` / `share-buttons.tsx` | `/id/liga/[slug]` | logged-in | invite share | mobile+desktop | invite ShareButtons | T3 | Share URLs/copy safe-boundary behavior passes | Real click + href boundary | Pass | E-110, E-118, E-126 |
| B-041 | `comments-section.tsx` | article/match | guest | signed out | mobile+desktop | login CTA | T0 | Login CTA navigates to login route | Real click | Pass | E-125 |
| B-042 | `comments-section.tsx` | article/match | logged-in | post/reply/cancel | mobile+desktop | comment submit, reply, cancel | T2 | Test comment/reply persists; cancel clears draft | Real click + readback/tail | Pass | E-129, E-136, E-137 |
| B-043 | `comments-section.tsx` | article/match | logged-in | existing comment | mobile+desktop | like/report buttons | T2 | Like/report actions return bounded state; no duplicate/hung action | Real click + API/tail | Pass | E-112, E-115, E-126 |
| B-044 | `premium-content.tsx` | match detail | guest/logged-in | premium preview | mobile+desktop | premium/login CTA | T0/T2 | Guest CTA navigates; authorized user sees premium content state | Real click + API | Pass | E-107, E-126 |
| B-045 | `home-personalized.tsx` | `/id` | guest/logged-in | personalization card | mobile+desktop | personalized CTA links | T0/T2 | Guest/register and logged-in ranking/prediction CTAs navigate correctly | Real click | Pass | E-127 |
| B-046 | `notify-bell.tsx` | header | logged-in | permission default/subscribed | mobile+desktop | enable/disable notification button | T3 | Permission/subscription UI state and persistence are correct | Real click + browser permission + readback | Pass | E-117, E-126 |
| B-047 | `social-embed.tsx` | article detail | guest | X/Twitter embed | mobile+desktop | fallback/external X link when widget unavailable | T3 | Lazy mount/fallback link safe; no overflow | Real click/href boundary | Pass | E-120 |
| B-048 | `social-embed.tsx` | article detail | guest | staging YouTube URL in `article.embeds` | mobile+desktop | YouTube iframe | T3 | Official `youtube-nocookie` iframe renders and remains bounded | Real click on staging seed | Pass on staging seed | E-130, E-133 |
| B-049 | `goal-highlights.tsx` | finished match detail | guest | staging recap embeds/events | mobile+desktop | goal highlight recap embeds | T3 | Finished-match recap media renders/fallbacks safely | Real click on staging seed | Pass on staging seed | E-130, E-133 |
| B-050 | `live-scoreboard.tsx` / `events-timeline.tsx` | live score/match detail | guest | staging live fixture | mobile+desktop | live score row and event updates | T1/T3 | Poll/update/recovery behavior bounded while live | Real click on staging seed | Pass on staging seed | E-130, E-133 |
| B-051 | article detail page | `/id/artikel/[slug]` | guest | article detail share | mobile+desktop | article share buttons | T3 | Article detail renders ShareButtons for the canonical article URL; external links/copy are safe; no mobile overflow or SEO metadata regression | Source + real click after fix | Pass | P2-10 fixed / E-130, E-131, E-132 |
