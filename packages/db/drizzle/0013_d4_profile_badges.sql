-- D4 「你 vs AI」对战榜: persistent profile badges (ProfileBadge[] jsonb)
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "badges" jsonb NOT NULL DEFAULT '[]'::jsonb;
