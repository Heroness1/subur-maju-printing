-- Migration 002: persistent quotations + quotation items (Phase 3).
-- RUN EXACTLY ONCE, after migration 001. ADDITIVE ONLY: it never alters
-- the prospects table, its columns, or its rows.
--
-- BACK UP FIRST (mandatory, same rule as migration 001):
--   wrangler d1 export saleshub-db --remote --output backup-saleshub-db.sql
-- Pre-check: the quotations table must NOT already exist. If it does,
-- stop - this migration is already applied. Do NOT re-run it after
-- quotations have been written, or the schema_migrations marker below
-- will fail on its PRIMARY KEY (that failure is the run-once guard,
-- consistent with migration 001) and a partial re-run must be inspected
-- before any retry.
-- Run BEFORE deploying the Worker that serves /api/quotations:
--   wrangler d1 execute saleshub-db --remote --file=./migrations/002_quotations.sql
-- Verify after running:
--   wrangler d1 execute saleshub-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('quotations','quotation_items');"
--   wrangler d1 execute saleshub-db --remote --command "SELECT COUNT(*) FROM prospects;"
-- The prospects row count must be unchanged by this migration.
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  prospect_id TEXT NOT NULL,
  quote_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Sent','Accepted','Rejected','Expired')),
  product TEXT,
  discount REAL NOT NULL DEFAULT 0,
  shipping REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_terms TEXT,
  production_lead_time TEXT,
  delivery TEXT,
  notes TEXT,
  valid_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  description TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  unit_price REAL NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quotations_prospect ON quotations (prospect_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items (quotation_id);
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO schema_migrations (id) VALUES ('002_quotations');
