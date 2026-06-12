-- 三期 D3 — official highlight embeds per fixture.
-- Already applied to production via Supabase MCP (migration: add_fixture_media).
CREATE TABLE IF NOT EXISTS fixture_media (
  id serial PRIMARY KEY,
  fixture_id integer NOT NULL REFERENCES fixtures(id),
  kind text NOT NULL DEFAULT 'highlight',
  provider text NOT NULL DEFAULT 'youtube',
  video_id text NOT NULL,
  title text,
  channel_id text,
  channel_title text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS fixture_media_unique_idx ON fixture_media (fixture_id, provider, video_id);
CREATE INDEX IF NOT EXISTS fixture_media_fixture_idx ON fixture_media (fixture_id, kind);
ALTER TABLE fixture_media ENABLE ROW LEVEL SECURITY;
