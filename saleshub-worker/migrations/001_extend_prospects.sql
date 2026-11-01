-- Migration 001: extend prospects with frontend lead fields + Lost/Opt-out.
-- RUN EXACTLY ONCE, on a v1 database.
--
-- ATOMICITY, HONESTLY: D1 rejects BEGIN/COMMIT (D1 wraps a single query
-- or a batch in a transaction itself and does not expose explicit
-- transactions), so do NOT add BEGIN/COMMIT to this file - it will fail
-- on D1. wrangler d1 execute --file also does not promise all-or-nothing
-- for a multi-statement file, so a half-migration is possible in theory.
-- That is why this file is written to be RECOVERABLE, not just "run once":
--   1. BACK UP FIRST (mandatory):
--        wrangler d1 export saleshub-db --remote --output backup-saleshub-db.sql
--   2. Pre-check: the prospects table must NOT already have an 'area' column:
--        wrangler d1 execute saleshub-db --remote --command "SELECT name FROM pragma_table_info('prospects') WHERE name='area';"
--      If that returns 'area', stop - the migration is already applied.
--   3. Run this file, then VERIFY (row count must match the backup, and
--      the new columns must exist):
--        wrangler d1 execute saleshub-db --remote --command "SELECT COUNT(*) FROM prospects;"
--        wrangler d1 execute saleshub-db --remote --command "SELECT name FROM pragma_table_info('prospects') WHERE name IN ('area','qty','price');"
--   4. The schema_migrations marker is LAST on purpose. The old version
--      put it FIRST, which was worse: a failure after the marker left a
--      "migrated" marker on a half-migrated table and blocked retry.
--      With the marker last, a failure before it leaves no marker, and a
--      retry is possible in every case EXCEPT failure between DROP and
--      RENAME (see recovery below).
-- RECOVERY:
--   - Failure before DROP: just re-run this file. CREATE ... IF NOT EXISTS
--     and INSERT OR IGNORE make the copy step idempotent (no duplicates).
--   - Failure between DROP and RENAME: prospects is gone, but the data is
--     intact in prospects_v2. Do NOT re-run this file. Recover with only:
--        ALTER TABLE prospects_v2 RENAME TO prospects;
--     then create the three indexes at the bottom of this file by hand.
--   - Failure after RENAME: re-running is safe only if no v2-only data
--     (qty, price, area, ...) has been written yet; otherwise a re-run
--     rebuilds from the old column list and resets those fields.
-- Run BEFORE deploying the v2 Worker:
--   wrangler d1 execute saleshub-db --remote --file=./migrations/001_extend_prospects.sql
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
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO schema_migrations (id) VALUES ('001_extend_prospects');
