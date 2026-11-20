-- Migration 006: internal product and pricing master.
-- Additive only; existing funnel, Geo Intelligence, orders and prospects remain untouched.
CREATE TABLE IF NOT EXISTS product_master (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  variant TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  moq INTEGER NOT NULL DEFAULT 1 CHECK (moq >= 0),
  material_cost REAL NOT NULL DEFAULT 0 CHECK (material_cost >= 0),
  print_cost REAL NOT NULL DEFAULT 0 CHECK (print_cost >= 0),
  finishing_cost REAL NOT NULL DEFAULT 0 CHECK (finishing_cost >= 0),
  labor_cost REAL NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  other_cost REAL NOT NULL DEFAULT 0 CHECK (other_cost >= 0),
  selling_price REAL NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_product_master_category ON product_master(category, active);
CREATE INDEX IF NOT EXISTS idx_product_master_name ON product_master(product_name);
CREATE TABLE IF NOT EXISTS product_price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  old_selling_price REAL NOT NULL,
  new_selling_price REAL NOT NULL,
  old_unit_cost REAL NOT NULL,
  new_unit_cost REAL NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_product_price_history_product ON product_price_history(product_id, changed_at DESC);
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT OR IGNORE INTO schema_migrations (id) VALUES ('006_product_master');
