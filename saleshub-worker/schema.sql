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

-- Quotations (Phase 3, migration 002). For a FRESH database this file
-- creates them directly; for an EXISTING v2 database, run
-- migrations/002_quotations.sql instead (it is additive and never
-- alters prospects). Totals are computed server-side by the Worker.
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


-- Website funnel events are behavioral telemetry, not verified sales leads.
CREATE TABLE IF NOT EXISTS funnel_events (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'whatsapp_click','category_selected','product_selected','add_to_cart',
    'begin_checkout','order_details_generated','order_request_prepared'
  )),
  session_id TEXT,
  occurred_at TEXT NOT NULL,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,
  gclid TEXT,
  gbraid TEXT,
  wbraid TEXT,
  landing_page TEXT,
  page_location TEXT,
  referrer TEXT,
  product TEXT,
  category TEXT,
  quantity INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_funnel_events_name_date ON funnel_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_campaign ON funnel_events(campaign, occurred_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_landing ON funnel_events(landing_page, occurred_at);

CREATE INDEX IF NOT EXISTS idx_quotations_prospect ON quotations (prospect_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON quotation_items (quotation_id);
