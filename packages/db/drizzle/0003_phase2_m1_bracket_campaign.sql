-- ============================================================
-- Skorly 二期 · M1 — World Cup 2026 knockout bracket campaign seed
-- Applied to the live project via Supabase MCP (apply_migration:
-- "phase2_m1_wc_bracket_campaign"). Kept here as committed history.
--
-- Backs the "road to the final" bracket predictor (final four →
-- finalists → champion). Picks live in campaign_entries.data jsonb.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- ============================================================
insert into campaigns (slug, type, name, description, rules, prizes, locales, starts_at, ends_at, is_active)
values (
  'wc2026-bracket',
  'predict',
  '{"id":"Prediksi Bagan Piala Dunia 2026","vi":"Dự đoán nhánh đấu World Cup 2026","en":"World Cup 2026 Bracket Prediction","zh":"2026 世界杯晋级图竞猜"}'::jsonb,
  '{"id":"Pilih empat besar, dua finalis, dan sang juara Piala Dunia 2026.","vi":"Chọn 4 đội bán kết, 2 đội chung kết và nhà vô địch World Cup 2026.","en":"Pick your final four, the two finalists, and the World Cup 2026 champion.","zh":"选出你心中的四强、决赛对阵与 2026 世界杯冠军。"}'::jsonb,
  '{"format":"road-to-final","picks":["semifinalists:4","finalists:2","champion:1"]}'::jsonb,
  '{"note":"Leaderboard glory — no cash, no betting."}'::jsonb,
  array['id','vi','en','zh'],
  '2026-06-11 00:00:00+00',
  '2026-07-19 23:59:59+00',
  true
)
on conflict (slug) do nothing;
