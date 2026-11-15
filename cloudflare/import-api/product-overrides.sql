CREATE TABLE IF NOT EXISTS catalog_product_overrides (
  id TEXT PRIMARY KEY,
  price_cents INTEGER,
  image_url TEXT NOT NULL DEFAULT ''
);
