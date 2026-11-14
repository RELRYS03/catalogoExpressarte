CREATE TABLE IF NOT EXISTS catalog_promotions (
  slot TEXT PRIMARY KEY CHECK (slot IN ('day','week')),
  product_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  image_url TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL
);
