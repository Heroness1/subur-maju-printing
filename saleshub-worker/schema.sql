-- SalesHub prospects — Cloudflare D1 schema (v2).
-- Stages match the SalesHub dashboard exactly:
-- New, Qualified, Draft ready, Contacted, Interested, Negotiation, Won, Lost, Opt-out
-- v2 adds the frontend lead fields (qty, price, area, source, verification, ...).
-- For an EXISTING database, run migrations/001_extend_prospects.sql first
-- (it recreates the table preserving rows); this file alone does not add
-- columns to a table that already exists.
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

CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects (stage);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects (score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_follow_up ON prospects (follow_up_date);
