-- Migration 008: first-party anonymous visitor page-view analytics.
-- No raw IP address, full user-agent, names, emails, or query-string URLs are stored.
CREATE TABLE IF NOT EXISTS visitor_page_views (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer_host TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,
  gclid TEXT,
  gbraid TEXT,
  wbraid TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  timezone TEXT,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  bot_status TEXT NOT NULL DEFAULT 'unknown',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_visitor_views_date ON visitor_page_views(occurred_at);
CREATE INDEX IF NOT EXISTS idx_visitor_views_visitor ON visitor_page_views(visitor_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_visitor_views_session ON visitor_page_views(session_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_visitor_views_path ON visitor_page_views(page_path, occurred_at);
CREATE INDEX IF NOT EXISTS idx_visitor_views_source ON visitor_page_views(source, occurred_at);
CREATE INDEX IF NOT EXISTS idx_visitor_views_bot ON visitor_page_views(bot_status, occurred_at);
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT OR IGNORE INTO schema_migrations (id) VALUES ('008_visitor_page_views');
