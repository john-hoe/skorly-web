# Content Prompts & QA Pipeline

Source of truth is code in `packages/ai-content/`. This doc is the human-readable summary.

## 6 content types

| Type | When | Length | Prompt file |
|---|---|---|---|
| preview | ~24h before kickoff | ~500 words | `prompts/preview.ts` |
| watchpoints | ~6h before | 5 bullets | `prompts/watchpoints.ts` |
| prediction | ~2h before | ~300 words | `prompts/prediction.ts` |
| recap | ~30min after FT | ~500 words | `prompts/recap.ts` |
| tactical | ~2h after FT | ~400 words | `prompts/tactical.ts` |
| group_analysis | pre/mid/post group stage | ~800 words | `prompts/group-analysis.ts` |

## QA pipeline (fully automated, no human review)

1. **Generate** - DeepSeek V4 Pro + Indonesian few-shot + locked glossary
2. **Critique** - Qwen rewrites as a native editor (removes translation-ese)
3. **Judge** - OpenRouter (different model family) scores fluency/factual/seo 1-10
4. **Back-translate** - id->en literal, verify team names/score/players survive
5. **Gate** - overall >= 8 AND back-translation ok -> published; else regenerate (max 2) then draft

Tunables in `quality/gate.ts`: `QUALITY_THRESHOLD=8`, `MAX_REGENERATIONS=2`.

## Prediction safety

Prediction prompt explicitly forbids betting/odds/bookmaker language (legal risk in ID/VN). Editorial analysis only.

## Glossary

`glossary/id-football-terms.ts` locks Indonesian football terms. Extend when QA surfaces awkward phrasings.
