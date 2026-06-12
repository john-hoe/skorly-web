-- D3 follow-up: rights holders like FIFA disable third-party embedding.
-- Track embeddability so the web app can fall back to a YouTube link-out card.
ALTER TABLE "fixture_media"
  ADD COLUMN IF NOT EXISTS "embeddable" boolean NOT NULL DEFAULT true;
