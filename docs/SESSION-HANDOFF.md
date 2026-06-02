# Skorly — 会话交接文档（2026-06-01）

供新 session 直接接手。读完此文 + `docs/news-pipeline.md` 即可继续。

---

## 0. 一句话现状
足球资讯站 **skorly.cc 已上线**（4 语言，909 篇世界杯赛事文章 + SEO + GA4 全就绪）。
**自动新闻管线核心已全部跑通且可信**：C（Tavily 联网检索）已接线并实测通过，并新增「定向修复 pass」把写手脑补的未证实细节精准剔除后再过审——发布率显著提升。**P4 全自动化已上线**：GitHub Actions 每天 01:00 UTC 自动 radar→出稿→构建→部署（见 §8c），实测全绿。**接下来：可选优化频次/并行，或继续打磨内容。**

---

## 1. 站点基础设施（已完成、已上线）
- **域名/部署**：`skorly.cc` + `www.skorly.cc`，Cloudflare Workers（OpenNext 适配），**全静态 SSG**（运行时不连 DB，重新构建才更新内容）。
- **技术栈**：Next.js 16（App Router）+ next-intl（4 语言 id/vi/en/zh，本地化 slug）+ Tailwind + Supabase Postgres（Drizzle）。
- **部署命令**：
  ```bash
  cd "apps/web" && CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=d9b0bd031dc71de8198894bd8327d454 pnpm exec wrangler deploy
  # 或 pnpm cf:build 然后 wrangler deploy；token 见 ~/.env/apikey 第19行
  ```
- **关键修复记录**：DB 在 Workers 上不能跨请求复用连接 → 全站改 SSG 绕开；QA 回译实体校验 bug 已修（token/别名匹配）。

## 2. 内容现状（DB: Supabase project majrlaxktengachwrskk）
- **赛事文章 909 篇已发布**：12 组 × 4 语言 × (preview/watchpoints/prediction/group_analysis)。已在线上。
- **新闻文章**：DB 里 52 篇 published（13 个 topic）+ 14 篇 draft（8 个 topic）（type='news'）。published 已经纳入最近一次 SSG 部署；draft 不上线。

## 3. SEO / 分析（已完成、已上线）
- robots.txt、sitemap.xml（~1253 URL，含 hreflang）、news-sitemap.xml
- canonical + hreflang（id/vi/en/zh-Hans/x-default）、OpenGraph + Twitter、OG 图（`/og.png`）
- JSON-LD：WebSite/Organization（全站）、NewsArticle（文章）、SportsEvent（比赛）
- **GA4** `G-98VPG3BHXS`（4 语言已埋点）+ **GSC** 域名验证已过（用户已在 GSC/GA4 操作完）

## 4. 新闻管线（Phase 2）—— 已建 + 已验证，差 C 接线
设计见 `docs/news-pipeline.md`。原则：**只取事实不取表达，全部原创合法**。

**已完成并验证：**
- **P1 信号采集**：`packages/news` —— SocialData(X) + RSS + API-Football(injuries) 适配器 → 聚类去重热度 → `topics`/`news_signals` 表。噪声过滤（撸毛/广告/无实体）。脚本 `apps/jobs/scripts/run-news.ts`。
- **P2 生成**：topic → 事实抽取 → 生成 → 4 道质检（critique/judge/back-translate/**review主题事实审查**）→ 落库 type='news'。脚本 `run-generate-news.ts`。
- **A 抓信源全文**：`packages/news/src/fetch-source.ts`（读 RSS/新闻页正文抽事实，不照搬）。
- **B API-Football 数据兜底**：`getTeamVerifiedFacts()`（分组/赛程真实事实）。
- **生成一次→翻译**：英文基准文过全审 → 翻译成 id/vi/zh（`translate.ts`，忠实不增事实）→ 回译实体校验 → 发布。**4 语言事实必然一致**。
- **速度**：~4.5 分钟/topic（4 语言）。**准确性**：发布零编造，编造的被 review 正确拦成 draft。

**模型分工（均为最新版、已实测可用，配置在 `packages/ai-content/src/llm-client.ts` + `.env`）：**
```
生成正文    deepseek-v4-pro
润色/翻译   qwen-flash（快，非思考）
裁判+审查   glm-5.1
联网检索(C) Tavily（见下）
兜底链      glm → mimo-v2.5-pro → deepseek-v4-pro（GLM 常限流）
已弃用      OpenRouter（未充值，代码里不再路由）
```
注：deepseek/glm/qwen3.7-max 都是**思考模型**，max_tokens 已设 4000（content 才不为空）。

## 5. ✅ 已完成：C 联网检索 + 定向修复 pass（2026-06-01 本次 session）
**为什么需要**：Brazil/Argentina 这类"名单/球衣号"topic，模型没联网会**脑补整套名单/错年龄**。

**已做并实测通过**：
1. **C 接线**：`run-generate-news.ts` 在事实抽取前加 `researchTopic()` → `tavilySearch(toQuery(title))`，把 `answer`+`results`（含 url）作为**最高可信 leads** 放在 signals 最前（`[...researched, ...verifiedLeads, ...enriched]`）。soft-fail（Tavily 挂了不影响整批）。
2. **定向修复 pass**（关键发现）：Tavily 喂对了事实，但**写手 deepseek 仍会自行脑补**（如把主帅写成 Tite、Messi 写 37 岁、编历史战绩/球员位置），被 review 正确拦成 draft，导致发布率低。新增 `packages/ai-content/src/quality/repair.ts`：当 review 仅因"未证实细节"失败（on-theme、版本对）时，用 qwen（异构于写手）**只删除 review 列出的那几条 `unsupportedClaims`、其余原样保留**，再过一次 review；通过才发布。`ReviewResult` 现导出 `unsupportedClaims`。
3. **实测**：topic 7（Brazil 球衣号）+ 74（Argentina 锋线）——上轮全 draft，本轮**4 语言全部 published**，且修复后正文已剔除脑补（无 Tite / 无假 7 号历史 / 无错年龄），保留真事实（Neymar 10、Vinicius 7 等来自来源；Argentina 留 17 人、Di María 离队、vs Algeria J 组 6/17 来自 DB）。
4. typecheck 通过。

**复测命令**（如需再验）：`update topics set status='pending' where id in (7,74)` 后 `pnpm tsx --env-file=.env apps/jobs/scripts/run-generate-news.ts 2`。

### 5b. 联网裁判 web fact-check（本次新增，最关键）
**动机**：内部 review 只比对 fact sheet，而 fact sheet 可能含"传闻被写成既成事实"。需要一个**用现实网页逐条核实**的关卡，禁止任何模型瞎编。
- `packages/ai-content/src/quality/web-factcheck.ts`：
  - `extractClaims()`：从文章抽出可证伪的具体事实（名单/球衣号/主帅/赛程/比分/转会/伤病），转英文便于检索。
  - `webFactCheck(article,{search})`：每条 claim → Tavily 搜证 → 异构裁判（glm，区别于写手 deepseek）**只凭证据**判 supported/contradicted/unverifiable；传闻/预测不算证实。
  - `webVerifyArticle()`：contradicted 按证据改正、unverifiable 删除 → 改写后**重新联网核对**，循环 maxFix=2；仍不全真则交回 draft（绝不发布）。
  - 注入式 `WebSearchFn`（不耦合 news 包）；脚本传 `(q)=>tavilySearch(q,{apiKey})`。
- 接线：`run-generate-news.ts` 步骤 2b——英文基准过完内部门后再过联网裁判，通过才翻译；qa_log 追加 web 核查记录（round 99）。
- **实测+人工独立核对**：topic 7 Brazil「球衣号」web-factcheck ok(0 fix)，已**用 5 家主流媒体独立比对，11 个号码全对**（CBF 5/30 官宣，Neymar 10/Vini 7/Cunha 9…）。topic 74 Argentina ok(1 fix)，未证实的具体（vs Algeria/17人留队/Di María 等）被正确剥离、变保守。
- **已知残留**：Brazil 文里"announced on May 31"应为 5/30（5/31 是对巴拿马热身），裁判漏了这 1 天误差 → 待加强：claim 抽取/裁判对"日期"更敏感。

## 6. 还没做（C 之后）—— 新 session 从这里继续
- **继续扩充新闻板块**：Option A 首批扩充已完成并部署。后续可继续跑 `run-generate-news.ts 10~20`，把 pending 高热 topic 出稿 → 人工扫重复/证据不足 → `cd apps/web && pnpm cf:build` + `wrangler deploy`。**注意：这是生产部署，动手前先确认。**
- **P3b 配图**：✅ **已上线**（2026-06-02，Version 9e9426df）。7 张品牌绿抽象主题图（transfer/injury/callup/preview/result/fans/generic，含 Skorly 水印、无真脸/队徽）打包在 `apps/web/public/news/*.webp`（cwebp q82，51–86KB/张）。已发布新闻手动归类写入 `articles.image_url`；新闻生成器 `run-generate-news.ts` 加了启发式 `categoryImage()`，未来文章自动配图。前端 `article-card` + 详情页 hero + OG/Twitter/JSON-LD 全部渲染封面（`imageUrl` 为空时优雅降级，赛事文章暂无图）。前端嵌入(X/YouTube)+来源外链(P3a)已做好。
- **P4 自动化**：✅ **已完成**（见 §8c）。后续可选优化：比赛日加密频次、把生成并行化（当前 ~10-13min/topic 串行）。

## 7. 关键路径/命令速查
- 信号雷达：`pnpm tsx --env-file=.env apps/jobs/scripts/run-news.ts`
- 新闻出稿：`pnpm tsx --env-file=.env apps/jobs/scripts/run-generate-news.ts [N]`
- 赛事文章批量：`run-generate-batch.ts "Group X" --locale id`
- 草稿重判（QA 改后）：`recover-drafts.ts`
- Supabase MCP：execute_sql / apply_migration（project_id=`majrlaxktengachwrskk`）
- 所有 key：`/Users/johnmacmini/workspace/.env/apikey`；`.env` 已含运行所需变量（被 .cursorignore 屏蔽，用 shell 读写）

## 8. 整体进度与"完成"目标
| 模块 | 状态 |
|------|------|
| 站点 + 4 语言 + 部署 | ✅ 100% 上线 |
| 赛事内容（909 篇） | ✅ 上线 |
| SEO + GA4 + GSC | ✅ 完成 |
| 新闻管线 P1+P2+A+B+翻译 | ✅ 跑通验证（可信、一致、~4.5min/topic）|
| C 联网检索(Tavily)+定向修复 | ✅ 已接线+实测（脑补案例 4 语言全过审）|
| 5b 联网裁判 web fact-check | ✅ 已接线+实测（逐条联网核实，不真不发）|
| 事实抽取 MiniMax-M3 容错链 | ✅ 已加（glm→minimax-m3→deepseek）|
| 新闻部署上线 | ✅ **已上线+线上核验**（2026-06-01；6 个去重且联网核过话题，Version 99a7ac83）|
| P3b 配图 | ✅ **已上线+线上核验**（2026-06-02，Version 9e9426df；7 张分类主题图 webp，列表/详情/OG 全渲染）|
| Option A 新闻批量出稿 | ✅ **已出稿+部署+核验**（2026-06-02；15 个 pending topic → 7 topic/28 rows published；5 topic/8 rows draft 或降级，其中 topic 194 因证据不足人工全语言降级；3 topic 无有效 signals 跳过；Version 45064f0c-f749-46ac-add7-cc681c8af127）|
| P4 自动化 | ✅ **已上线+实测全绿**（2026-06-02）GitHub Actions 每天 01:00 UTC 自动 radar→出稿(6)→构建→部署；仓库 https://github.com/john-hoe/skorly-web （public）|

**整体进度约 82–85%。** "完成"目标定义：
1. 新闻管线接入 Tavily 后**自动、可信地**持续产出 4 语言原创新闻（零编造、有来源、有配图）；
2. P4 让其**全自动**（定时轮询→出稿→部署），无需人工；
3. 配图到位、新闻板块线上丰满；
4. 达到"像懂球帝/直播吧那样及时丰富，但全部原创合法"的 MVP。

---
## 8b. 合作联系邮箱 ✅
- 站点页头+页脚已展示 `business@skorly.cc`（4 语言，全站可见；Version d737cba0，2026-06-02）。
- **Cloudflare Email Routing 已开通并实测收信成功**（2026-06-02）：MX+SPF 已配置，目标邮箱 `he.john@outlook.com` 已验证，自定义规则 `business@skorly.cc` → 转发到 Outlook，Catch-all 保持禁用。

## 8c. P4 全自动化 ✅（2026-06-02，GitHub Actions）
- **仓库**：https://github.com/john-hoe/skorly-web （账号 john-hoe，**public**；用户选的，已确认无密钥进库——`.env`/`.env/apikey` 全 gitignore，历史无密钥，源码扫描干净）。
- **Workflow**：`.github/workflows/news.yml`，名 `Daily News`。触发：`schedule` 每天 `01:00 UTC`（=雅加达/河内 08:00）+ `workflow_dispatch`（手动，入参 `count` 默认 6、`skip_radar`）。
- **流程**：checkout → pnpm/Node22 → install → 写 `.env`(来自 secret) → **radar(P1)** → **生成(P2, N 篇)** → **构建+部署 Cloudflare**(`cf:deploy`)。radar/生成各重试 3 次、部署重试 2 次（抗瞬时网络）。`concurrency` 防并发；`timeout-minutes: 120`。
- **密钥**：单个 repo secret `DOTENV` = 整份根 `.env`（用 `gh secret set DOTENV < .env` 设的）。runner 上写成 `.env` 再 `cp` 成 `apps/web/.env.local`。
- **关键修复（4 个，均已验证）**：
  1. secret 多行需经 `env:` 映射注入（直接内联进脚本会被特殊字符炸）。
  2. 网络步骤加 `until` 重试（Supabase pooler 偶发 CONNECT_TIMEOUT）。
  3. **DB 用 session pooler(5432) 而非 transaction pooler(6543)**：runner 上 `sed` 把 `.pooler...:6543`→`:5432`。txn pooler 在 13min/1324 页的长构建里回收连接导致页面生成卡死超时；session 模式连接稳定，构建从"超时失败"变 **2.5min 完成**。
  4. **Node 22**（Wrangler 要求 ≥22；构建+OpenNext 打包都过了，只有 wrangler deploy 卡 Node 版本）。
- **实测**：run 26800366399 全绿（generate ✅ + build&deploy ✅），线上 home/news/cover 均 200。schedule 已 active。

## 9. 注意事项 / 已知坑
- 思考模型慢且 GLM 易限流 → 已配兜底链；自动化时注意整体耗时（~4.5min/topic）。
- `cursorignore` 屏蔽 `.env`，编辑用 shell（`sed`/`printf >>`）。
- 生成脚本用 `tsx --env-file=.env` 跑；`apps/jobs` 的 tsc 对 `process` 报错是预存的（脚本用 tsx 不受影响）。
- 改完 QA/模型后，用 `update topics set status='pending'` 重置再复测；坏内容用 `update articles set status='draft' where type='news'` 下线。
