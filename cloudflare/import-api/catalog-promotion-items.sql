CREATE TABLE IF NOT EXISTS catalog_promotion_items (
  slot TEXT NOT NULL CHECK (slot IN ('day','week')),
  product_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  image_url TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  campaign TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (slot, product_id)
);
INSERT OR IGNORE INTO catalog_promotion_items (slot,product_id,price_cents,image_url,expires_at)
SELECT slot,product_id,price_cents,image_url,expires_at FROM catalog_promotions;

ALTER TABLE catalog_product_overrides ADD COLUMN category TEXT;
