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

## P1 Findings

<!-- 在此追加 P1 finding -->

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
