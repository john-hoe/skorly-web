# News Pipeline Fact-Safety Improvement Plan

## 1. Background

Recent production checks show the news pipeline is running, but the visible article volume is lower than expected.

Observed on 2026-06-17:

- Daily News workflow ran successfully.
- Radar stored 118 new signals and upserted 70 topics.
- Generation attempted 6 topics.
- Only 2 topics produced published news in each main locale.
- 4 topics were kept as draft because QA/fact-checking found unsupported or contradictory details.

The problem is not that the pipeline stopped. The problem is that too many generated drafts contain claims that are not safely grounded in verified input facts.

Important caveat: the 2026-06-17 sample is small (`6` attempted topics). It is useful as a debugging signal, but not enough to justify a large rewrite by itself. The next implementation step should improve observability first, then use 1-2 weeks of reason-code data to decide which generation changes are worth doing.

## 2. First-Principles Rule

The LLM must not create facts.

The system should treat every article as a transformation from verified facts into readable copy:

```text
verified facts -> allowed claims -> localized article
```

Any claim not supported by the verified fact set must be removed, generalized, or kept out of publication.

This means strict fact-checking should not be relaxed. The improvement should happen earlier in the pipeline by narrowing what the model is allowed to write.

## 3. Root Causes

### 3.1 Fact Inputs Can Be Ambiguous

Example: Argentina vs Algeria had a valid Messi hat-trick, but the event feed also contained:

- `8' Goal - Algeria`
- `8' VAR - Goal Disallowed - offside`

If recap facts include all `Goal` events without excluding VAR-disallowed goals, the fact set becomes contradictory:

- Final score says Argentina 3-0 Algeria.
- Event list appears to say Algeria scored once.

This makes the LLM generate false narratives such as Algeria scoring first or Argentina staging a comeback.

### 3.2 Free-Form Prompts Invite Unsupported Detail

Requests like "write a 500-word recap" encourage the model to fill gaps with common football-writing patterns:

- pressure
- momentum swings
- assists
- possession
- goalkeeper saves
- tactical dominance
- man of the match

These details are unsafe unless they exist in the verified data.

### 3.3 Regeneration Can Introduce New Errors

Full regeneration is useful for poor writing quality, but it is weak for factual safety. A second draft may remove one unsupported claim while adding another.

For fact failures, the safer repair path is:

```text
detect unsupported claim -> delete or generalize that exact claim -> re-check
```

### 3.4 Topic Quality Affects Pass Rate

Some topics are not good article inputs:

- live-stream/link spam
- thin highlight titles
- single-source reaction clips
- odds/prediction-only posts
- low-confidence transfer rumors

These should be filtered before generation, not after spending LLM budget.

## 4. Current Baseline and Scope Correction

The codebase already implements several safeguards. The remaining plan should not duplicate them.

Already implemented or patched in the current working tree:

- Recap event correctness: `run-generate-recaps.ts` excludes VAR-disallowed goals, compares valid goals against final score total, and avoids publishing scorer/minute details when event data is incomplete.
- News prompt length control: `newsPrompt()` already writes shorter briefs when `sheet.facts.length < 4`.
- News fact-check repair loop: `webVerifyArticle()` already extracts claims, checks web evidence, applies fixes, and rechecks with `maxFix = 2`.
- Internal grounded repair: `reviewArticle()` plus `repairArticle()` already removes unsupported claims when the article is otherwise on-theme and repairable.
- Basic signal filtering: `filterSignals()` already removes common spam/betting/crypto/live-link noise, and `sourceWeight()` contributes to heat scoring.
- Minimum fact gate: `run-generate-news.ts` already skips topics with fewer than `MIN_FACTS = 2`.

Scope correction:

- Recap and news are different pipelines.
- Recap uses structured `fixture_events`, so goal/disallowed-goal contracts fit there.
- News uses social/RSS/Tavily/free-text leads that become a text fact sheet. Do not force recap-style `validGoals/disallowedGoals` onto the generic news pipeline.
- The 2026-06-17 `6 attempted -> 2 published` issue was in the news pipeline, not primarily the recap pipeline.

Therefore the real incremental work should focus on:

1. Observability: reason codes, daily report, Admin diagnosis.
2. News topic readiness: lightweight publishability scoring before generation.
3. Optional brief templates only if monitoring shows many high-trust but low-fact opportunities.
4. More structured claim-repair logging only if current repair leaves too many recoverable drafts.

## 5. Proposed Incremental Improvements

### 5.1 Structured Fact Contracts: Use Only Where They Fit

For structured match contexts such as recaps, convert source data into a structured contract:

```ts
type ArticleFactContract = {
  fixture?: {
    home: string;
    away: string;
    finalScore?: string;
    stage?: string;
    venue?: string;
    kickoffAt?: string;
  };
  validGoals: Array<{
    minute: number | null;
    team: string;
    player: string;
  }>;
  disallowedGoals: Array<{
    minute: number | null;
    team: string;
    player: string | null;
    reason: string | null;
  }>;
  cards: Array<{
    minute: number | null;
    team: string;
    player: string | null;
    detail: string | null;
  }>;
  stats?: {
    possession?: string;
    shots?: string;
    shotsOnTarget?: string;
    xg?: string;
  };
  missingFields: string[];
  forbiddenClaims: string[];
};
```

The prompt should be generated from this contract. If a field is missing, the prompt should explicitly forbid that claim type.

For generic news, keep the current fact-sheet model unless monitoring proves it is insufficient. The incremental improvement for news should be readiness scoring and reason-code observability, not a broad rewrite into a recap-shaped schema.

Example:

```text
Forbidden: assists, possession, xG, shots, saves, tactical dominance, man of the match.
```

### 5.2 Grade Fact Completeness Before Choosing Article Length

Do not ask the LLM to decide how much to write. The system should decide based on fact density.

Suggested thresholds:

| Fact completeness | Allowed output | Length |
|---|---:|---:|
| Final score only | Score brief | 80-150 words |
| Score + complete valid goals | Short recap | 180-300 words |
| Score + goals + cards/subs/venue | Standard recap | 300-450 words |
| Score + goals + official stats + lineups | Full recap | 450-650 words |

Hard rule:

If `validGoals.length !== finalScoreTotalGoals`, do not publish scorer/minute details. Use a score brief instead.

### 5.3 Use Templates for Low-Fact Cases

Use templates only for `brief_only` content. Do not use this approach for full articles.

The purpose is not to make richer articles. The purpose is to safely publish short updates when the fact set is reliable but too thin for a normal story.

Use this path when:

- there are 1-3 high-trust facts;
- the facts are enough to tell readers what happened;
- the facts are not enough for a full recap, analysis, or normal news article;
- unsupported claims must stay near 0.

Do not use this path when:

- the topic needs tactical analysis;
- sources conflict;
- the facts are low-trust rumors;
- the story needs background that is not in the verified facts;
- there is enough data for a normal article.

This is partly covered today by `newsPrompt()` for low fact counts. The remaining useful increment is deterministic `brief_only` templates that can avoid LLM generation or restrict it to localization.

Recommended first template types:

```text
score_result_brief
fixture_schedule_brief
official_squad_brief
injury_status_brief
```

For low-fact cases, generate a deterministic skeleton first, then let the LLM only localize or polish. The safer option is to output from localized templates directly and skip LLM polish.

Example score brief:

```text
{home} beat {away} {score} in a 2026 World Cup fixture.
The result strengthens {home}'s position, while {away} need a response in their next match.
```

This keeps the claim count low and auditable.

Approximate claim count:

- 500-word free-form recap: 30-60 factual claims.
- 120-word score brief: 6-12 factual claims.

Lower claim count directly reduces the surface area for hallucination.

Output constraints:

- 80-150 words.
- No tactics.
- No possession, shots, xG, saves, or man of the match.
- No scorers/minutes unless the verified fact contract includes complete valid goals.
- No causes or motivations unless explicitly present in the facts.

Labeling:

- Do not present a brief as a full recap.
- Store or render it as `articleMode=brief`.
- Reader-facing label can be `Brief`, `Update`, or `Match note`.

Success metrics:

- `brief_only` publish pass rate: 80%+.
- Unsupported claims in published briefs: near 0.
- Briefs should supplement full articles, not replace them when full facts exist.

### 5.4 Prefer Targeted Fact Repair Over Full Regeneration

For factual failures:

1. Extract unsupported claims.
2. Remove or generalize only those claims.
3. Re-run grounded review.
4. Publish only if unsupported claims reach 0.
5. Otherwise keep draft.

Avoid using full regeneration as the primary fact repair method because it can introduce new unsupported facts.

This is partly implemented today through `reviewArticle()`/`repairArticle()` and `webVerifyArticle()`. The incremental work is to make claim failures more structured and measurable, not to rebuild the existing repair loop from scratch.

The target metric is:

```text
unsupportedClaims = 0
```

This should be implemented as a claim-level repair pipeline, not as general article rewriting.

Recommended unsupported claim schema:

```ts
type UnsupportedClaim = {
  claim: string;
  reason: "not_in_facts" | "contradicted" | "unverifiable";
  severity: "blocker" | "minor";
  suggestedAction: "delete" | "generalize" | "replace_with_fact";
  supportedReplacement?: string;
};
```

Repair rules:

- `contradicted`: delete or replace with supported fact; otherwise draft.
- `not_in_facts`: delete or generalize.
- `unverifiable`: delete if decorative; draft if it is core to the article.
- Never add new names, minutes, venues, stats, assists, causes, tactical claims, or quotes.
- Repair the title as well as the body.
- It is acceptable for the repaired article to become shorter.

Example:

```text
Unsupported sentence:
Messi scored from the penalty spot after a handball.

Verified facts:
Messi scored in the 17th, 60th and 76th minutes.

Allowed repair:
Messi scored three times for Argentina.
```

Required loop:

```text
draft
-> extract checkable claims
-> review claims against fact contract
-> repair exact unsupported claims
-> extract claims again
-> review again
-> publish only if unsupportedClaims = 0
```

Run at most 2 repair rounds. If unsupported claims remain after 2 rounds, keep the article as draft. More rounds increase cost and can introduce new errors.

Repair log should be stored in `qa_log`, for example:

```json
{
  "round": 51,
  "model": "claim-repair",
  "removedClaims": 4,
  "generalizedClaims": 2,
  "remainingUnsupportedClaims": 0
}
```

Best-fit article types:

- recap;
- result news;
- injury/status brief;
- transfer confirmation;
- schedule/update brief.

Poor-fit article types:

- deep tactical analysis;
- opinion;
- multi-party controversy;
- topics where source facts themselves conflict.

### 5.5 Improve Topic Admission Rules

Before generation, require:

- enough core facts, not just generic facts;
- at least 1 trusted source;
- no live-stream/link-spam terms;
- no single-source low-confidence rumor unless clearly labeled as rumor and not treated as fact;
- enough context to write at least a score brief or factual news brief.

Generic facts are not enough.

Example of facts that are too generic:

```text
Argentina vs Algeria.
2026 World Cup.
```

These identify the fixture, but they do not create a publishable story.

Example of core facts:

```text
Argentina beat Algeria 3-0.
Messi scored in the 17th, 60th and 76th minutes.
```

These can support a brief or recap.

Add a generation-readiness assessment before any LLM writing:

```ts
type TopicReadiness = {
  route:
    | "publish_article"
    | "brief_only"
    | "media_only"
    | "pending_more_sources"
    | "merge_duplicate"
    | "discard_spam"
    | "discard_off_theme";
  coreFactCount: number;
  trustedSourceCount: number;
  maxSourceTrust: number;
  spamRisk: number;
  publishabilityScore: number;
  reasons: string[];
};
```

Recommended hard gates:

```text
discard_spam:
  live stream/link spam, betting, crypto, pure ads

discard_off_theme:
  not football / not World Cup / not site scope

merge_duplicate:
  same story already covered and no new useful source/media

pending_more_sources:
  single low-trust transfer/injury rumor
  candidate event without API/official/RSS confirmation

media_only:
  official highlight/media, but no score/event context

brief_only:
  1-3 high-trust core facts
  not enough for a full article

publish_article:
  coreFactCount >= 3
  trustedSourceCount >= 1
  spamRisk = 0
  publishabilityScore >= 5
```

Suggested source trust scores:

| Source type | Trust |
|---|---:|
| API-Football / official FIFA / official team | 1.0 |
| BBC / ESPN / Reuters / AP / strong mainstream RSS | 0.8 |
| Trusted journalist account | 0.7 |
| Google News RSS single source | 0.5 |
| Ordinary social/video clip account | 0.2 |
| Live-stream, betting, crypto, ad spam | 0 |

Use two gates:

1. Radar-stage gate in `run-news.ts`: remove obvious spam before topic creation.
2. Generation-stage gate in `run-generate-news.ts`: after enrichment/Tavily/fact extraction, route by core facts, trust, duplication, and publishability.

This avoids both failure modes:

- rejecting useful thin signals too early;
- sending bad topics into expensive LLM generation.

Recommended skip categories:

- illegal stream links;
- "watch live" link posts;
- pure odds posts;
- thin highlight titles with no score/event context;
- posts where the only factual content is a vague reaction.

### 5.6 Separate Heat From Publishability

`heat` should mean "people are talking about this." It should not mean "this can safely become an original article."

Some topics can become high-heat for the wrong reasons:

- illegal live-stream posts;
- repeated highlight clips;
- reaction fragments;
- short video captions;
- odds posts;
- duplicate posts about an already-covered fixture.

Add a separate `publishabilityScore` and rank generation candidates with both heat and publishability:

```text
generationScore = heat * 0.4 + publishabilityScore * 0.6
```

Suggested publishability inputs:

| Signal property | Score |
|---|---:|
| Clear team/player entities | +1 |
| Has verified score/result/schedule/transfer/injury fact | +2 |
| 2+ independent trusted sources | +2 |
| API-Football, FIFA/official, or strong RSS source present | +2 |
| Only a highlight title with no factual context | -2 |
| Only emotion/reaction text | reject |
| Live-stream/link spam | discard |
| Betting/crypto/promo content | discard |

Generation should require:

```text
spamRisk = 0
trustedSourceCount >= 1
verifiedFacts >= 2
publishabilityScore >= 5
```

### 5.7 Route Topics Instead of Treating All Topics as Articles

A topic should be routed before any LLM generation.

Recommended routes:

```text
publish_article       enough confirmed facts for a normal article
brief_only            enough confirmed facts for a short factual brief
media_only            useful media/highlight, not enough article facts
merge_duplicate       same story already covered; merge sources/media
pending_more_sources  plausible but not yet confirmed
discard_spam          no editorial value; do not store as usable content
discard_off_theme     outside football / World Cup / site scope
```

This prevents article generation from being polluted by topics that are useful elsewhere but unsafe as articles.

Examples:

| Input topic | Route | Reason |
|---|---|---|
| `Watch Live Stream Argentina vs Algeria Link 1 Link 2` | `discard_spam` | Illegal/low-value link spam |
| `Argentina vs Algeria Highlights` | `media_only` | May be useful as an embed, but not enough article facts |
| `Messi scores again!` | `pending_more_sources` | Candidate event, needs API/official confirmation |
| `France beat Senegal 3-1` | `brief_only` | Result fact is usable, but may not support a long article |
| `Haaland scores twice as Norway beat Iraq 4-1` with official/API facts | `publish_article` | Enough confirmed match facts |
| A second RSS item about an already-published France-Senegal recap | `merge_duplicate` | Adds source/media, not a new article |

### 5.8 Only Extract Partial Content When It Has a Downstream Use

Partial extraction is not valuable by itself. It is only useful if the extracted content enters a concrete downstream action.

Allowed downstream actions:

```text
merge_into_existing_topic
attach_media_to_fixture
pending_until_confirmed
brief_only
```

If a signal cannot enter one of these actions, discard it.

Useful partial extraction examples:

- Highlight title -> teams + official media candidate -> `attach_media_to_fixture`.
- Single low-confidence injury rumor -> player + candidate claim -> `pending_until_confirmed`.
- Duplicate report -> source URL + timestamp -> `merge_into_existing_topic`.
- Thin but reliable scoreline -> result fact -> `brief_only`.

Do not extract from:

- illegal streams;
- betting promotions;
- crypto/airdrop posts;
- pure ads;
- off-theme content;
- emotion-only text with no verifiable event.

Recommended partial fact shape:

```ts
type UsableFact = {
  claim: string;
  entities: string[];
  sourceUrl: string;
  sourceTrust: number;
  confidence: "confirmed" | "candidate" | "rumor";
  allowedUse: "article" | "brief" | "media" | "pending" | "discard";
};
```

Use rules:

- `confirmed` can feed `publish_article` or `brief_only`.
- `candidate` can feed `pending_more_sources` or media matching.
- `rumor` can only stay pending; never publish as fact.
- `discard` should not enter the article pipeline.

### 5.9 Topic Quality Metrics

Track these daily:

- `topics_by_route`
- `discard_spam_count`
- `media_only_count`
- `pending_more_sources_count`
- `pending_to_confirmed_rate`
- `merge_duplicate_count`
- `attempted_topics_from_publish_article`
- `drafts_caused_by_thin_fact_sheet`
- `drafts_caused_by_spam_topic`

Quality targets:

- Spam topics entering generation: 0.
- Drafts caused by `thin_fact_sheet` or `spam_topic`: below 10% of drafts.
- Pending claims that later become confirmed: at least 20%; otherwise pending extraction is too noisy.
- Duplicate article generation: reduce by at least 10%.
- Official media embeds added from `media_only`: track separately from article count.

### 5.10 Structure Draft Reasons

Current QA notes are mostly free text. Add structured reason codes so failures can be measured.

Suggested codes:

- `unsupported_goal_detail`
- `unsupported_assist`
- `unsupported_stat`
- `unsupported_lineup`
- `wrong_venue`
- `wrong_date`
- `disallowed_goal_conflict`
- `thin_fact_sheet`
- `spam_topic`
- `language_quality_fail`
- `web_factcheck_fail`

This enables a daily report like:

```text
attempted_topics=12
published_topics=7
draft_topics=5
draft_reasons:
  unsupported_stat=2
  disallowed_goal_conflict=1
  thin_fact_sheet=1
  web_factcheck_fail=1
```

## 6. Revised Implementation Priority

### P0: Observability, Reason Codes, and Admin Diagnosis

This is the highest-value new work because it tells us which problem is actually limiting publication.

Implement first:

- Extract structured draft reason codes from existing `qa_log`, `webVerifyArticle()` notes, and skip paths.
- Add a daily pipeline report script.
- Show the latest report in Admin.
- Do not require the owner to inspect GitHub Actions, DB rows, or raw logs for routine diagnosis.

Expected impact:

- Replaces guesswork with measured failure distribution.
- Prevents large rewrites based on one small sample day.
- Makes future changes accountable to publish rate, draft reasons, and cost per published topic.

### P1: Lightweight News Publishability Scoring

Only after P0 gives baseline data, add a lightweight score before news generation.

Implement:

- Keep existing `heat`, but add `publishabilityScore`.
- Prefer topics with core facts and trusted sources.
- Penalize thin highlight/reaction topics.
- Reject or route obvious spam before LLM generation.
- Start with a small scoring function; do not build the full route taxonomy until metrics prove it is needed.

Expected impact:

- Fewer bad topics enter expensive generation.
- Lower draft rate from `thin_fact_sheet` and `spam_topic`.
- Better use of the existing `count` budget.

### P2: Optional `brief_only` Templates

Do this only if P0 shows many high-trust topics are too thin for full articles but safe for short updates.

Implement:

- Start with `score_result_brief` and `fixture_schedule_brief`.
- Prefer deterministic localized templates.
- If LLM is used, restrict it to localization/polish.
- Store/render as `articleMode=brief`.

Expected impact:

- Increases visible freshness without forcing thin facts into long articles.
- Keeps unsupported claims near 0.

### P3: More Structured Claim-Repair Reporting

The code already has targeted repair and web-factcheck loops. Do not rebuild them first.

Add this only if P0 shows many drafts are repairable but still failing because reason data is too coarse.

Implement:

- Normalize unsupported claim reasons into a schema.
- Log removed/generalized/remaining claim counts.
- Keep current two-round max-fix behavior.

Expected impact:

- Better auditability.
- Better diagnosis of whether drafts are genuinely unsafe or merely need claim deletion.

### Not Priority Now

- Do not rebuild recap event correctness; it is already implemented.
- Do not force recap-style `validGoals/disallowedGoals` contracts onto generic news.
- Do not increase `count` aggressively before P0/P1 data shows the bottleneck.
- Do not build a complex seven-route topic state machine before a lightweight publishability score proves useful.

## 7. Metrics and Monitoring Detail

Track daily:

- `signals_inserted`
- `topics_upserted`
- `topics_attempted`
- `articles_published`
- `articles_drafted`
- `publish_rate`
- `draft_reason_counts`
- `avg_verified_fact_count`

Monitoring should not require manual analysis by the site owner.

The system should produce an automatic diagnosis and show it in Admin:

```text
Admin -> Operations -> News Pipeline
```

The Admin view should show a summary, not raw logs:

```text
Status: healthy / degraded / failed

Today:
signals: 118
topics: 70
attempted: 6
published: 2
draft: 4
publish_rate: 33%

Diagnosis:
Article volume is low because draft rate is high, not because the pipeline stopped.

Main blockers:
- unsupported_claim: 3
- contradicted_fact: 1

Recommended action:
- route thin topics to brief_only
- inspect top 5 high-publishability pending topics
```

The owner should only need to inspect details when status is `degraded` or `failed`.

Recommended status rules:

```text
failed:
  Daily News workflow failed
  OR no signals for 24h
  OR DB connection/report query fails
  OR published articles exist but no deploy/rebuild follows

degraded:
  publish_rate < 40%
  OR attempted_topics < configured_count * 0.8
  OR spam_topic_entering_generation > 0
  OR pending_topics grows > 20% day over day
  OR published_news_today < 2

healthy:
  workflow success
  AND signals_inserted > 20
  AND attempted_topics >= configured_count * 0.8
  AND publish_rate >= 50%
  AND unsupported published claims = 0
```

Recommended daily funnel metrics:

```text
signals_fetched
signals_inserted
signals_after_filter
topics_upserted
topics_pending_total
topics_attempted
topics_published
topics_drafted
publish_rate = topics_published / topics_attempted
```

Recommended quality metrics:

```text
draft_reasons:
  thin_fact_sheet
  unsupported_claim
  contradicted_fact
  web_factcheck_fail
  language_quality_fail
  spam_topic
  duplicate_topic
```

Recommended cost-efficiency metrics:

```text
llm_calls_total
llm_calls_per_published_article
avg_generation_seconds
avg_repair_rounds
avg_verified_fact_count
```

Suggested implementation:

- Add `apps/jobs/scripts/report-news-pipeline.ts`.
- Query DB for the daily funnel and draft reasons.
- Compute status and diagnosis from thresholds.
- Store the latest report in DB or expose it through an admin action.
- Render it in the existing Admin operations surface.
- Later, send severe `failed` reports by email/push/Slack.

Target:

- Current observed publish rate: about 33% for 2026-06-17 Daily News.
- Near-term target: 50-60%.
- Non-negotiable target: unsupported factual claims in published articles should remain near 0.

## 8. Success Criteria

The improvements are successful if:

- Published article volume increases without relaxing fact safety.
- Recaps no longer mention scorers/minutes unless event data supports them.
- Draft reasons become measurable by category.
- The pipeline can explain why each topic was skipped, briefed, drafted, or published.
- Editors can audit each published article back to its source facts, fact sheet, or structured match facts.

## 9. Recommendation

Do not solve this by increasing generation count first, and do not start with a broad rewrite.

The correct order is:

1. Add observability: reason codes, daily report, Admin status.
2. Run the report for 1-2 weeks to learn the real draft distribution.
3. If thin/spam topics dominate, add lightweight news publishability scoring.
4. If high-trust thin topics are common, add `brief_only` templates.
5. If many drafts are repairable, add more structured claim-repair reporting.
6. Only then consider increasing `count`.

Increasing `count` before this data exists would mostly increase LLM cost and draft volume. The plan should optimize for measured bottlenecks, not for a one-day sample.

## 10. Implementation Update: 2026-06-17

Implemented in this change:

- Shared draft reason classification in `@skorly/types`.
- DB-side news pipeline report via `getNewsPipelineReport()`.
- Read-only report script: `apps/jobs/scripts/report-news-pipeline.ts`.
- Admin Operations news pipeline panel showing:
  - health status;
  - 24h funnel;
  - signal source distribution;
  - draft reason distribution;
  - diagnosis.
- Lightweight generation-stage publishability scoring in `@skorly/news`.
- `run-generate-news.ts` now scans a larger pending-topic pool, ranks by publishability, and skips only obvious spam/prediction topics permanently.

Not implemented in this change:

- Deterministic `brief_only` article templates.
- New DB schema for topic route history.
- Full seven-route topic state machine.
- Rebuilding recap fact contracts.

Reason:

- P0 and the lightweight P1 are the only confirmed high-value new work after comparing the plan against current code.
- P2/P3 should wait until reason-code data proves they are needed.
- Recap factual safety already has the relevant event-contract logic; duplicating it would add cost without addressing the news bottleneck.

Smoke-test result from the read-only report script on 2026-06-17 06:50 UTC:

```text
signals_inserted: 118
pending_topics: 444
attempted_topics: 69
published_topics: 58
draft_or_skipped_topics: 5
published_articles: 64
draft_articles: 4
publish_rate: 84%
top_draft_reason: quality_gate_fail (4)
```

Interpretation:

- The earlier `6 attempted -> 2 published` sample was too small to treat as the whole pipeline baseline.
- The current larger 24h report suggests the main operational issue is backlog/topic selection, not a stopped pipeline.
- The next decision should be based on several days of report output, especially whether `thin_fact_sheet`, `spam_topic`, or `quality_gate_fail` dominates drafts.
