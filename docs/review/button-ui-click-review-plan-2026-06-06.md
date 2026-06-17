# Button UI Click Review Plan - 2026-06-06

## Objective

建立一套可执行、可复验、可量化的「全按钮 UI 点击」review 方案，用来补足现有 full-site review 里的 Interactive Inventory。

本方案的核心目标不是证明页面能打开，而是证明每一种用户可点击控件在生产环境中满足以下条件：

- 可以被真实用户发现、聚焦、点击或触发。
- 点击后的 UI 状态、导航、网络请求、持久化结果符合预期。
- 不产生未预期的 console error、Worker error、CSP error、布局溢出或不可逆副作用。
- 每个通过结论都有 evidence ID 支撑，不能用「看起来可以」「应该没问题」替代。

## Non-Goals

- 不在 review session 修改业务代码。发现问题只记录 finding，并交给修复 session。
- 不把所有生产页面的所有重复实例逐个点完作为默认目标。Skorly 当前有大量静态/动态页面，逐页逐实例点击会把审计成本放大到低收益区间。
- 不对第三方平台执行真实发布、真实分享、真实删除、真实付费、真实通知骚扰等不可逆或外部影响行为。
- 不替代 SEO review。按钮点击只验证交互、状态、可访问性、布局和 side effect；SEO 专项仍需单独做。

## First Principles

「全按钮 UI 点击」需要先定义审计单元。否则这个目标不可证伪，也不可完成。

本 review 采用以下定义：

> 一个按钮审计单元 = Component/File + Route Pattern + Persona + State + Viewport + Expected Side Effect 相同的一组交互控件。

例如：

- 同一个 `ShareButton` 在 article、match、ranking、league 页面如果调用路径、文案、URL 生成逻辑不同，算不同审计单元。
- 同一个联赛列表里 100 个队伍 card link，如果只是同一组件同一路由模式的重复数据，默认抽样验证 3 个代表项；只有发现 data-dependent 风险时才扩大抽样。
- 同一个提交按钮的 idle、disabled、loading、success、error 状态算不同状态覆盖项。

如果要执行「逐页面逐实例」而不是「唯一交互签名覆盖」，必须单独开一个 exhaustive crawl，因为它的成本和误报率会高很多。

## Scope Definition

纳入范围：

| Control Type | Included Examples |
| --- | --- |
| Native buttons | `<button>`、`input[type="submit"]`、`input[type="button"]` |
| Link-like buttons | CTA link、card tap target、Next `Link` that acts as a UI action |
| ARIA buttons | `role="button"`、icon-only controls |
| Form controls | submit、reset、checkbox/toggle、select-trigger、search/filter action |
| Navigation controls | menu、locale switcher、tabs、pagination、load more、breadcrumb click target |
| Share controls | copy link、native share、social share URL、external share intent |
| Permission controls | consent banner、notification permission、push subscribe/unsubscribe |
| Auth/account controls | login/register/logout、profile/account mutation actions |
| Prediction/game controls | predict submit、option selection、bracket actions、team/league actions |
| Media controls | video/embed open/load/fallback controls where present |

排除范围：

| Excluded Item | Reason |
| --- | --- |
| Pure text links in article body | SEO/content link audit covers them better unless styled as CTA/button |
| Passive telemetry scripts | Consent/analytics review covers them |
| Non-user-triggered polling islands | Covered by live-score/external verification, not button click audit |
| Browser-native UI after external handoff | Verify URL/request intent only; do not operate third-party UI unless explicitly authorized |

## Risk Tiers

| Tier | Definition | Execution Rule |
| --- | --- | --- |
| T0 | No side effect beyond local UI/nav | Click directly in production |
| T1 | Reversible local/browser side effect | Click directly; record before/after and cleanup where needed |
| T2 | Reversible server write using test account/data | Click only with test account; verify persistence and cleanup |
| T3 | External service, email, permission, Turnstile, notification, share intent | Click with explicit preconditions; stop at safe boundary if external side effect would be real |
| T4 | Destructive, paid, irreversible, or third-party public action | Do not execute unless test-only target and explicit authorization exist |

默认策略：T0/T1 先做，T2/T3 在 test account、Migadu、Supabase、Cloudflare tail 都准备好后做，T4 只记录为 blocked/skipped-by-design 或交给专项授权。

## Required Preconditions

开始全按钮 UI 点击 review 前，必须满足：

| Requirement | Acceptance |
| --- | --- |
| Existing review state | 当前剩余 `Needs external verification` 已清完，或明确标记哪些外部项会并入按钮审计 |
| Production build | `/BUILD_ID` 或 Worker version 已记录到 evidence |
| Test account | 至少 1 个生产测试账号可注册、登录、登出、收邮件 |
| Email access | Migadu/API/IMAP 能读取测试邮箱，包括 plus-address 自动分流目录 |
| Supabase access | 可读必要表来验证 server write 结果；写入只限测试数据 |
| Cloudflare access | 可跑 `wrangler tail --status error` 并关联验证窗口 |
| Browser automation | 可使用 Chrome/Playwright 执行真实点击、截图、网络监听、console 监听 |
| Consent baseline | 能分别验证 no-consent 和 consented 状态 |

## Evidence Protocol

执行时继续沿用当前 full-site review 的证据风格：

- 所有 matrix `Pass` / `Fail` / `Needs external verification` / `Blocked` 都必须引用 evidence ID。
- 如果接在当前 review 后执行，默认继续使用 `review-evidence-2026-06-04.md` 的 `E-<n>` 序列。
- 每个 evidence entry 必须记录生产 build/Worker version 或明确说明使用的本地环境。
- 不允许没有证据的状态变更。
- 不允许用自动化脚本结果单独替代人工可读 evidence；脚本输出必须被归纳到 evidence entry。

建议 evidence 格式：

```md
### E-<n> Button UI click / <Button ID>
- Matrix row: Button UI Click Matrix / <Button ID>
- Env: production Chrome, BUILD_ID=<id>, Worker version=<id>
- Time: <UTC timestamp>
- Preconditions: <persona, cookies, account, route state>
- Click target: <selector>, accessible name="<name>", bbox=<x/y/w/h>
- Before: <screenshot/artifact path or DOM state>
- Action: <single click/tap/keyboard activation>
- After: <screenshot/artifact path or DOM state>
- Network: <requests/statuses relevant to the click>
- Persistence/readback: <database/email/browser storage result if any>
- Console/CSP/tail: <page errors, CSP errors, Worker error count>
- Cleanup: <test data cleanup result or N/A>
- Verdict: Pass/Fail/Needs external verification with reason
```

## New Artifacts

Recommended artifacts for this review batch:

| Artifact | Purpose |
| --- | --- |
| `docs/review/button-ui-click-review-plan-2026-06-06.md` | This execution plan |
| `docs/review/button-ui-click-matrix-2026-06-06.md` | Button/control inventory and result matrix |
| `docs/review/artifacts/button-ui-click-2026-06-06/` | Screenshots, JSON reports, network traces |
| `docs/review/review-evidence-2026-06-04.md` | Continue evidence ledger with `E-<n>` entries unless a new review round is opened |
| `docs/review/review-findings-2026-06-04.md` | Record new findings if this is part of the same review cycle |

## Inventory Method

### Static Source Scan

Run source discovery first to build the initial candidate list:

```bash
rg -n "onClick|onSubmit|<button|role=\"button\"|type=\"submit\"|type=\"button\"|navigator\\.clipboard|navigator\\.share|aria-pressed|aria-expanded|<Link" apps/web/app apps/web/components -g '*.tsx'
```

For each hit, classify:

- Component/file
- User-visible label or accessible name
- Route pattern(s)
- Required persona
- State variants
- Side effect
- Risk tier

### Production DOM Crawl

Then crawl representative production routes and extract actual clickable elements:

- `button`
- `a[href]`
- `[role="button"]`
- `[tabindex]:not([tabindex="-1"])`
- form submit controls
- elements with click handlers if detectable through framework markers or event side effects

Static source scan catches code-level candidates. DOM crawl catches controls hidden behind conditional rendering, responsive layouts, CMS content, and server data.

### Reconciliation

Every static candidate should map to at least one DOM control or be marked:

- Not rendered in current build
- Requires data state not present
- Requires auth/persona
- Dead/unused candidate
- Covered by another equivalent row

Every DOM control that looks actionable should map back to a component/file or be marked:

- Third-party embed control
- Browser-native form behavior
- CMS/content link
- Unknown source, needs manual trace

## Matrix Template

Create `button-ui-click-matrix-2026-06-06.md` with this structure:

| ID | Component/File | Route(s) | Persona | State | Viewport | Control / Accessible Name | Risk | Expected Result | Verification Mode | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B-001 | `apps/web/...` | `/id/...` | guest | idle | mobile+desktop | `button[name="..."]` | T0 | Navigates/updates UI | Real click | Pending | - |

Recommended status values:

| Status | Meaning |
| --- | --- |
| Pending | Inventory row created but not tested |
| Pass | Tested and meets acceptance criteria |
| Fail | Tested and violates acceptance criteria |
| Needs external verification | Requires live data, third-party service, or timing condition not currently available |
| Blocked | Cannot be tested because required credential/data/env is missing |
| Skipped by design | Not safe or meaningful to click; evidence explains the boundary |

`Verification Mode` should be explicit:

- Real click
- Keyboard activation
- Href-only verification
- Network-only verification
- Safe-boundary verification
- Source-only exclusion

## Execution Phases

### Phase A - Baseline Lock

| Task | Acceptance |
| --- | --- |
| Record current build | `/BUILD_ID`, commit, Worker version recorded |
| Record current matrix state | Existing full-site matrix has no unknown regressions |
| Start error monitoring | `wrangler tail --status error` ready for production write/auth batches |
| Create artifact directory | Screenshots/traces have stable path |

### Phase B - Inventory Build

| Task | Acceptance |
| --- | --- |
| Static scan complete | All source candidates exported and grouped |
| DOM crawl complete | Representative routes crawled in desktop and mobile |
| Reconciliation complete | No unmapped source/DOM control without reason |
| Matrix created | Every row has ID, route, persona, state, risk, expected result |

### Phase C - T0/T1 Low-Risk Sweep

Scope:

- Header/nav/menu controls
- Locale switcher
- Tabs/filters/sort controls
- Pagination/load more
- CTA links
- Card tap targets
- Copy/share URL controls that do not leave the site
- Consent banner local state

Acceptance:

- Every row has real click evidence or documented href-only boundary.
- Mobile and desktop both pass where the control renders in both.
- No horizontal overflow after interaction.
- No unexpected console/page/CSP error.
- Navigation targets return expected status or expected redirect.

### Phase D - Auth And Reversible Server Writes

Scope:

- Register/login/logout
- Account/profile buttons
- Prediction submit/update/delete if reversible
- Follow/subscribe/save controls if present
- Web Push subscribe/unsubscribe
- Form submissions using test data

Acceptance:

- Test account only.
- Before/after DB or API readback recorded.
- Worker tail error count recorded for validation window.
- Cleanup is performed or remaining test data is explicitly named.
- Disabled/loading/success/error states are captured for submit controls.

### Phase E - External/Permission Boundary

Scope:

- Email confirmation flows
- Turnstile-gated submissions
- Native share / social share intent
- External media embeds
- Browser notification permission
- Third-party login/share/send boundaries if present

Acceptance:

- Safe boundary is defined before clicking.
- If real external side effect is necessary, use test-only target and record authorization.
- For email, evidence must include actual inbox/folder discovery, not only INBOX/Junk.
- For third-party share intent, verify destination URL and parameters; do not publish externally unless explicitly authorized.

### Phase F - Data-Dependent And Live-State Controls

Scope:

- Live score/event polling controls or tap targets
- Match/event rows only visible during live or fixture-specific state
- Media embeds dependent on live content
- Data-dependent route cards where one dataset may behave differently

Acceptance:

- If live data is unavailable, mark `Needs external verification` with exact missing condition and next verification window.
- If sampled, use at least 3 representative records: normal, edge/empty, and high-content-density where available.
- Evidence explains why the sample is equivalent to the full repeated set.

### Phase G - Consistency Pass

| Check | Acceptance |
| --- | --- |
| Matrix/evidence integrity | Every non-pending row has evidence; every evidence maps to row |
| No orphan pending | Pending = 0 unless explicitly deferred by user |
| Findings linkage | Every fail has finding ID and severity |
| Artifact paths | Screenshots/traces exist and are readable |
| Regression sample | Re-run at least 20% of Pass rows across risk tiers after fixes/deploys |

## Acceptance Criteria

A button/control row can be marked `Pass` only when all relevant criteria pass:

| Criterion | Quantified Standard |
| --- | --- |
| Visibility | Control is visible when expected; hidden controls are justified by state/persona |
| Enabled/disabled | Enabled only when action is valid; disabled state prevents click/submission |
| Accessible name | Every icon-only/control-only button has non-empty accessible name or title |
| Click/tap target | Default target is at least 44x44 CSS px on mobile; compact header exceptions require width >= 44, height >= 32, accessible name, and no adjacent accidental tap risk |
| Keyboard activation | Native button/link works by default; custom role controls need keyboard path if in tab order |
| Result | Navigation/UI/network/server side effect matches expected result |
| Error handling | Invalid/error state is user-visible and does not silently fail |
| Layout | No text clipping, no incoherent overlap, no horizontal overflow after interaction |
| Console/CSP | No new relevant console error, page error, CSP error |
| Worker/runtime | For production server writes/auth/API flows, tail window has 0 relevant Worker error events |
| Persistence | Server write is readable through API/DB/email/storage where applicable |
| Cleanup | Test data is cleaned or explicitly documented |

Severity mapping for failures:

| Severity | Button Click Failure Example |
| --- | --- |
| P0 | Core auth/register/subscribe/prediction action broken for most users; security/privacy-impacting click behavior |
| P1 | High-traffic CTA/action broken, irreversible wrong side effect, production server write fails, consent/permission violation |
| P2 | Important but non-core control broken, accessibility/tap-target issue, share/copy/fallback broken |
| P3 | Cosmetic state issue, minor hover/focus/layout polish with no functional loss |

## Sampling Rules

Use sampling only when controls are demonstrably equivalent.

Minimum sampling:

| Repeated Surface | Minimum Sample |
| --- | --- |
| Homogeneous card/list links | 3 items per route pattern |
| League/team/match route cards | 3 normal + 1 edge if available |
| Article cards | 3 articles including one high-title-length item |
| Share buttons across content types | No sampling across content types; article/match/ranking/league each needs separate evidence |
| Localized controls | At least default locale plus Indonesian route if both render differently |
| Responsive nav controls | Mobile and desktop both required |

Escalate from sampling to broader crawl when:

- One sampled row fails.
- URL generation depends on slug/date/locale in a non-uniform way.
- Layout depends heavily on title length, score density, or media availability.
- Component has conditional branches not covered by sampled records.

## Safe Stop Rules

Stop the batch and record a finding when:

- A P0/P1 issue appears in a core flow.
- A click causes unexpected production write against non-test data.
- A page produces Worker 1101/500 or repeated relevant Worker errors.
- A consent boundary is violated.
- A button leads to third-party public action that cannot be safely bounded.

Do not keep clicking through a flow after a clear high-severity failure unless the next click is needed to prove blast radius safely.

## Suggested Execution Prompt

Use this prompt for the session that performs the button UI click review:

```text
请按 docs/review/button-ui-click-review-plan-2026-06-06.md 执行全站按钮 UI 点击 review。

规则：
1. 只 review，不修改业务代码。
2. 先完成 inventory：静态源码扫描 + 生产 DOM crawl + reconciliation。
3. 新建 docs/review/button-ui-click-matrix-2026-06-06.md。
4. Evidence 继续写入 docs/review/review-evidence-2026-06-04.md，编号接当前最大 E-<n> 往后。
5. 每个 Pass/Fail/Needs/Blocked 必须有 evidence ID。
6. T0/T1 先测；T2/T3 只使用测试账号、测试邮箱、测试数据；T4 不做真实外部/不可逆动作，除非我明确授权。
7. 对每个按钮记录：route、persona、state、viewport、selector/accessibility name、click 前后状态、network、console/CSP、必要时 Worker tail 和 DB/email readback。
8. 发现 P0/P1 先停下来给我修复 prompt；P2/P3 可继续积累，除非它阻断后续 review。
9. 不要用“应该/看起来”下结论；所有结论必须可复验。

完成标准：
- button-ui-click-matrix 里 Pending = 0，除非明确列为 Needs external verification / Blocked / Skipped by design。
- 所有 Fail 都进入 review-findings 并有 severity。
- 所有 evidence/artifact 路径可读。
- 至少对 20% 已 Pass 行做一次部署后回归抽样。
```

## Relationship To Current Review

建议顺序：

1. 先清完当前 full-site review 剩余的 `Needs external verification`。
2. 再执行本按钮 UI 点击 review。
3. 按钮点击 review 中发现的 P0/P1 立即暂停并交给修复 session。
4. P2/P3 可以继续积累到一个修复批次，除非它们阻断后续点击覆盖。
5. 所有按钮点击 review 完成且关键问题修复后，再做 SEO 专项 review。

理由：

- 当前剩余外部验证项会影响按钮审计的前置状态，例如 email、live data、external media、share intent。
- 如果先做按钮全点，很多行会因为外部条件缺失被重复标记 `Needs external verification`，增加返工。
- SEO review 最适合在交互/consent/security 修复稳定后做，否则部署覆盖和 headers/analytics 变更会反复污染 SEO 证据。
