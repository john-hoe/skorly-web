# Skorly 移动 Web 优化 + PWA 强化 + 内容关键词增长执行方案

更新时间：2026-06-16

用途：给后续 Codex session 直接执行。这个文档覆盖三件事：

1. 先做移动 Web 优化，让移动端 SEO、体验、转化不拖后腿。
2. 再做 PWA 强化，把访问过的用户拉回来。
3. 同时继续做内容和关键词覆盖，因为这是新增自然流量的主发动机。

文档还包含自检、审查、修复闭环，以及建议用于 Goal 模式的目标描述。

## 0. 核心判断

当前 Skorly 适合做“移动端优先的响应式 Web + PWA”，暂时不建议直接投入完整原生 APP。

原因：

- 站点已有 PWA 基础：`manifest.ts`、`sw.js`、service worker 注册、Web Push。
- 产品场景适合移动端：实时比分、赛程、预测、排行榜、比赛提醒、文章阅读。
- 当前获客主渠道仍应是 Google/SEO/社媒，不是 App Store / Google Play。
- 原生 APP 会增加审核、双端维护、推送证书、商店素材、隐私合规成本；当前用户规模还不足以证明值得重投入。

优先级：

1. 移动 Web 优化：提升搜索可用性、首屏体验、转化率。
2. PWA 强化：提升回访、提醒点击、比赛日复访。
3. 内容和关键词覆盖：持续扩大自然搜索入口。

## 1. 当前站点情况

执行前要重新确认，但截至本方案编写时，站点具备这些基础。

### 1.1 技术栈

- Monorepo：pnpm workspace。
- Web：Next.js 16 App Router，`apps/web`。
- i18n：`next-intl`。
- 部署：OpenNext Cloudflare Workers。
- 数据：Supabase。
- 分析：GA4 + PostHog。
- 推送：Web Push + VAPID + service worker。

### 1.2 已有 PWA 能力

文件：

- `apps/web/app/manifest.ts`
- `apps/web/components/pwa-register.tsx`
- `apps/web/public/sw.js`
- `apps/web/components/notify-bell.tsx`
- `apps/web/app/api/push/subscribe/route.ts`
- `apps/web/app/api/push/unsubscribe/route.ts`
- `apps/jobs/src/send-notifications.ts`
- `apps/jobs/src/send-daily-digest.ts`

现状：

- manifest 已配置 `display: "standalone"`。
- 有 `icon-192.png`、`icon-512.png`、`icon.svg`。
- 客户端会注册 `/sw.js`。
- `sw.js` 已支持离线 fallback、push、notification click。
- 已有开赛、进球、赛果、每日摘要等推送基础。

### 1.3 已有移动响应式基础

现有组件大量使用 `sm:`、`md:`、`lg:`、`overflow-x-auto`、横向 snap 等响应式模式。

重点页面：

- 首页：`apps/web/app/[locale]/page.tsx`
- 实时比分：`apps/web/app/[locale]/skor/page.tsx`
- 赛程：`apps/web/app/[locale]/jadwal/page.tsx`
- 比赛页：`apps/web/app/[locale]/pertandingan/[slug]/page.tsx`
- 文章页：`apps/web/app/[locale]/artikel/[slug]/page.tsx`
- 排行榜：`apps/web/app/[locale]/peringkat/page.tsx`
- 个人中心：`apps/web/app/[locale]/akun/page.tsx`
- 登录注册：`apps/web/app/[locale]/masuk/page.tsx`、`apps/web/app/[locale]/daftar/page.tsx`

### 1.4 当前主要风险

需要执行前验证：

- 360px 宽度是否有横向溢出。
- 首屏是否信息密度不足或 CTA 不够直接。
- 移动端导航是否让用户难以快速进入比分/赛程/预测/排行榜。
- 预测入口是否埋得太深。
- 登录/注册是否影响预测转化。
- PWA 安装引导是否缺失。
- 推送订阅是否只提供一个笼统入口，没有分层偏好。
- Cloudflare/Next middleware 是否让公开 SEO 页面 TTFB 偏高。

## 2. 量化目标

这些目标用于判断项目是否成功，不是每个都必须第一天达成。

### 2.1 移动 Web 目标

- 360px、390px、430px、768px 视口：关键页面无横向溢出。
- 移动端 Lighthouse Performance：目标 >= 80，最低不低于当前基线。
- Accessibility：目标 >= 90。
- SEO：目标 >= 90。
- Core Web Vitals：
  - LCP：目标 < 2.5s。
  - CLS：目标 < 0.1。
  - INP：目标 < 200ms。
- 移动端关键路径点击深度：
  - 首页到实时比分 <= 1 次点击。
  - 首页到预测当前焦点比赛 <= 1 次点击。
  - 首页到赛程 <= 1 次点击。
  - 首页到登录/注册 <= 1 次点击。

### 2.2 转化目标

- 移动端预测提交转化率：提升 10-30%。
- 注册入口点击率：提升 10-20%。
- 登录/注册完成后返回原预测流程成功率：接近 100%。
- 首页到比赛页点击率：提升 10-20%。

### 2.3 PWA 目标

- 移动用户 push opt-in：3-5%。
- 已订阅用户推送点击率：3-10%。
- 7 日回访率：15-20%。
- PWA 安装提示曝光后安装率：1-3% 起步。
- 每用户周访问次数：>= 3。

### 2.4 内容/SEO 目标

- 移动自然搜索 clicks：提升 5-15%，前提是同步做内容覆盖和关键词入口。
- 每个高意图主题都有移动友好的入口页。
- 首页、比分页、赛程页、比赛页、文章页都能在移动端首屏直接回答用户意图。

## 3. 非目标

本阶段不要做：

- 不做 `m.skorly.cc`。
- 不做完整原生 iOS/Android APP。
- 不做 WebView 壳上架。
- 不改默认 locale 策略。
- 不为了 PWA 强化破坏 SEO 可抓取 HTML。
- 不做复杂重设计，优先改关键路径。
- 不把所有页面都当营销 landing page；这是比赛日工具型产品。

## 4. Phase 0：生产和本地基线

执行者必须先做基线，不要直接改。

### 4.1 Git 和环境基线

命令：

```bash
git status --short --branch
pnpm --version
node --version
```

要求：

- 识别已有未提交改动。
- 不覆盖与当前任务无关的改动。
- 如果已有泰语上线工作在进行，只新增移动/PWA相关改动，不回滚泰语文件。

### 4.2 生产 URL 基线

检查：

```bash
curl -I -L https://skorly.cc/
curl -I -L https://skorly.cc/id
curl -I -L https://skorly.cc/id/skor-langsung
curl -I -L https://skorly.cc/id/jadwal
curl -I -L https://skorly.cc/sitemap.xml
curl -I -L https://skorly.cc/manifest.webmanifest
curl -I -L https://skorly.cc/sw.js
```

记录：

- 状态码。
- 重定向。
- cache-control。
- TTFB，如工具可取。

### 4.3 页面基线

至少测这些页面：

- 首页。
- 实时比分页。
- 赛程页。
- 一个比赛详情页。
- 一篇文章页。
- 排行榜页。
- 登录页。
- 注册页。

视口：

- 360 x 740。
- 390 x 844。
- 430 x 932。
- 768 x 1024。
- 1366 x 900。

检查项：

- 无横向滚动。
- 顶部导航不遮挡内容。
- 底部浮层不遮挡 CTA。
- 表格和比分卡能读。
- 文字不溢出按钮。
- 登录/注册表单可用。
- 预测控件可点击。
- 文章阅读不拥挤。

### 4.4 性能基线

用可用工具跑：

- Lighthouse mobile。
- Playwright trace 或 browser screenshot。
- 如能用 Chrome DevTools，就记录 LCP/CLS/INP。

最低记录：

- Lighthouse 分数。
- 页面截图。
- 是否有 console error。
- 是否有 network 404。

## 5. Phase 1：移动 Web 优化

目标：移动端核心路径更短、更清晰、更稳定。

### 5.1 移动首屏

首页首屏要满足：

- 用户 3 秒内知道今天/下一场是什么。
- 能直接进入实时比分。
- 能直接预测焦点比赛。
- 能看到比赛状态：live / starting soon / FT。
- 不要把大段说明文放首屏。

建议：

- 保持首页工具型，不做营销 hero。
- 焦点比赛卡优先，标题不要过大。
- 移动端首屏应包含：
  - live/next match。
  - score/prediction CTA。
  - quick nav：比分、赛程、预测、排行榜。

验收：

- 360px 宽度首屏可看到核心比赛卡和至少一个明确 CTA。
- CTA 高度 >= 44px。
- 主要文本不截断关键球队名。

### 5.2 底部导航

建议新增移动端 bottom nav，仅在小屏显示。

入口建议：

- Live：`/skor`
- Schedule：`/jadwal`
- Predict：`/prediksi` 或当前焦点比赛。
- Leaderboard：`/peringkat`
- Account：`/akun` 或 login。

要求：

- 桌面端不显示。
- 不遮挡 cookie/analytics consent、PWA install banner、预测提交按钮。
- 使用 safe-area inset。
- 当前路由高亮。
- icon + 短 label，不要长文本。

注意：

- 如果页面已有 sticky header，不要造成上下都拥挤。
- 对文章页可以保留 bottom nav，但要避免遮挡 share/subscribe。

### 5.3 比赛日信息密度

目标页面：

- 首页。
- 实时比分页。
- 赛程页。
- 比赛页。

优化方向：

- 移动端减少装饰边距。
- 卡片内保留关键字段：
  - 比赛时间。
  - 主客队。
  - 比分/状态。
  - 预测入口。
  - 直播/战报入口。
- 赛程按日期分组，移动端不使用过宽表格。
- 已结束比赛突出 recap/highlights。

验收：

- 360px 宽度下比赛卡不横向溢出。
- 一屏至少能看见 1-2 场比赛。
- 每场关键操作不超过 2 个，避免按钮堆积。

### 5.4 预测入口优化

预测是高价值行为。移动端应减少路径。

改进：

- 首页焦点比赛 CTA 直接进入比赛预测区。
- 比赛页预测模块在移动端靠前。
- 未登录时提示登录，但登录后回到原比赛。
- 分享预测结果在移动端优先使用 native share。

验收：

- 未登录用户从首页到登录再回到比赛预测，流程不中断。
- 已登录用户提交预测 <= 3 个明显步骤。
- 提交按钮在软键盘出现时不被遮挡。

### 5.5 登录/注册流程

目标：

- 移动端表单清晰。
- 错误提示明确。
- OAuth 按钮不溢出。
- 登录后回到用户原本要做的动作。

检查：

- Email 输入 keyboard type。
- Password manager 兼容。
- Turnstile 不溢出。
- 按钮高度 >= 44px。

### 5.6 横向溢出治理

常见风险：

- 表格。
- 长球队名。
- leaderboard。
- admin 可忽略优先级较低，但公开页面必须修。
- embedded social / YouTube。
- 长 URL 或 markdown 内容。

做法：

- 用 Playwright 计算 `document.documentElement.scrollWidth > window.innerWidth`。
- 每个关键页面在 360px 都要检查。
- 对表格用 responsive card 或 `overflow-x-auto`。
- 对长词用 `overflow-wrap:anywhere`，但不要破坏球队名主视觉。

## 6. Phase 2：PWA 强化

目标：让来过的移动用户更容易回来。

### 6.1 安装引导

当前只有 manifest 和 service worker，不够主动。

新增组件建议：

- `components/pwa-install-prompt.tsx`

行为：

- 监听 `beforeinstallprompt`。
- 满足条件时显示轻量 banner。
- 用户可点击安装。
- 用户可关闭，关闭后 7-14 天内不再提示。
- 只在移动端显示。
- 已 standalone 模式不显示。
- iOS Safari 不支持同样事件时，显示简短“添加到主屏幕”指导，但不要打扰。

显示条件：

- 用户访问 >= 2 次，或停留 >= 20 秒。
- 用户看过比赛页/比分页/预测页。
- 不在登录表单提交时弹。

验收：

- Android Chrome 出现可安装流程。
- iOS Safari 显示合适提示或不显示，不报错。
- 不遮挡底部导航和主要 CTA。

### 6.2 离线/弱网

当前 `sw.js` 有 navigation fallback，但可以增强。

建议：

- offline page 支持所有当前 locale，包括未来 `th`。
- cache 最近访问过的首页、比分页、赛程页 shell。
- 网络失败时给出明确状态。
- 不缓存用户敏感页面。

不要：

- 不要缓存登录态 API。
- 不要让过期比分看起来像实时比分。
- 离线比分必须标注“离线/可能不是最新”。

验收：

- DevTools offline 下打开已访问页面，有合理 fallback。
- push click 离线时不会白屏。

### 6.3 推送分层

当前已有 Web Push，但用户偏好需要更精细。

建议 topic：

- `kickoff`：开赛提醒。
- `goals`：进球提醒。
- `results`：赛果/预测得分。
- `daily_digest`：每日赛程。
- `breaking_news`：重大新闻，谨慎使用。

用户界面：

- 在比赛页提供“提醒我这场比赛”。
- 在账号页提供通知偏好。
- 在首页/比分页提供轻量开启提醒。

频率限制：

- 同一用户每日普通推送 <= 4 条。
- 重大比赛日可例外，但要有 dedupe。
- breaking news 必须低频。

验收：

- 用户能开启/关闭 topic。
- 退订后不再收到。
- 404/410 endpoint 会清理。
- 推送点击落到对应 locale 的页面。

### 6.4 推送文案

文案规则：

- 短。
- 有比赛名或关键事件。
- 不用夸张标题党。
- 不涉及博彩。
- 不承诺“稳赚/内幕/必胜”。

例：

```text
Kickoff: Argentina vs Algeria starts in 15 min. Lock your score pick.
Goal: GOAL! Argentina 1-0 Algeria. See the live timeline.
Result: Full-time: Argentina 2-1 Algeria. You scored 3 pts.
Daily: 4 World Cup matches today. First kickoff: 19:00.
```

## 7. Phase 3：内容和关键词覆盖

目标：移动优化和 PWA 只能减少流失、增加回访；新增自然流量仍然靠内容和关键词。

### 7.1 页面类型优先级

高优先级：

- 实时比分页。
- 赛程页。
- 单场比赛页。
- 预测页/比赛预测模块。
- 球队页。
- 小组页。
- 赛后 recap/highlights。

中优先级：

- 新闻页。
- 文章归档。
- 排行榜。
- 观赛指南。

### 7.2 关键词覆盖

每个 locale 应覆盖：

- live scores。
- schedule。
- prediction。
- match preview。
- standings。
- team profile。
- where to watch。
- highlights / recap。

执行方式：

- 不要堆关键词。
- 用页面结构自然覆盖。
- title/description/H1 对齐搜索意图。
- 内链从首页/比分/赛程指向比赛页和文章页。

### 7.3 移动端内容展示

移动端文章页：

- H1 不要过长。
- 首段直接回答比赛/新闻核心。
- 文章前 300-500px 内出现相关比赛链接或 CTA。
- 分享按钮用 native share。
- 不要用过多卡片嵌套。

比赛页：

- 首屏先给比分/状态/预测。
- 深度分析放下面。
- 评论区不要挤压核心信息。

## 8. 自我验证、审查、修复闭环

每个阶段都要走这个闭环，不能只“改完就说完成”。

### 8.1 自检清单

修改后先自检：

```bash
pnpm typecheck
pnpm --filter @skorly/web test
pnpm --filter @skorly/web build
```

如果改了 jobs：

```bash
pnpm --filter @skorly/jobs test
```

如果测试不存在或失败原因无关，必须在最终说明。

### 8.2 浏览器验证

使用 Playwright 或 Browser 工具验证：

视口：

- 360 x 740。
- 390 x 844。
- 430 x 932。
- 768 x 1024。
- 1366 x 900。

页面：

- `/id`
- `/id/skor-langsung`
- `/id/jadwal`
- 一个 `/id/pertandingan/[slug]`
- 一个 `/id/artikel/[slug]`
- `/id/peringkat`
- `/id/masuk`
- `/id/daftar`

必须检查：

- screenshot 非空。
- 无横向溢出。
- header/bottom nav 不遮挡内容。
- CTA 可点击。
- console 无关键错误。
- network 无关键 404/500。

横向溢出检查脚本：

```js
document.documentElement.scrollWidth > window.innerWidth
```

如为 true，必须定位元素：

```js
[...document.querySelectorAll("*")]
  .filter((el) => el.scrollWidth > el.clientWidth + 1)
  .slice(0, 20)
  .map((el) => ({
    tag: el.tagName,
    className: el.className,
    text: el.textContent?.slice(0, 80),
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth
  }))
```

### 8.3 PWA 验证

检查：

- manifest 可访问。
- service worker 注册成功。
- install prompt 不报错。
- offline fallback 可用。
- push subscribe API 正常。
- notification click 打开正确 URL。

浏览器手工或自动检查：

- Chrome DevTools Application -> Manifest。
- Service Workers 状态。
- Offline mode。
- Push test，如环境允许。

### 8.4 性能验证

至少跑：

- Lighthouse mobile。
- Lighthouse desktop。

重点看：

- LCP。
- CLS。
- INP/TBT。
- 图片尺寸。
- JS 体积。
- 字体加载。

如果性能变差：

- 不要只解释，要修。
- 优先修图片、阻塞 JS、过重组件、未缓存公开页面。

### 8.5 可访问性验证

检查：

- button/link 有可理解 label。
- bottom nav 可键盘聚焦。
- 颜色对比合格。
- 表单 label 合格。
- 点击目标 >= 44px。

### 8.6 SEO 验证

检查：

- HTML 初始响应包含核心内容。
- title/description/canonical 正常。
- JSON-LD 不破坏。
- sitemap 不新增 404。
- robots 不阻挡。

不要因为 PWA 增强把核心内容变成 client-only。

### 8.7 修复循环

流程：

1. 发现问题。
2. 记录 URL、视口、复现步骤、截图。
3. 分类：
   - P0：生产不可用、5xx、核心路径断。
   - P1：移动核心体验、预测/登录/推送关键问题。
   - P2：视觉 polish、次要文案、非核心页面。
4. 先修 P0/P1。
5. 重新跑对应验证。
6. 确认没有引入新横向溢出或构建失败。

完成定义：

- 不是“代码写了”。
- 是“关键页面验证通过，问题闭环，生产风险可控”。

## 9. 发布策略

### 9.1 分阶段发布

建议拆成 3 个 PR 或至少 3 个提交范围：

1. Mobile Web UX：
   - 首屏。
   - bottom nav。
   - 预测入口。
   - 横向溢出修复。

2. PWA：
   - install prompt。
   - offline/weak network。
   - notification preferences。

3. Content/SEO：
   - 移动页面 metadata/内链。
   - 关键词入口。
   - 内容模块优化。

### 9.2 生产门禁

发布前：

- typecheck 通过。
- build 通过。
- 关键页面截图通过。
- 360px 无横向溢出。
- PWA 不报错。
- 现有语言 URL 不回归。

发布后 24 小时：

- Worker error rate 无明显上升。
- GA4/PostHog 事件正常。
- push subscribe/unsubscribe 正常。
- 核心页面 200。

## 10. 数据埋点和监控

需要确认或新增事件：

- `mobile_bottom_nav_click`
- `focus_match_cta_click`
- `predict_start`
- `prediction_submitted`
- `auth_started`
- `auth_completed`
- `pwa_install_prompt_shown`
- `pwa_install_accepted`
- `pwa_install_dismissed`
- `push_prompt_shown`
- `push_opt_in`
- `push_opt_out`
- `notification_click`
- `offline_fallback_seen`

维度：

- locale。
- viewport category。
- route type。
- logged in / guest。
- install state。
- push topic。

核心看板：

- 移动自然搜索 clicks。
- 移动访问到预测提交漏斗。
- 登录后回流成功率。
- PWA 安装率。
- Push opt-in。
- 推送点击率。
- 7 日回访率。

## 11. 资源需求

不需要新增：

- 新域名。
- 新服务器。
- 新数据库。
- 原生 APP 团队。

可能需要：

- 设计时间：移动底部导航和首屏信息结构。
- QA 时间：多视口截图检查。
- 分析事件定义。
- 如做 Android TWA 后续再需要 Google Play 账号和商店素材，本阶段不需要。

## 12. 成功和失败判断

### 12.1 成功

至少满足：

- 关键移动页面无横向溢出。
- 移动首屏更直接。
- 预测入口更短。
- PWA 安装和推送流程可用。
- 没有破坏 SEO HTML。
- 移动端转化或回访指标开始提升。

### 12.2 失败

这些情况要回滚或重新设计：

- 引入 5xx。
- sitemap/canonical/hreflang 被破坏。
- 关键页面移动端 CTA 被遮挡。
- bottom nav 遮挡表单/预测按钮。
- PWA install prompt 频繁打扰用户。
- Push 退订后仍发送。
- 性能明显变差。

## 13. 回滚方案

Mobile Web：

- bottom nav 可用 feature flag 或单独组件快速移除。
- 首屏改动如影响转化，恢复旧布局。

PWA：

- install prompt 可直接隐藏。
- push topic 新功能可关掉入口。
- service worker 改动如有问题，要 bump 或修复 sw 并确保客户端更新。

SEO/内容：

- 若 metadata 或 canonical 出错，优先热修。
- 如果新内链导致 404，从入口移除。

## 14. 建议 Goal 模式目标

建议创建的 Goal：

```text
在不影响 Skorly 当前生产 SEO、现有 locale 和核心功能的前提下，按 docs/mobile-web-pwa-growth-plan.md 完成移动 Web 优化、PWA 强化和内容关键词增长基础建设；完成后关键移动页面 360px 无横向溢出，预测/比分/赛程入口更短，PWA 安装与推送流程可验证，并通过 typecheck/build/browser 多视口验证。
```

建议预算：

- 不设 token_budget，避免执行中途被预算限制。

## 15. 给下个 session 的启动提示

可以直接发：

```text
请按 docs/mobile-web-pwa-growth-plan.md 执行 Skorly 移动 Web 优化 + PWA 强化 + 内容关键词增长基础建设。
要求：
1. 先重新确认生产、本地、git dirty 基线。
2. 不做 m.skorly.cc，不做原生 APP。
3. 第一阶段先做移动 Web：首屏、底部导航、比赛日信息密度、预测入口、登录/注册流程、360px 无横向溢出。
4. 第二阶段做 PWA：安装引导、离线/弱网、推送分层。
5. 同步保证 SEO 内容可抓取，不把核心内容改成 client-only。
6. 每阶段都要走自检、浏览器多视口验证、发现问题、修复、复验闭环。
7. 最终必须说明 typecheck/build/test/browser 验证结果。
```

## 16. 推荐执行顺序

1. 读本文档。
2. `git status --short --branch`，识别并行改动。
3. 生产 smoke。
4. 本地启动 web。
5. 多视口截图基线。
6. Lighthouse mobile 基线。
7. 修移动首屏和关键路径。
8. 加移动 bottom nav。
9. 修预测/登录回流。
10. 修横向溢出。
11. 加 PWA install prompt。
12. 强化 offline fallback。
13. 加 push topic/preference UI。
14. 加/核对 analytics events。
15. 浏览器多视口复验。
16. Lighthouse 复验。
17. typecheck/test/build。
18. 生产部署。
19. 生产 smoke。
20. 24 小时监控。
