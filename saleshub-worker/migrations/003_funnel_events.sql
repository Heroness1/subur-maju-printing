-- Migration 003: privacy-conscious website funnel event storage.
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- Events are NOT sales leads. A whatsapp_click records intent only, not a
-- confirmed conversation. Actual leads must be created/qualified separately.
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
INSERT OR IGNORE INTO schema_migrations (id) VALUES ('003_funnel_events');
