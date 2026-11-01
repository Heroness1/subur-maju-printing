-- Migration 001: extend prospects with frontend lead fields + Lost/Opt-out.
-- RUN EXACTLY ONCE, on a v1 database. It is NOT safe to re-run after v2
-- data exists: a second run would rebuild the table from the old column
-- list and reset v2-only fields (qty, price, area, ...) to defaults.
-- Pre-check before running: the prospects table must NOT already have an
-- 'area' column. Check with:
--   wrangler d1 execute saleshub-db --remote --command "SELECT name FROM pragma_table_info('prospects') WHERE name='area';"
-- If that returns 'area', the migration is already applied - stop, do not run it.
-- The schema_migrations marker below makes a second run fail fast on a
-- UNIQUE constraint instead of silently proceeding; if you see that error,
-- the migration was already applied.
-- Run BEFORE deploying the v2 Worker:
--   wrangler d1 execute saleshub-db --remote --file=./migrations/001_extend_prospects.sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO schema_migrations (id) VALUES ('001_extend_prospects');
CREATE TABLE IF NOT EXISTS prospects_v2 (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  website TEXT,
  jakarta_address TEXT,
  city TEXT,
  industry TEXT,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  stage TEXT NOT NULL DEFAULT 'New' CHECK (
    stage IN ('New', 'Qualified', 'Draft ready', 'Contacted', 'Interested', 'Negotiation', 'Won', 'Lost', 'Opt-out')
  ),
  pic_name TEXT,
  pic_role TEXT,
  email TEXT,
  draft_email TEXT,
  follow_up_date TEXT,
  source_url TEXT,
  notes TEXT,
  area TEXT,
  qty INTEGER NOT NULL DEFAULT 1000,
  price INTEGER NOT NULL DEFAULT 27500,
  po_value REAL,
  source TEXT,
  verification_status TEXT,
  verified_at TEXT,
  reason TEXT,
  sent_date TEXT,
  last_narahubung TEXT,
  company_source_url TEXT,
  contact_source_url TEXT,
  email_source_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT OR IGNORE INTO prospects_v2
  (id, company, website, jakarta_address, city, industry, score, stage,
   pic_name, pic_role, email, draft_email, follow_up_date, source_url, notes,
   created_at, updated_at)
  SELECT id, company, website, jakarta_address, city, industry, score, stage,
   pic_name, pic_role, email, draft_email, follow_up_date, source_url, notes,
   created_at, updated_at FROM prospects;
DROP TABLE prospects;
ALTER TABLE prospects_v2 RENAME TO prospects;
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects (stage);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects (score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_follow_up ON prospects (follow_up_date);
