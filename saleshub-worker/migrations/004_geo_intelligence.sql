-- Migration 004: visitor geo and traffic-quality signals for Geo Intelligence.
ALTER TABLE funnel_events ADD COLUMN ip_address TEXT;
ALTER TABLE funnel_events ADD COLUMN country TEXT;
ALTER TABLE funnel_events ADD COLUMN city TEXT;
ALTER TABLE funnel_events ADD COLUMN region TEXT;
ALTER TABLE funnel_events ADD COLUMN timezone TEXT;
ALTER TABLE funnel_events ADD COLUMN user_agent TEXT;
ALTER TABLE funnel_events ADD COLUMN bot_status TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE funnel_events ADD COLUMN bot_reason TEXT;
ALTER TABLE funnel_events ADD COLUMN device_type TEXT NOT NULL DEFAULT 'unknown';
CREATE INDEX IF NOT EXISTS idx_funnel_events_geo ON funnel_events(country, city, occurred_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_bot ON funnel_events(bot_status, occurred_at);
INSERT OR IGNORE INTO schema_migrations (id) VALUES ('004_geo_intelligence');
