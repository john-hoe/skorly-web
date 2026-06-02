-- ============================================================
-- Skorly 二期 · M1 — World Cup 2026 prediction campaign seed
-- Applied to the live project via Supabase MCP (apply_migration:
-- "phase2_m1_wc_prediction_campaign"). Kept here as committed history.
--
-- One "predict & win" campaign that the global leaderboard backs.
-- Idempotent: ON CONFLICT (slug) DO NOTHING so re-running is safe.
-- No money / no odds — pure points-based fun challenge.
-- ============================================================
insert into campaigns (slug, type, name, description, rules, prizes, locales, starts_at, ends_at, is_active)
values (
  'wc2026-score-challenge',
  'predict',
  '{"id":"Tantangan Tebak Skor Piala Dunia 2026","vi":"Thử thách dự đoán tỉ số World Cup 2026","en":"World Cup 2026 Score Prediction Challenge","zh":"2026 世界杯竞猜挑战"}'::jsonb,
  '{"id":"Tebak skor setiap laga, kumpulkan poin, dan rebut puncak klasemen Skorly.","vi":"Dự đoán tỉ số từng trận, ghi điểm và chiếm đỉnh bảng xếp hạng Skorly.","en":"Predict every match score, earn points, and climb the Skorly leaderboard.","zh":"竞猜每场比分，赢取积分，冲上 Skorly 排行榜。"}'::jsonb,
  '{"scoring":{"exact":5,"resultAndGoalDiff":3,"result":2,"wrong":0},"lockAtKickoff":true}'::jsonb,
  '{"note":"Bragging rights & leaderboard glory — no cash, no betting."}'::jsonb,
  array['id','vi','en','zh'],
  '2026-06-11 00:00:00+00',
  '2026-07-19 23:59:59+00',
  true
)
on conflict (slug) do nothing;
