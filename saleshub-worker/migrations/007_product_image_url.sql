-- Migration 007: product catalog thumbnails.
-- Additive only; existing product master records remain unchanged.
ALTER TABLE product_master ADD COLUMN image_url TEXT;
INSERT OR IGNORE INTO schema_migrations (id) VALUES ('007_product_image_url');
