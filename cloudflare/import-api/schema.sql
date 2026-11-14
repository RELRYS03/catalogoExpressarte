-- Catálogo Express'Arte: somente metadados; não armazena STL.
CREATE TABLE IF NOT EXISTS catalog_imports (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL UNIQUE,
  source_site TEXT NOT NULL DEFAULT 'makerworld',
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Outros',
  price_cents INTEGER,
  license_name TEXT NOT NULL DEFAULT '',
  commercial_use_allowed INTEGER NOT NULL DEFAULT 0,
  image_use_allowed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_catalog_import_status ON catalog_imports(status,created_at);
