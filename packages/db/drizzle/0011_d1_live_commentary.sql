-- 三期 D1 — live text commentary (match center).
-- Already applied to production via Supabase MCP (migration: add_live_commentary);
-- kept here so the repo's migration history stays complete.
CREATE TABLE IF NOT EXISTS live_commentary (
  id serial PRIMARY KEY,
  fixture_id integer NOT NULL REFERENCES fixtures(id),
  dedupe_key text NOT NULL,
  sort_key integer NOT NULL,
  minute integer,
  type text NOT NULL,
  texts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS live_commentary_fixture_dedupe_idx ON live_commentary (fixture_id, dedupe_key);
CREATE INDEX IF NOT EXISTS live_commentary_fixture_sort_idx ON live_commentary (fixture_id, sort_key);
ALTER TABLE live_commentary ENABLE ROW LEVEL SECURITY;
