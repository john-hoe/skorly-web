# Review Operating Rules (Agent Runbook)

这是 Skorly 全站 review 的**总入口和操作规则**。任何执行 review 或修复的 agent，先读这一份，就知道读哪些文档、按什么顺序做、怎么落证据、怎么记问题、什么时候算完成。

本文件是稳定入口；具体清单和验收标准在带日期的文档里。当前轮次：`2026-06-04`。

## 0. 角色与文档地图

| 文档 | 作用 | 何时读/写 |
| --- | --- | --- |
| `docs/review/review-operating-rules.md`（本文件） | 操作规则 / 流程总入口 | 最先读 |
| `docs/review/full-site-review-plan-2026-06-04.md` | 怎么查、怎么验收、Phase 划分、Evidence Protocol | review 全程依据 |
| `docs/review/full-site-review-matrix-2026-06-04.md` | 查什么：逐路由 + 逐按钮(Interactive Inventory) 覆盖矩阵 | 执行时逐行更新状态 |
| `docs/review/review-evidence-2026-06-04.md` | 每项检查的可复现证据账本（`E-<n>`） | 每验证一项就写一条 |
| `docs/review/review-findings-2026-06-04.md` | 本轮已验证问题（修复入口，P0→P1→P2 索引） | 发现问题就记 |
| `docs/review/review-findings-2026-06-03.md` | 上一轮 findings，仅作回归基线只读 | Phase 0 复验用 |

## 1. 两种 session，先确认自己是哪种

- **Review session**：只检查、只记录，**绝不改业务代码**。产出：matrix 状态 + evidence + findings。
- **Fix session**：只修复 findings，按 P0→P1→P2，修完回填验证。

开始前先声明自己是哪种，不要混做。

## 2. Review Session 执行顺序（照做）

1. **基线门禁**：`pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm --filter @skorly/api-football test` / `pnpm --filter @skorly/predict-model test`，必须全部 exit 0；build 页数变化要解释。
2. **回归基线（Phase 0）**：复验 `review-findings-2026-06-03.md` 中已 `Fixed` 的 P0/P1 没回退；回退项写进 06-04 标 `Reopened`。
3. **Inventory（Phase 1）**：把每条路由/链接/写操作分类映射。
4. **交互清单（Phase 1.5）**：枚举所有按钮/表单/嵌入/island，确保每个交互都对应 matrix 的 Interactive Inventory 一行。
5. 按 plan 的 **Phase 2→12** 依次执行（公开路由→认证→登录态→API→UI/UX→可访问性→SEO→PWA→性能→安全→后台任务）。
6. 每验证一项：更新 matrix 行状态 + 写 evidence `E-<n>` + 把 `E-<n>` 填回 matrix `Finding` 列；失败再建 finding。
7. 全部行有终态后，做 **抽查**（见第 4 节），通过才算完成。

生产/认证/邮件/Worker 类：必须用 Chrome 真实会话 + `wrangler tail`，不能只用 curl。

## 3. 证据铁律（防偷懒，最重要）

**没有可复现证据 = 没做。** 详见 plan 的 Evidence Protocol。最低要求：

1. matrix 任何一行从 `Pending` 变状态，必须在 evidence 文件留 `E-<n>`，并把 ID 填回 matrix `Finding` 列。**无 `E-<n>` 的 `Pass` 无效。**
2. 证据可复现：确切命令/URL/Chrome 步骤 + 原始输出片段 + 环境(local/prod) + UTC 时间戳；截图给路径。
3. 证据要对应该行验收标准，贴的输出能直接证明 Acceptance。
4. **禁用词**（出现即判未完成，返工）：`应该`、`大概`、`看起来正常`、`probably`、`should work`、`looks fine`、`assume`、无输出的"已验证/已检查"。
5. **禁止批量声明**："全部通过""都没问题"这种没有逐项 `E-<n>` 的总结无效。一项 = 一条证据。
6. 生产类双证据：Chrome 证据 + `wrangler tail` 片段，缺一不可。

## 4. 完成标准（Definition of Done）

Review 只有同时满足才算完成，否则继续：

- matrix **无 `Pending` 行**（每行都有终态 + `E-<n>`）。
- Open P0 = 0（核心生产链路）。
- 核心生产用户流程通过率 = 100%。
- sitemap 中非预期 4xx/5xx = 0。
- 登录态核心流程期间 Worker exception = 0。
- 核心移动端横向溢出 = 0（`scrollWidth <= innerWidth + 1`）。
- **抽查闸门**：随机重跑 ≥20% 的 `Pass` 行证据，全部复现成功。任一失败 => 该 reviewer 所有 `Pass` 降级 `Pending` 重做，并在 findings 的 Process 区记一条。

## 5. 怎么记一个问题（finding）

写进 `review-findings-2026-06-04.md`：

1. 选严重级别：P0（阻断/越权/泄露）> P1（关键路径不达标）> P2（局部质量）。
2. 用文件里的 Finding Format（Status / Evidence / Impact / Reproduce / Fix acceptance / Verification）。
3. 在顶部 **Findings Index 表**登记一行（ID/严重级/标题/模块/状态/证据）。
4. matrix 对应行 `Status=Fail`、`Finding=<P?-?>`，evidence 留失败证据 `E-<n>`。

## 6. Fix Session 规则

1. 打开 findings 的 **Findings Index 表**，从最上面没 `Fixed` 的开始（P0 优先）。
2. 一次只修最高优先级的一条，修完再下一条。
3. 标 `Fixed` 的前提：原复现不再失败 + 验收标准通过 + 本地门禁通过 + 生产类用 Chrome+tail 复验 + 回填确切验证输出(`E-<n>`)。
4. 证据铁律同样适用（禁用词、双证据）。
5. 保留无关的工作区改动，不要顺手改别的。

## 7. 硬性禁止

- Review session 改业务代码。
- 无证据标 `Pass`。
- 用"看起来正常/应该没问题"代替验证。
- 把生产偶发 5xx 当噪音忽略（能复现或有日志就必须记）。
- 用本地通过替代生产通过（Worker/Auth/邮件/Turnstile/Web Push）。
- 留 `Pending` 行却宣称完成。

## 8. 起步 prompt

Review session 和 Fix session 的现成 prompt 见 plan 文末「Suggested Prompt」。直接复制使用。
