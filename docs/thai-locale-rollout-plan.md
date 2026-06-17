# Skorly 泰语版本上线执行方案

更新时间：2026-06-16

用途：给后续 Codex session 直接执行。这个文档不是讨论稿；执行者应按阶段门禁推进，不能跳过生产保护、内容质检和回滚准备。

## 0. 一句话目标

在不影响当前 `id / vi / en / zh` 生产流量和功能的前提下，为 `skorly.cc` 上线泰语版本 `/th`，让泰国用户和 Google 能访问、抓取、理解、索引泰语页面，并让泰语内容覆盖现有世界杯 2026 核心页面。

上线后的效果要求：

- `/th` 及核心泰语路径返回 200。
- 泰语页面有完整 UI、SEO metadata、canonical、hreflang、sitemap。
- 泰语文章首批覆盖 280-310 篇 published 内容。
- 现有四种语言 URL 不变，默认 `/` 不改成泰语。
- 没有博彩、盗播、事实编造内容。
- 没有泰语人工审核时，必须使用 LLM 多模型质检和回译校验。

## 1. 当前生产状态

这些数据是 2026-06-16 从生产和本地仓库核对得到的，执行前需要重新跑一遍基线，确认没有明显变化。

### 1.1 技术栈

- Monorepo：pnpm workspace。
- Web：Next.js 16 App Router，`apps/web`。
- i18n：`next-intl`，locale prefix always。
- 部署：OpenNext Cloudflare Workers，`apps/web/wrangler.jsonc`。
- Jobs：Cloudflare Worker cron，`apps/jobs`。
- 数据库/Auth：Supabase。
- 内容：`articles.locale` 是文本字段，不需要数据库 enum 才能存 `th`。

### 1.2 当前 locale

当前正式 locale：

- `id`
- `vi`
- `en`
- `zh`

当前没有 `th`。

线上现象：

- `https://skorly.cc/` 当前 307 到 `/id`，设置 `NEXT_LOCALE=id`。
- `https://skorly.cc/th` 当前不是合法泰语入口，会被错误地导向 `/id/th`。
- 当前导航语言切换器只有 `ID / VI / EN / 中文`。

### 1.3 当前 sitemap 和内容规模

生产 sitemap：

- `sitemap.xml` 总 URL：约 2060。
- `id`：约 514。
- `vi`：约 515。
- `en`：约 516。
- `zh`：约 515。
- `th`：0。

Supabase 精确计数：

- `articles` 总数：1251。
- `id`：302，总 published 297。
- `vi`：302，总 published 298。
- `en`：345，总 published 299，draft 46。
- `zh`：302，总 published 298。
- `th`：0。

核心数据：

- fixtures：72。
- teams：48。
- subscribers：1。
- profiles：7。

已发布内容类型分布大致是每个正式 locale：

- `preview`：72。
- `watchpoints`：72。
- `prediction`：72。
- `recap`：16。
- `group_analysis`：12。
- `news`：约 58，英文更多。

因此泰语版不能只翻 UI，必须补约 280-310 篇泰语文章，才能达到现有语言的基本内容覆盖。

### 1.4 当前泰国访问情况

Globalping 泰国 Bangkok 探针结果：

- AIS Fibre：`/id` 200 OK，TLS 正常。
- Triple T Broadband：`/id` 200 OK，TLS 正常。
- 但 TTFB 约 2.36-2.72 秒，总耗时约 2.85-3.02 秒。

结论：

- “泰国能访问”当前基本成立。
- “泰国访问速度适合 SEO 和用户体验”还不够好，后续要优化。

## 2. 可用资源和缺口

### 2.1 已有资源

项目内 `.env` 已有：

- Supabase：`DATABASE_URL`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、public anon key。
- Football data：`API_FOOTBALL_KEY`。
- AI：DeepSeek、OpenRouter、Qwen、GLM。
- Web research：Tavily。
- Redis/Push：Upstash、VAPID。
- Email：Resend。
- Analytics：GA4、PostHog。
- Ads：AdSense client。
- Cloudflare：account id 和 API token。
- Turnstile：site key 和 secret。
- YouTube：YouTube API key。

工作区 `/Users/johnmacmini/workspace/.env` 是目录，里面有：

- `apikey`：Upstash/VAPID 类凭据。
- `cloudflare dns apikey`：Cloudflare 相关凭据。
- `SS` / `SSH`：代理或服务器连接信息。
- `ss-ecs-d412-qr.png`：二维码图片。

执行时可以使用这些资源，但不要在回复、日志、文档、提交中泄露密钥值。

### 2.2 不需要新增的资源

上线泰语版不需要先新增：

- 新域名。
- 泰国服务器。
- 新数据库。
- 新 CDN。
- 新 Auth 系统。
- 新广告系统。

### 2.3 必须新增或补齐的资源

必须新增：

- 泰语 UI 文案：`apps/web/messages/th.json`，约 368 条 leaf message。
- 泰语 SEO 路径、title、description。
- 泰语字体：建议 `Noto Sans Thai` 或 Thai system font stack。
- 泰语内容回填脚本。
- 泰语 LLM 质检和回译校验。
- 泰语术语表。
- 泰语通知文案：daily digest、premium email、push、WhatsApp、live commentary。
- GSC / analytics 中用于观察 `/th` 的报表或过滤条件。

## 3. 关键原则

### 3.1 不破坏现有生产

必须保持：

- `/` 默认仍走 `/id`，至少泰语上线初期不改。
- `/id`、`/vi`、`/en`、`/zh` 路径和 canonical 不变。
- 现有 sitemap URL 不消失。
- 现有文章不被覆盖。
- 现有 jobs 不因为 `th` 报错。

### 3.2 不用 IP 强制跳转

不要做：

- 用户 IP 在泰国就强制跳 `/th`。
- 用户访问 `/id` 时因为 IP 在泰国被改写到 `/th`。
- 对 Googlebot 做特殊重定向。

后续如果要智能跳转，只能按这个优先级：

1. 用户已选 cookie。
2. URL 明确 locale，例如 `/th`、`/id`，绝不改写。
3. 浏览器 `Accept-Language`。
4. Cloudflare country 仅作弱辅助。
5. fallback 到 `/id` 或 `/en`。

本次泰语上线不建议改 `/` 的跳转策略，除非泰语内容和 GSC 已稳定。

### 3.3 没有泰语人工审核时的质量目标

必须接受这个事实：

- LLM 不能等价替代泰语母语编辑。
- 但 LLM 可以把事实风险、乱码、明显不通顺、SEO 不合格风险压低。

本项目目标应定义为：

- 可发布。
- 事实安全。
- 泰语基本自然。
- SEO 可抓取。
- 没有明显机器翻译错误。

不要把目标设成“泰国体育编辑级文风”。

## 4. 推荐上线形态

### 4.1 URL 结构

使用单域名子路径：

- `https://skorly.cc/th`

不要先做：

- `th.skorly.cc`
- `skorly.co.th`
- 新品牌域名

原因：

- 单域名可以继承现有部署、内容、canonical、hreflang、域名信号。
- 新域名会拆分 SEO 权重和运维复杂度。

### 4.2 泰语核心路径建议

在 `apps/web/i18n/routing.ts` 中为 `th` 增加高意图路径：

- `/` -> `/th`
- `/piala-dunia-2026` -> `/ฟุตบอลโลก-2026`
- `/piala-dunia-2026/grup/[group]` -> `/ฟุตบอลโลก-2026/กลุ่ม/[group]`
- `/pertandingan/[slug]` -> `/การแข่งขัน/[slug]`
- `/tim` -> `/ทีม`
- `/tim/[slug]` -> `/ทีม/[slug]`
- `/jadwal` -> `/ตารางบอล`
- `/cerita` -> `/เว็บสตอรี่`
- `/cerita/[slug]` -> `/เว็บสตอรี่/[slug]`
- `/nonton` -> `/ดูบอล`
- `/iklan` -> `/โฆษณา`
- `/artikel/[slug]` -> `/บทความ/[slug]`
- `/author/[slug]` -> `/ผู้เขียน/[slug]`
- `/berita` -> `/ข่าว`
- `/arsip` -> `/บทความทั้งหมด`
- `/skor` -> `/ผลบอลสด`

Auth、leaderboard、prediction、league 路由可以先保持现有统一 slug，降低风险：

- `/masuk`
- `/daftar`
- `/akun`
- `/prediksi`
- `/peringkat`
- `/liga`

后续再本地化这些功能路径也可以。

## 5. 生产安全发布策略

推荐分两个 PR 或两个部署阶段。

### 5.1 阶段 A：灰度可用

目标：生产能直接访问 `/th`，但先不主动推给搜索引擎和普通用户。

做法：

- `routing.locales` 包含 `th`，让 `/th` 可用。
- 但新增 `PUBLIC_LOCALES` 或 `INDEXABLE_LOCALES` 常量，灰度期先不包含 `th`。
- `locale-switcher` 使用 `PUBLIC_LOCALES`，灰度期不显示 `TH`。
- `sitemap` 使用 `INDEXABLE_LOCALES`，灰度期不输出 `th`。
- `hreflang` 使用 `INDEXABLE_LOCALES`，灰度期不输出 `th-TH`。
- 如需更保守，可对 `/th` 暂时加 `noindex`，正式公开时移除。

建议新增一个 locale 配置文件，避免到处硬编码：

- `apps/web/i18n/locales.ts`

建议内容：

```ts
export const ALL_LOCALES = ["id", "vi", "en", "zh", "th"] as const;
export const PUBLIC_LOCALES = ["id", "vi", "en", "zh"] as const;
export const INDEXABLE_LOCALES = PUBLIC_LOCALES;
```

公开泰语时只改为：

```ts
export const PUBLIC_LOCALES = ["id", "vi", "en", "zh", "th"] as const;
export const INDEXABLE_LOCALES = PUBLIC_LOCALES;
```

注意：如果实现不想引入灰度常量，也可以直接公开上线，但风险更高，不推荐。

### 5.2 阶段 B：正式公开

达到门禁后：

- 语言切换器显示 `TH`。
- sitemap 输出泰语 URL。
- hreflang 输出 `th-TH`。
- GSC 提交新版 sitemap。
- PostHog/GA4 开始观察 Thai segment。

## 6. 代码改动清单

执行者要逐项检查，不要只改一两个文件。

### 6.1 Shared types / AI content

文件：

- `packages/types/src/index.ts`
- `packages/ai-content/src/locale-meta.ts`
- `packages/ai-content/src/translate.ts`
- 新增 `packages/ai-content/src/glossary/th-football-terms.ts` 或等价文件。
- 如做 LLM QA，新增 `packages/ai-content/src/thai-quality.ts` 或等价模块。

改动：

- `Locale` 增加 `"th"`。
- `LOCALE_META` 增加：
  - englishName: `Thai`
  - label: `TH`
  - htmlLang: `th`
- 翻译 prompt 增加泰语术语规则。
- 增加泰语禁用词规则，尤其避免博彩导向。

建议泰语术语表：

```text
World Cup 2026 -> ฟุตบอลโลก 2026
live scores -> ผลบอลสด
schedule -> ตารางบอล
fixtures -> โปรแกรมการแข่งขัน
prediction -> วิเคราะห์ / คาดการณ์
score prediction -> คาดการณ์สกอร์
standings -> ตารางคะแนน
group -> กลุ่ม
kickoff -> เวลาเริ่มแข่งขัน
full-time -> จบเกม
half-time -> พักครึ่ง
preview -> พรีวิว
match recap -> สรุปผลการแข่งขัน
team -> ทีม
national team -> ทีมชาติ
```

泰语博彩/高风险词应尽量避免：

```text
แทงบอล
เว็บพนัน
ราคาบอล
ทีเด็ดบอล
พนันบอล
เจ้ามือ
อัตราต่อรอง
```

注意：有些词在泰国搜索量可能大，但本项目当前有 AdSense、品牌安全和“预测不是博彩建议”的定位，不要用这些词做 SEO。

### 6.2 Web i18n / routing

文件：

- `apps/web/i18n/routing.ts`
- `apps/web/i18n/request.ts`
- `apps/web/i18n/navigation.ts`
- 新增 `apps/web/i18n/locales.ts`，如果采用灰度常量。
- `apps/web/messages/th.json`

改动：

- `locales` 加 `th`。
- pathnames 中为所有公开页面补 `th`。
- 新增完整泰语 message catalog。
- message leaf 数量应与 `en/id/vi` 基本一致，目前约 368 条。

验收：

- `node` 脚本统计 `apps/web/messages/*.json` leaf 数量，`th` 不应明显少于其他语言。

### 6.3 Header / locale switcher / layout / fonts

文件：

- `apps/web/components/locale-switcher.tsx`
- `apps/web/app/[locale]/layout.tsx`
- `apps/web/app/globals.css`

改动：

- `LABELS.th = "TH"` 或 `ไทย`。建议导航按钮短，用 `TH`。
- `HTML_LANG.th = "th"`。
- 增加泰语字体。

推荐字体策略：

- 使用 `Noto_Sans_Thai`。
- `locale === "th"` 时加 `font-th` class。
- CSS 中设置 `.font-th` 的 font-family。

不要只依赖 `Inter` 或 `Noto Sans SC` 显示泰语。

### 6.4 SEO metadata

文件：

- `apps/web/lib/seo.ts`
- `apps/web/app/sitemap.ts`
- `apps/web/app/news-sitemap.xml/route.ts`
- `apps/web/app/robots.ts` 通常不用改。

改动：

- `HREFLANG.th = "th-TH"`。
- `OG_LOCALE.th = "th_TH"`。
- `PAGE_DESCRIPTIONS.th` 补全所有 PageSeoKind。
- `matchSeoDescription()` 增加 `th`。
- `NEWS_LANG.th = "th"`。
- sitemap 公开期包含 `th` URL。

验收：

- 泰语页面 canonical 自指。
- 泰语页面 hreflang 包含 `th-TH`。
- sitemap 与 HTML hreflang 一致。

### 6.5 时间和本地化格式

文件：

- `apps/web/lib/kickoff-time.ts`
- `apps/jobs/src/send-daily-digest.ts`

改动：

- 增加 `th`：
  - `intlLocale: "th-TH"`
  - `timeZone: "Asia/Bangkok"`
  - time label: `ICT` 或 `เวลาไทย`

建议前台页面显示泰国本地时间，不要默认用 Jakarta/Manila。

### 6.6 Admin / runtime data

文件：

- `apps/web/lib/runtime-data.ts`
- `apps/web/app/admin/content/page.tsx`
- `apps/web/app/admin/subscribers/page.tsx`
- `packages/db/drizzle/0009_admin_overview_stats_rpc.sql`
- 新增 migration：`packages/db/drizzle/0015_admin_overview_stats_th_locale.sql`

改动：

- `ADMIN_LOCALES` 增加 `th`。
- `ARTICLE_LOCALES` 增加 `th`。
- `SUBSCRIBER_LOCALES` 增加 `th`。
- admin overview RPC 的 locale distribution 增加 `th`。

注意：

- 不要改历史 migration 的含义来假装已经应用。
- 如果需要生产 RPC 显示 `th`，新增 migration 或通过 Supabase SQL 更新函数。

### 6.7 法律页 / 广告页 / 观赛页

文件：

- `apps/web/app/[locale]/legal-content.tsx`
- `apps/web/app/[locale]/nonton/page.tsx`
- `apps/web/app/[locale]/iklan/page.tsx`

改动：

- privacy / terms 增加泰语文案。
- `/nonton` 的 region 列表加入 Thailand。
- 不要放盗播链接。
- 如果不能确认泰国官方 rights holder，就显示待确认并链接 FIFA 官方页。
- 广告页文案更新为覆盖 Thailand，不要继续只写 Indonesia/Vietnam/Philippines。

### 6.8 Jobs / notifications / live commentary

文件：

- `apps/jobs/src/send-daily-digest.ts`
- `apps/jobs/src/send-premium-email.ts`
- `apps/jobs/src/whatsapp.ts`
- `apps/jobs/src/live-commentary.ts`
- `apps/jobs/src/send-notifications.ts` 如有本地化 copy。
- `apps/jobs/scripts/run-generate-news.ts`
- `apps/jobs/scripts/regenerate-predictions.ts`
- `apps/jobs/scripts/run-generate-batch.ts` 类型自动覆盖即可，但要测试 `--locale th`。

改动：

- jobs locale arrays 增加 `th`。
- daily digest 增加 Thai copy、Bangkok time、Thai schedule path。
- premium email 增加 Thai copy。
- WhatsApp template language code 增加 `th`。
- live commentary 模板增加 Thai 文案。
- `run-generate-news.ts` 的 `TARGET_LOCALES` 增加 `th`。
- `regenerate-predictions.ts` 的 `ALL_LOCALES` 增加 `th`。

重要提醒：

- jobs 里有些链接目前是硬编码路径，例如 `/${locale}/pertandingan/${slug}`。如果给 `th` 的 match path 使用 `/การแข่งขัน/[slug]`，必须为 jobs 增加 locale path map，不能继续硬编码 Indonesian slug。
- 不要因为已有语言可能也有这个问题就忽略泰语；泰语新增路径必须能点通。

## 7. 泰语内容回填方案

### 7.1 不要从零自由生成

不要让 LLM 直接写泰语原创文章作为首批内容，因为容易：

- 编造事实。
- 加入错误背景。
- 误写比分/日期。
- 产生博彩导向措辞。

首批内容应使用：

- 英文 published 文章作为 base。
- 将 base 忠实翻译成泰语。
- 通过 LLM 质检和回译后再发布。

### 7.2 新增脚本

建议新增：

- `apps/jobs/scripts/backfill-th-articles.ts`

脚本能力：

- 读取 `articles` 中 `sourceLocale=en` 且 `status=published` 的文章。
- 跳过已存在 `(slug, "th")` 的文章。
- 翻译到泰语。
- 提取 Thai H1 作为 title。
- 生成 summary。
- 复制原文的：
  - slug
  - type
  - fixtureId
  - teamId
  - groupName
  - topicId
  - imageUrl
  - sources
  - embeds
- 根据 QA gate 决定 `published` 或 `draft`。
- 支持：
  - `--dry-run`
  - `--limit`
  - `--type`
  - `--source en`
  - `--target th`
  - `--publish`

建议命令：

```bash
pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --dry-run --limit 5
pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --limit 30
pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --limit 320
```

### 7.3 LLM 质检 gate

没有泰语人工时，必须使用多步骤 LLM QA。

流程：

1. 模型 A：英文 base -> 泰语翻译。
2. 模型 B：泰语审稿，输出严格 JSON。
3. 模型 C：泰语 -> 英文回译。
4. 程序比较 base 与回译的关键实体和数字。
5. 程序规则检查。
6. 通过则 published，否则 draft。

审稿 JSON 建议：

```json
{
  "fidelity": 0,
  "thai_fluency": 0,
  "football_terms": 0,
  "seo_title": 0,
  "has_added_facts": false,
  "has_gambling_language": false,
  "has_piracy_language": false,
  "risk_notes": []
}
```

发布阈值：

- `fidelity >= 9`
- `thai_fluency >= 8`
- `football_terms >= 8`
- `seo_title >= 8`
- `has_added_facts === false`
- `has_gambling_language === false`
- `has_piracy_language === false`
- 实体一致率 100%

低于阈值：

- 插入 draft 或不插入。
- 不要为了凑数量硬发。

### 7.4 程序规则检查

必须检查：

- H1 存在。
- body 非空。
- title 长度合理。
- summary 非空或可从 body 生成。
- markdown 结构没有破坏。
- 没有大量印尼语/越南语/中文残留。
- 没有博彩词。
- 没有盗播词。
- 比分格式与 base 一致。
- 日期、年份、球队名、球员名不丢失。

严重问题直接 draft：

- 球队名不一致。
- 比分不一致。
- 预测比分被改。
- 加入原文没有的伤病/阵容/转会。
- 出现博彩建议。
- 出现盗播引导。

### 7.5 首批内容目标

首批回填目标：

- `preview`：72。
- `watchpoints`：72。
- `prediction`：72。
- `group_analysis`：12。
- `recap`：16。
- `news`：50-60。

总目标：

- 泰语 published：280-310。
- draft 可以存在，不要硬发。

最低公开门槛：

- 泰语 published >= 250。
- 所有 72 个 match pages 至少有 prediction 或 preview 中的一种泰语内容。
- 首页、新闻页、文章页不出现空壳。

推荐公开门槛：

- 泰语 published >= 280。
- 每场比赛有 preview/watchpoints/prediction 三件套或接近三件套。
- 小组页 12 篇 group analysis 全部有。

## 8. 执行阶段和门禁

### Phase 0：重新确认生产基线

不要直接开改。先记录基线。

命令建议：

```bash
git status --short --branch
pnpm --version
node --version
curl -I -L https://skorly.cc/
curl -I -L https://skorly.cc/id
curl -I -L https://skorly.cc/vi
curl -I -L https://skorly.cc/en
curl -I -L https://skorly.cc/zh
curl -L https://skorly.cc/robots.txt
curl -L https://skorly.cc/sitemap.xml | head
```

需要记录：

- 当前 sitemap URL 数。
- 当前 `/id /vi /en /zh` 是否 200。
- 当前 git dirty 状态，不能覆盖用户已有改动。

门禁：

- 当前生产不是明显故障状态。
- 工作区脏文件已识别。

### Phase 1：实现泰语 locale 和 UI

完成：

- Shared Locale 加 `th`。
- `routing.locales` 加 `th`。
- `messages/th.json` 完整。
- layout/font/locale switcher 支持 `th`。
- 本地 `/th` 能渲染。

验证：

```bash
pnpm typecheck
pnpm --filter @skorly/web test
pnpm --filter @skorly/web build
```

门禁：

- typecheck 通过。
- build 通过。
- messages leaf 数量与其他语言一致或接近。

### Phase 2：实现 SEO 和 sitemap 支持

完成：

- `seo.ts` 补 `th`。
- sitemap 支持灰度/public locale 常量。
- news sitemap 支持 `th`。
- canonical/hreflang 正确。

验证：

- 本地或预览环境抽查：
  - `/th`
  - `/th/ฟุตบอลโลก-2026`
  - `/th/ผลบอลสด`
  - `/th/ตารางบอล`
  - 一篇 `/th/บทความ/[slug]`
  - 一场 `/th/การแข่งขัน/[slug]`

门禁：

- HTML title 是泰语。
- meta description 是泰语。
- canonical 自指。
- public 阶段 hreflang 包含 `th-TH`。
- sitemap 不包含 404。

### Phase 3：实现 jobs 和通知支持

完成：

- daily digest Thai。
- premium email Thai。
- WhatsApp language code Thai。
- live commentary Thai。
- generation scripts include `th`。

验证：

```bash
pnpm --filter @skorly/jobs test
pnpm typecheck
```

如没有测试覆盖，至少跑相关脚本 dry-run。

门禁：

- jobs build/typecheck 不报错。
- 不因为 `th` 缺 copy 而 fallback 错误。
- Thai notification links 能点到真实 localized routes。

### Phase 4：内容回填和 QA

先 dry-run：

```bash
pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --dry-run --limit 5
```

再小批量：

```bash
pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --limit 30
```

检查：

- DB 中 `locale=th` 是否插入。
- published/draft 比例是否合理。
- 抽样页面是否渲染泰语。
- QA log 是否存下审稿结果。

再全量：

```bash
pnpm tsx --env-file=.env apps/jobs/scripts/backfill-th-articles.ts --limit 320
```

门禁：

- `th` published >= 250，推荐 >= 280。
- LLM QA 严重事实错误 0。
- 博彩/盗播词 0。
- 抽样 30 篇，所有关键实体一致。

### Phase 5：灰度部署

部署前：

```bash
pnpm typecheck
pnpm test
pnpm build
```

如果项目用 Cloudflare deploy：

```bash
pnpm --filter @skorly/web cf:deploy
```

灰度期：

- `/th` 可直接访问。
- 先不进导航和 sitemap，或短时间不进。
- 观察 24-72 小时。

生产 smoke：

```bash
curl -I -L https://skorly.cc/th
curl -I -L https://skorly.cc/id
curl -I -L https://skorly.cc/vi
curl -I -L https://skorly.cc/en
curl -I -L https://skorly.cc/zh
```

门禁：

- 现有四种语言无 5xx。
- `/th` 200。
- Worker error rate 不升高。

### Phase 6：正式公开

公开动作：

- `PUBLIC_LOCALES` / `INDEXABLE_LOCALES` 加 `th`。
- 语言切换器显示 `TH`。
- sitemap 输出 `th` URL。
- hreflang 输出 `th-TH`。
- 如果灰度期对 `/th` 加了 noindex，移除。
- 提交 GSC sitemap。

公开后验证：

- sitemap URL 数增加约 500+。
- `th` sitemap URL 抽样 50 个，0 个 404/5xx。
- `/th` 页面可从导航切换进入。
- 文章页 hreflang 互相一致。

## 9. 验收标准

### 9.1 技术验收

必须全部满足：

- `pnpm typecheck` 通过。
- `pnpm test` 通过，或明确说明哪些测试不存在。
- `pnpm build` 通过。
- `https://skorly.cc/id` 200。
- `https://skorly.cc/vi` 200。
- `https://skorly.cc/en` 200。
- `https://skorly.cc/zh` 200。
- `https://skorly.cc/th` 200。
- `/` 仍然不强制泰语。
- `robots.txt` 正常。
- sitemap XML 200。
- news sitemap XML 200 或有合理 fallback。

### 9.2 SEO 验收

公开阶段必须满足：

- `/th` canonical 指向 `https://skorly.cc/th`。
- 泰语详情页 canonical 自指。
- hreflang 包含：
  - `id`
  - `vi`
  - `en`
  - `zh-Hans`
  - `th-TH`
  - `x-default`
- sitemap 与 HTML hreflang 一致。
- `news-sitemap.xml` Thai article 使用 language `th`。
- Thai URLs 都是 canonical、indexable、200。

### 9.3 内容验收

推荐满足：

- `th` published >= 280。
- `th` draft 可以存在，但不要超过 20-30%。
- 72 个 match pages 不空。
- 12 个 group pages 有泰语 group analysis。
- 首页 latest article 不为空。
- 新闻页至少有 50 篇泰语 news 或可用文章。

### 9.4 LLM QA 验收

必须满足：

- 每篇泰语文章有 QA gate 结果。
- `fidelity >= 9` 才能 published。
- `thai_fluency >= 8` 才能 published。
- `football_terms >= 8` 才能 published。
- 实体一致性 100%。
- 博彩/盗播词 0。

如果抽样复审失败率 > 5%，停止公开，回到内容修复。

### 9.5 生产可用性验收

公开后 24 小时观察：

- Worker 5xx 不明显升高。
- 200-request smoke：0 个 5xx。
- 泰国 Bangkok 探针 `/th` 200。
- TTFB 不高于当前基线太多；当前基线约 2.4-2.7s。
- 后续优化目标：泰国 p75 TTFB < 800ms，p95 < 2s。

## 10. 回滚方案

### 10.1 代码回滚

如果影响现有语言：

- 立即回滚到上一版 Cloudflare Worker。
- 不继续修线上。
- 先恢复 `/id /vi /en /zh`。

### 10.2 只隐藏泰语

如果只有泰语质量或 SEO 有问题：

- 从 `PUBLIC_LOCALES` 移除 `th`。
- 从 `INDEXABLE_LOCALES` 移除 `th`。
- 语言切换器隐藏 `TH`。
- sitemap/hreflang 不输出 `th`。
- 可临时给 `/th` 加 noindex。

### 10.3 数据回滚

不要直接删除 `th` 文章。

如果泰语内容质量有问题：

- 批量把 `locale=th` 且有问题的文章设为 `draft`。
- 保留 qaLog 方便修复。
- 修复后重新发布。

### 10.4 Jobs 回滚

如果通知/邮件有问题：

- 先从 jobs 的 locale arrays 中移除 `th`。
- 不影响 web 页面。
- 修好 copy 和 route link 后再恢复。

## 11. 不要做的事

不要：

- 直接把 `/` 默认改成 `/th`。
- 直接按 IP 强制跳泰语。
- 只新增 `messages/th.json` 就上线。
- 没有泰语文章就把 `/th` 放进 sitemap。
- 一键翻译全部并无 QA 发布。
- 用博彩关键词做泰语 SEO。
- 放盗播/非法直播链接。
- 泄露 `.env` 或 `/Users/johnmacmini/workspace/.env` 里的密钥。
- 覆盖用户已有未提交变更。
- 改历史 migration 来伪造已应用状态。

## 12. 建议给下个 session 的启动提示

可以把下面这段发给新 session：

```text
请按 docs/thai-locale-rollout-plan.md 执行 Skorly 泰语版本上线。
要求：
1. 先重新确认生产和本地基线，不要直接改代码。
2. 不改变 / 默认跳 /id 的策略。
3. 先让 /th 灰度可用，再公开到 sitemap/hreflang/语言切换器。
4. 没有泰语人工审核，必须实现 LLM 翻译 + LLM 审稿 + 回译校验 + 规则检查。
5. 首批泰语 published 内容目标 280-310 篇，低质量内容进 draft。
6. 所有现有 id/vi/en/zh 生产 URL 不得回归。
7. 不要泄露任何 .env 密钥。
```

## 13. 推荐执行顺序摘要

1. 重新测生产基线。
2. 新建分支：`codex/thai-locale-rollout`。
3. 加 `th` 到 shared Locale 和 locale metadata。
4. 新增 `messages/th.json`。
5. 加泰语路由、SEO、字体、时间格式。
6. 加 admin/runtime locale 支持。
7. 加 legal/watch/advertise Thai copy。
8. 加 jobs Thai copy 和 localized route links。
9. 新增 Thai translation + QA + backfill script。
10. dry-run 5 篇。
11. 小批量 30 篇。
12. 全量 280-310 篇目标。
13. 本地 typecheck/test/build。
14. 灰度部署 `/th`。
15. 24-72 小时观察。
16. 公开 `TH` 到导航、sitemap、hreflang。
17. GSC 提交 sitemap。
18. 24 小时生产监控。
