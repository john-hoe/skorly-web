# Review Staging Seed Plan - 2026-06-07

## Objective

建立一个不污染生产数据、不影响 `skorly.cc` SEO 的 review/staging 数据面，用来关闭当前 Button UI Click Matrix 中仍依赖 live/finished/embed 数据的外部条件行。

本方案只解决 review 可测性，不改变生产业务逻辑。任何业务代码修复仍按 `docs/review/review-operating-rules.md` 交给 fix session。

## Current State

| Item | Status | Evidence / Note |
| --- | --- | --- |
| Supabase production branch | Not usable | Development branching requires Pro plan; current project cannot create branch. |
| Independent Supabase review project | Created | `skorly-review-seed-20260607`, ref `utvbuirtllvxhzlsytrx`, region `ap-northeast-2`, cost returned `$0/month`. |
| Review project schema | Applied | Schema was applied from `packages/db/src/schema.ts` with Drizzle push; historical migrations were not replayed from empty state because of the known bootstrap gap. |
| Existing app staging config | Missing | `apps/web/wrangler.jsonc` only defines production `skorly-web` and custom domains. |
| Env sync script | Production-only | `scripts/sync-env.mjs` hardcodes production Supabase ref `majrlaxktengachwrskk` and `NEXT_PUBLIC_SITE_URL=https://skorly.cc`. |
| Historical migrations | Not clean bootstrap | `0007_phase2_m6_images.sql` assumes `image_library` already exists, while current committed migrations do not create it from an empty project. |
| Review seed data | Applied | Seed summary saved at `docs/review/artifacts/staging-seed-2026-06-07/seed-summary.json`: 1 live fixture, 1 finished fixture, 8 events, 2 embed articles, 1 saved prediction. |
| Review Worker deploy | Deployed | Non-production Worker `skorly-web-review`, URL `https://skorly-web-review.skorly-review-john-hoe.workers.dev`, version `ca7fe172-11a2-45f5-a2ac-eee5249dd4a5`, `/BUILD_ID=staging-seed-20260607`. |
| Indexing protection | Applied | Staging dynamic/API/page responses include `X-Robots-Tag: noindex, nofollow, noarchive`; `NEXT_PUBLIC_SITE_URL` points to the workers.dev staging URL. |
| Review closure | Completed | E-133 closes B-013, B-033, B-048, B-049, and B-050 as `Pass on staging seed`, not production Pass. |

## First Principles

Review seed data must satisfy three hard constraints:

1. **Isolation**: fake/live/finished review rows must never enter production Supabase or production static build output.
2. **Indexing safety**: staging URLs must not be crawlable/indexable as public football content.
3. **Runtime fidelity**: staging should run the same Next/OpenNext/Cloudflare code path as production, otherwise live polling, static params, and client islands are not equivalent.

Writing fake fixtures/articles into production, even temporarily, fails all three constraints: they can appear in score pages, sitemap/static routes, article lists, and external crawlers during the test window.

## Inputs Used

The Supabase review project uses project-specific values from `/Users/johnmacmini/workspace/.env/apikey`. Secret values are not recorded in review artifacts.

| Required Value | Why It Is Needed | Status |
| --- | --- | --- |
| `SUPABASE_REVIEW_DB_PASSWORD` | Builds/static generation need `DATABASE_URL` for Drizzle/Postgres. | Provided by user vault; used only in local env and Worker secret. |
| `SUPABASE_REVIEW_SERVICE_ROLE_KEY` | Server routes use Supabase REST through `SUPABASE_SERVICE_ROLE_KEY`. | Provided by user vault; uploaded only as Worker secret. |
| `SUPABASE_REVIEW_ANON_KEY` | Browser auth/client uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`. | Provided by user vault; public browser key. |
| `SUPABASE_REVIEW_URL` | Browser/server Supabase URL. | `https://utvbuirtllvxhzlsytrx.supabase.co`. |

Recommended vault names in `/Users/johnmacmini/workspace/.env/apikey`:

```text
supabase review ref = utvbuirtllvxhzlsytrx
supabase review db password = <staging database password>
supabase review service_role = <staging service_role key>
supabase review anon = <staging anon key>
supabase review url = https://utvbuirtllvxhzlsytrx.supabase.co
```

Do not reuse production `SUPABASE_SERVICE_ROLE_KEY` or production DB password for the review project; Supabase JWT secrets are project-specific and production credentials must stay scoped to production.

Connection detail used for review/staging DB access: Supavisor pooler host prefix `aws-1-ap-northeast-2`, transaction port `6543`. An earlier `aws-0` pooler guess returned `tenant/user postgres.utvbuirtllvxhzlsytrx not found`; it was not used for the final Worker version.

## Seed Coverage

The staging seed must create deterministic data for the five remaining non-Pass button rows:

| Matrix Row | Seed Requirement | Acceptance Target |
| --- | --- | --- |
| B-013 | At least one live fixture and one finished/result fixture with match routes. | Score/result rows click to match detail without 4xx/overflow. |
| B-033 | A test user/profile with a saved prediction on a locked fixture. | Saved prediction ShareButtons render; copy/social intent safe-boundary behavior passes. |
| B-048 | A published article whose `articles.embeds` contains a YouTube URL. | `SocialEmbed` maps to `youtube-nocookie` iframe and remains bounded on mobile/desktop. |
| B-049 | A finished fixture with goal events and a recap article containing embeds. | `GoalHighlights` renders event/highlight section safely. |
| B-050 | A live fixture with events and live score API data. | `/api/score/live` and `/api/fixtures/:id/events` drive bounded live UI/polling behavior. |

## Required Staging Shape

Minimum staging dataset:

| Table / Area | Rows |
| --- | --- |
| `leagues` | One World Cup 2026 league. |
| `teams` | Four review teams, including two used by the live fixture and two by the finished fixture. |
| `fixtures` | One `status='live'`, one `status='finished'`, one locked fixture for saved-prediction share if not reused. |
| `fixture_events` | Goal/card/substitution samples tied to live/finished fixtures. |
| `articles` | Localized published article with YouTube embed; recap article linked to finished fixture. |
| `profiles` / Auth user | One review test account/profile for logged-in prediction-share flow. |
| `predictions` | One saved prediction tied to the locked fixture and review profile. |

Static route generation matters: match and article detail routes have `dynamicParams = false`, so seed rows must exist **before** `opennextjs-cloudflare build`.

## Deployment Requirements

| Requirement | Acceptance |
| --- | --- |
| Worker isolation | Deploy to a non-production Worker name, e.g. `skorly-web-review`; do not use production custom domains. |
| URL isolation | Use `workers.dev` or a protected staging subdomain, never `skorly.cc`. |
| SEO protection | Add Cloudflare Access or equivalent protection; additionally set staging `robots`/headers to noindex if a code/config hook exists. |
| Env isolation | `NEXT_PUBLIC_SITE_URL` must point to the staging URL, not `https://skorly.cc`. |
| Production safety | No writes to production Supabase; no `wrangler deploy` to `skorly-web`. |

## Execution Prompt For Infra/Fix Session

```text
你是 Skorly infra/fix session。先读：
- docs/review/review-operating-rules.md
- docs/review/button-ui-click-review-plan-2026-06-06.md
- docs/review/button-ui-click-matrix-2026-06-06.md
- docs/review/review-staging-seed-plan-2026-06-07.md

目标：建立隔离 review/staging 数据和部署，用于验证 B-013、B-033、B-048、B-049、B-050。不要写生产 Supabase，不要部署到生产 Worker/custom domain。

已创建 Supabase review project：
- name: skorly-review-seed-20260607
- ref/project_id: utvbuirtllvxhzlsytrx
- URL: https://utvbuirtllvxhzlsytrx.supabase.co
- region: ap-northeast-2

前置：
1. 从 /Users/johnmacmini/workspace/.env/apikey 读取 staging Supabase values：
   - supabase review db password
   - supabase review service_role
   - supabase review anon
   - supabase review url
2. 不要打印任何 secret value。

工作：
1. 生成或应用一个可从空 Supabase project 启动的 review/staging schema。现有历史 migrations 不能盲目直接重放，因为当前 0007 假设 image_library 已存在；需要以 packages/db/src/schema.ts 为准补齐 bootstrap。
2. 写一个幂等、可清理的 review seed。seed 必须覆盖：
   - live fixture + events
   - finished fixture + events
   - saved prediction on locked fixture for a review auth/profile
   - published article with YouTube URL in articles.embeds
   - recap article with embeds linked to finished fixture
3. 用 staging env 构建 OpenNext。注意 match/article detail dynamicParams=false，必须 seed 后再 build。
4. 部署到非生产 Worker，例如 skorly-web-review 或 workers.dev 预览，不要触碰 skorly-web、skorly.cc、www.skorly.cc。
5. 防索引：优先 Cloudflare Access；如果没有 Access，则 staging 响应至少需要 noindex/noarchive 或 robots deny，并确认 sitemap/canonical 不指向 production。
6. 交付 staging URL、BUILD_ID、Worker version、seed summary、cleanup command。

验证：
- staging /api/score/live 返回至少一个 live fixture。
- staging /api/fixtures/:id/events 返回 seeded events。
- live score page、live match detail、finished match detail、YouTube article detail、locked saved-prediction match detail 都返回 200。
- Chrome/Playwright 在 mobile 360/390/430 和 desktop 下点击/验证 B-013、B-033、B-048、B-049、B-050。
- 所有页面 scrollWidth <= innerWidth + 1。
- Share external links target/rel 安全，copy 内容为 staging URL。
- YouTube 使用 youtube-nocookie iframe。
- staging Worker tail error event = 0。
- 生产 /BUILD_ID 与生产 Supabase counts 不应因本工作改变。
```

## Review Closure Rule

完成 staging 后，review session 只能把 B-013、B-033、B-048、B-049、B-050 从 `Needs external verification` 改为 `Pass on staging seed` 或等价明确状态；不能伪装成 `prod Pass`，除非同样条件后来在真实生产数据中复现。
