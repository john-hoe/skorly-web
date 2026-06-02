# News → Original Article Pipeline (设计)

目标：像懂球帝/直播吧一样**及时、丰富**地产出足球资讯，但**全部原创、合法**，可扛 Google 垃圾内容政策与版权风险。

核心原则：**只取事实，不取表达。** 竞品/新闻源只作为「选题与事实线索」，文章一律用我们自己的生成器原创，图片只用我们拥有或合法授权的。

---

## 全景流程（含各环节 LLM）

```
[1 信号采集]        SocialData(X) + RSS + API-Football事件 + 标题雷达        【无 LLM】
        │              → news_signals（标题/URL/来源/时间/实体）+ 噪声过滤
        ▼
[2 聚类去重排序]     同一事件归并，按「热度×相关度×时效」打分 Top N        【无 LLM】
        │              → topics
        ▼
[C 联网研究]        Tavily 联网搜真实当下事实（名单/球衣号/赛程）         【Tavily 搜索API】
        │              → 高可信 leads，置于 signals 最前
        ▼
[3 事实抽取]        多源信号→纯事实+来源URL，丢弃单源传闻                 【GLM-5.1 → MiniMax-M3 → DeepSeek-V4-Pro】
        │              → fact sheet（谁/什么/何时/数据，禁止抄原文）
        ▼
[4 生成英文基准]    仅凭 fact sheet 原创正文                             【DeepSeek-V4-Pro (generate)】
        │   ├ 4.1 母语润色                                              【Qwen-Flash (critique)】
        │   ├ 4.2 打分裁判 fluency/factual/seo（异构防自评）            【GLM-5.1 (judge)】
        │   ├ 4.3 回译实体/数字校验                                     【Qwen-Flash (fallback)】
        │   ├ 4.4 编辑审查：on-theme/grounded/对fact sheet忠实          【GLM-5.1 (judge)】
        │   └ 4.5 定向修复：只删 review 标出的「写手脑补」细节，再审    【Qwen-3.7-Max (critique)】
        ▼
[5 联网事实核查]    «联网裁判» —— 拿现实网页逐条核实，禁止瞎编
        │   ├ 5.1 抽取可证伪 claim（名单/号码/主帅/赛程/日期）          【GLM-5.1 (judge)】
        │   ├ 5.2 每条 claim 联网搜证                                   【Tavily 搜索API】
        │   ├ 5.3 逐条裁判 supported/contradicted/unverifiable（只凭证据）【GLM-5.1 (judge)】
        │   └ 5.4 contradicted按证据改正 / unverifiable删除 → 重核循环  【Qwen-3.7-Max (critique)】
        │          通过=英文基准全真；改不干净=退回 draft（绝不发布）
        ▼
[6 翻译成 id/vi/zh] 忠实翻译已核过的英文基准（不新增事实）             【Qwen-Flash (critique)】
        │   └ 6.1 每语言回译实体校验，过则发布                          【Qwen-Flash (fallback)】
        ▼
[7 配图]            封面/og=自有图(GPT Image-2) + 正文嵌入官方(YT/X)     【GPT Image-2（出图，非文本）】
        ▼
[8 发布+上线]       写 articles(type='news')；SSG 重新构建部署           【无 LLM】
```

**模型分工总表（角色 = `llm-client.ts` 的 role）**

| 环节 | role | 模型 | 为什么是它 |
|---|---|---|---|
| 联网研究/搜证 (C, 5.2) | — | **Tavily** | 联网取真实当下事实，写手/裁判都不许凭记忆 |
| 生成正文 (4) | `generate` | **DeepSeek-V4-Pro** | 主写手，中文/英文长文质量好 |
| 润色/翻译/回译 (4.1,4.3,6,6.1) | `critique`/`fallback` | **Qwen-Flash** | 快、非思考、id/vi/zh 母语强 |
| 事实抽取 (3) | `judge` | **GLM-5.1** → **MiniMax-M3** → **DeepSeek-V4-Pro** | 异构于写手；专属容错链，抽取永不因供应商挂掉而空转 |
| 其余裁判/审查 (4.2,4.4,5.1,5.3) | `judge` | **GLM-5.1** | **异构于写手**，独立打分/核查防自评偏袒 |
| 定向修复 + 联网改正 (4.5,5.4) | `critique` | **Qwen-3.7-Max** | 精修删改要稳，用思考版而非 flash |
| 兜底链 | — | 事实抽取 GLM→**MiniMax-M3**→DeepSeek；其余 judge GLM→**MiMo(mimo-v2.5-pro)**→DeepSeek；Qwen→DeepSeek | GLM 易限流时自动顶上 |

> **异构原则**：写手 = DeepSeek，裁判/审查/联网核查 = GLM（与写手不同源，杜绝自己给自己打高分），修复/翻译 = Qwen。**已弃用 OpenRouter**（未充值）。思考模型 max_tokens=4000（否则 content 为空）。

---

## 各步骤细节

### 1. 信号采集（leads only）— 最终源组合（不买付费新闻 API）
1. **SocialData(X) — 突发主力**：盯权威记者 + 关键词，实时。`from:USER`、`since_id` 增量。key 已就绪并验证可用。
2. **RSS — 结构化补充（免费）**：ESPN FC / BBC Sport / Goal / Google News query RSS / 俱乐部官方 feed。
3. **API-Football 端点（已付费）**：`fixtures/events`（进球/红黄牌/阵容/伤停）、`transfers`、`injuries` —— **结构化硬事实，最干净**。
4. **懂球帝 / 直播吧 — 热点选题雷达**：只抓**列表页标题 + URL + 时间**当「这话题正火」的信号，**绝不抓正文、绝不改写正文**。轻量爬虫。

入库 `news_signals`：只存**标题/URL/来源/时间/实体**。**绝不存全文用于转载**，URL 仅作归因与去重。

> NewsData.io / GNews 等付费新闻 API：MVP 先不用（NewsData 免费档延迟 12h，不适合时效）。上面 4 源已覆盖时效+多语言+合规+成本。

### 1.1 监听频率（关键：监听频率 ≠ 发布频率）
**① 监听（查雷达，便宜，可勤）**
- 基线 **每 15 分钟**一轮（标题/RSS/X 推）
- **自适应比赛日**（API-Football 知道哪些比赛在进行）：

| 场景 | 监听频率 |
|---|---|
| 比赛进行中 + 赛后 2h | 每 5 分钟 |
| 平日白天 | 每 15 分钟 |
| 转会窗口/截止日（X 路） | 每 5 分钟 |
| 深夜/凌晨 | 每 30–60 分钟 |

**② 发布（出稿+部署，贵，必须克制）**
- 每轮监听只把新热点存 `topics`，由 Top-N + 去重决定写哪些
- **限流：每语言每小时最多 ~3–5 篇**（避免 Google 内容农场信号）
- 同一话题 **只写一次**（topic key 去重）
- **只有真产出新文章才触发部署**，且部署最多每 30 分钟一次

**职责拆分（对应两个节奏）**
- **轻量轮询**：Cloudflare Worker cron（15 分/比赛日 5 分）→ 抓信号、聚类打分、存 `topics`。无 LLM，便宜。（项目里 `ingest-fixtures` 已是此模式，单次调用新建 DB 连接，跑得通。）
- **重型出稿+部署**：GitHub Action（每 30–60 分钟或攒够 N 个热点）→ 事实抽取 + 4 语言生成 + 质检 + 配图 + 构建部署。

### 2. 聚类 / 去重 / 排序
- 用标题+实体做相似度聚类，把「同一事件」的多条信号合并成一个 `topic`。
- 热度评分 = 来源数量 × 时效衰减 × 与我们市场(ID/VI/PH+世界杯)的相关度。
- 每轮只挑 Top N（控量，避免内容农场信号）。

### C. 联网研究（Tavily，事实抽取之前）— `packages/news/src/tavily.ts`
- `researchTopic()` → `tavilySearch(toQuery(topic.title))`：把 topic 标题清洗成查询，联网取 `answer + results(含url)`。
- 这些作为**最高可信 leads** 放在 signals 最前（`[...researched, ...verifiedLeads(API-Football), ...enriched(RSS全文)]`），喂给事实抽取。
- 动机：Brazil/Argentina 这类「名单/球衣号」topic，写手凭记忆会**脑补整套名单/错年龄**；Tavily 给真名单。soft-fail（Tavily 挂不影响整批）。

### 3. 事实抽取（关键合规点）— **GLM-5.1 (judge)** → fallback **MiniMax-M3** → **DeepSeek-V4-Pro**，`news/factsheet.ts`
- 输入：该 topic 下多条信号（Tavily + API-Football 真事实 + RSS 全文）。
- 输出：结构化 **fact sheet**，每条事实附来源 URL。
- 指令：**只输出可核实事实，不复制原句**；**丢弃单一低可信来源的传闻**。
- **容错链**（`complete({ fallback: ["minimax","deepseek"] })`）：GLM 限流/故障时切 **MiniMax-M3**（thinking 模型，解析前剥离 `<think>…</think>`），再不行回落 **DeepSeek-V4-Pro**；保证抽取这一步永不因单一供应商挂掉而空转。

### 4. 原创生成 + 内部质检 — `generateArticle`（英文为基准）
- 提示词 `prompts/news.ts`：**只允许用 fact sheet 里的事实**，事实越少文章越短（去掉编造动机）。
- 流水：生成(**DeepSeek-V4-Pro**) → 4.1 润色(**Qwen-Flash**) → 4.2 裁判打分(**GLM-5.1**) → 4.3 回译校验(**Qwen-Flash**) → 4.4 编辑审查(**GLM-5.1**，是否忠于 fact sheet) → 4.5 **定向修复**(**Qwen-3.7-Max**，`quality/repair.ts`：只删 review 标出的未证实细节再审)。
- 闸门：质量≥阈值 + 回译通过 + 审查通过 才算过；否则 draft。

### 5. 联网事实核查（«联网裁判»，本管线的真伪底线）— `quality/web-factcheck.ts`
- **为什么**：4.4 的审查只比对 fact sheet，而 fact sheet 本身可能含「传闻被写成既成事实」。本环节用**现实网页**逐条核实，**禁止任何模型凭记忆瞎编**。
- 流程：5.1 抽取可证伪 claim（名单/号码/主帅/赛程/**日期**，**GLM-5.1**）→ 5.2 每条 claim 用 **Tavily** 联网搜证 → 5.3 异构裁判（**GLM-5.1**）**只凭证据**判 `supported/contradicted/unverifiable`（传闻/预测不算证实；**日期差一天即 contradicted**）→ 5.4 contradicted 按证据改正、unverifiable 删除（**Qwen-3.7-Max**）→ **改写后重新联网核对**，循环 maxFix=2。
- 结果：英文基准**每条具体事实都被现实来源支持**才放行翻译；改不干净 → 退回 draft，**绝不发布**。
- 只对**英文基准**跑一次（贵）；翻译忠实继承，无需各语言重复联网。

### 6. 翻译（已核过的英文基准 → id/vi/zh）— **Qwen-Flash**，`translate.ts`
- 忠实翻译，**不新增事实**；每语言回译实体校验（**Qwen-Flash**）过则发布。**4 语言事实必然一致**。
- 文章底部自动附「信息来源」外链（E-E-A-T + 透明度）。

### 7. 配图与多媒体（GPT Image-2 出图，非文本 LLM）

**核心原则**：拦住我们的不是「不能出现真实球员」，而是「没有图片授权」。两类权利分开看——照片**版权**（需授权）vs 球员**肖像权**（新闻编辑用途一般允许）。大站能用比赛实拍，是因为它们**买了图库授权 + 有法务扛风险**。

分两部分解决：

**(a) 封面图 / og:image —— 必须是自有静态图**
- **A. 自有主题图（主力）**：GPT Image-2 预生成**可复用图片库**（48 队队色 banner + 转会/伤停/赛前/赛果/战术/通用 等类型图），打 Skorly 水印 → 存 R2。**出稿时按 球队+类型 从库里选图，90% 文章零边际成本**。**同一话题 4 语言共用一张图**（图不分语言）。
- **B. 已付费源**：API-Football 队徽 / 球员头像（`media.api-sports.io`）—— **待核实其订阅条款是否允许站内展示**（队徽我们已在用）。
- **C. 免费真实**：Wikimedia Commons 球员图（CC-BY，需署名）做球员档案图。
- 仅重磅话题才**定制生成**（GPT Image-2 现生成）。
- **绝不**用懂球帝/直播吧/视觉中国/Getty 等未授权图。

**(b) 正文真实画面（比赛/GIF/集锦）—— 用「嵌入」不用「托管」**
嵌入版权方自己发布的官方内容，平台官方许可、合法、免费、内容自更新：

| 来源 | 拿到什么 | 合法性 |
|---|---|---|
| YouTube 嵌入 | FIFA/俱乐部/转播方官方集锦视频 | YouTube 官方嵌入功能 |
| X 嵌入 | 官方/记者的进球片段/GIF/现场图（**SocialData 已在抓**，直接嵌那条推） | Twitter 官方嵌入 |
| Giphy API | 足球 GIF（多为官方合作方） | Giphy 官方 API/嵌入 |
| Instagram 嵌入 | 球队/球员官方贴 | 官方嵌入 |

- 静态站完全支持（客户端 widgets：X widgets.js / YouTube iframe / Giphy iframe），**懒加载**避免拖慢。
- **优雅降级**：嵌入源被删除/失效时，只显示我们自有封面图。
- 注意：嵌入**不会**填充 og:image，所以社交分享仍用 (a) 的自有图。

**(c) 以后可选（付费升级）**：Imago / Alamy 等编辑图库订阅（比 Getty 便宜），用于自托管比赛实拍图。带量后再上。

### 8a. 发布（无 LLM）
- 写入 `articles`：`type='news'`、`imageUrl`、`sources`(jsonb 来源URL数组)、`status` 由闸门 + 联网核查共同决定（英文基准须过联网裁判）。
- 按 `topic` 去重，避免同事件重复出稿。

### 8b. 上线（静态站的新鲜度方案，无 LLM）
- 站点是全静态（最稳最快）。新闻需要及时 → **由 jobs Worker 在生成一批后触发一次重新构建部署**（Cloudflare Deploy Hook / GitHub Action / Workers Build）。
- 节奏：高峰期每 30–60 分钟一轮（cron）。比赛日可加密。
- 重新部署后 `sitemap.xml` / `news-sitemap.xml` 自动刷新。

---

## 数据库改动（Drizzle）
- 新表 `news_signals`：`id, source, url(unique), title, snippet, lang, entities(jsonb), publishedAt, fetchedAt, topicId(nullable)`
- 新表 `topics`：`id, key(unique 去重键), title, entities(jsonb), factSheet(jsonb), heat(int), status, createdAt`
- 新表 `image_library`：`id, team(nullable), category, url, createdAt`（复用图片库：按 team/category 选图）
- 扩展 `articles`：`imageUrl(text)`, `sources(jsonb)`, `embeds(jsonb)`（嵌入的 YouTube/X/Giphy URL 列表）（`type` 枚举加 `news`）

## 代码结构
- `packages/news/`：`sources/`（`socialdata.ts` / `rss.ts` / `api-football.ts` / `dongqiudi.ts` / `zhibo8.ts` 适配器）、`cluster.ts`、`factsheet.ts`、`schedule.ts`（比赛日自适应频率）
- `packages/ai-content/src/prompts/news.ts`
- `packages/media/`（或 jobs 内）：`image.ts`（GPT Image-2 生成 + sharp 水印 + R2 上传）、`embed.ts`（解析 YouTube/X/Giphy 嵌入）、`library.ts`（按 team/category 选图）
- `apps/jobs/`：Worker cron `poll-signals`（轻量轮询，15分/比赛日5分）
- `.github/workflows/`：`generate-news.yml`（出稿 + 构建 + 部署，30–60 分钟）

## 合规护栏（写进代码与流程）
1. signals 只存线索 + 来源 URL，绝不转载正文。
2. 仅事实抽取 + 原创写作（演绎作品=侵权，明令禁止改写他人原文）。
3. 图片只用自有/授权；水印只打我们自己的图。
4. 每篇附来源外链，可审计。
5. 控量发布，避免内容农场信号。

---

## 分期落地
- **P1 数据管线**：schema（news_signals/topics/image_library）+ SocialData + RSS + API-Football 适配器 + 聚类（先不出稿，验证信号质量）
- **P1.5 选题雷达**：加 懂球帝/直播吧 标题爬虫适配器
- **P2 生成**：news 提示词 + 复用质检 + 4 语言出稿（直接信任闸门自动发布）
- **P3 配图**：GPT Image-2 图片库预生成 + 水印 + R2 + 官方内容嵌入（YouTube/X/Giphy）
- **P4 自动上线**：Worker cron 轮询 + GitHub Action 出稿/构建/部署 + 比赛日自适应频率 + 监控/停发开关

## 已定决策
- **信号源**：SocialData(X) + RSS + API-Football + 懂球帝/直播吧标题雷达。**不买付费新闻 API**。
- **频率**：监听 15 分（比赛日 5 分），发布限流（每语言每小时 ≤3–5 篇、同话题只写一次、有新内容才部署、部署 ≥30 分一次）。
- **部署机制**：**GitHub Action**（需仓库在 GitHub）。
- **出稿**：直接信任闸门自动发布（≥8 发，<8 存 draft），保留来源外链 + 一键停发开关。
- **配图**：自有主题图(GPT Image-2，已有)做封面/og:image + 正文嵌入官方内容；同话题 4 语言共用一张图。

## 待核实 / 待提供
1. **API-Football 媒体条款**：球员头像/队徽能否合法站内展示（队徽已在用）—— 待核实。
2. **R2**：建公开桶 + 绑子域 `img.skorly.cc`（图片库/水印图托管）。
3. **GitHub 仓库**：本 repo 是否已推到 GitHub（私有库即可）—— 决定 P4 自动化前提。
4. **Pexels key**（可选兜底，免费）。
5. **权威账号清单**：FabrizioRomano / David_Ornstein / OptaJoe / FIFAWorldCup / ESPNFC / brfootball + ID/VI/PH 本地媒体账号（待你增删）。
