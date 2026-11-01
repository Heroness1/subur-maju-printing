-- SalesHub prospects — Cloudflare D1 schema.
-- Stages match the SalesHub dashboard exactly:
-- New, Qualified, Draft ready, Contacted, Interested, Negotiation, Won
-- Apply with: wrangler d1 execute saleshub-db --file=./schema.sql
-- (remote: add --remote; local dev: omit --remote)

CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  website TEXT,
  jakarta_address TEXT,
  city TEXT,
  industry TEXT,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  stage TEXT NOT NULL DEFAULT 'New' CHECK (
    stage IN ('New', 'Qualified', 'Draft ready', 'Contacted', 'Interested', 'Negotiation', 'Won')
  ),
  pic_name TEXT,
  pic_role TEXT,
  email TEXT,
  draft_email TEXT,
  follow_up_date TEXT,
  source_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects (stage);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects (score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_follow_up ON prospects (follow_up_date);
