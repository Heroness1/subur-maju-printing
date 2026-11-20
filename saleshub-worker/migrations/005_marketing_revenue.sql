-- Migration 005: confirmed sales orders and daily campaign spend.
-- Additive only. Existing prospects, quotations, funnel events, and Geo Intelligence are untouched.
CREATE TABLE IF NOT EXISTS sales_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  prospect_id TEXT NOT NULL,
  quotation_id TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','in_production','completed','cancelled')),
  confirmed_at TEXT NOT NULL,
  revenue REAL NOT NULL CHECK (revenue >= 0),
  cogs REAL NOT NULL DEFAULT 0 CHECK (cogs >= 0),
  shipping_cost REAL NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  other_cost REAL NOT NULL DEFAULT 0 CHECK (other_cost >= 0),
  source TEXT,
  medium TEXT,
  campaign TEXT,
  gclid TEXT,
  gbraid TEXT,
  wbraid TEXT,
  session_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_orders_confirmed ON sales_orders(status, confirmed_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_prospect ON sales_orders(prospect_id, confirmed_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_campaign ON sales_orders(campaign, confirmed_at);

CREATE TABLE IF NOT EXISTS campaign_spend (
  id TEXT PRIMARY KEY,
  spend_date TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Google Ads',
  campaign TEXT NOT NULL,
  spend REAL NOT NULL CHECK (spend >= 0),
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  impressions INTEGER NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(spend_date, platform, campaign)
);
CREATE INDEX IF NOT EXISTS idx_campaign_spend_date ON campaign_spend(spend_date);
CREATE INDEX IF NOT EXISTS idx_campaign_spend_campaign ON campaign_spend(campaign, spend_date);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT OR IGNORE INTO schema_migrations (id) VALUES ('005_marketing_revenue');
