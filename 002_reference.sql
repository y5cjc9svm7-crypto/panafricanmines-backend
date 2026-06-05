-- ============================================================
-- Reference data tables (drive the dropdowns and filters).
-- These were hard-coded in the original front-end; the backend
-- now owns them so they can be edited without a redeploy.
-- ============================================================

CREATE TABLE IF NOT EXISTS ref_commodities (
  id        SERIAL PRIMARY KEY,
  family    TEXT NOT NULL,
  name      TEXT NOT NULL,
  code      TEXT,
  sort      INTEGER NOT NULL DEFAULT 0,
  active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (family, name)
);

CREATE TABLE IF NOT EXISTS ref_countries (
  name      TEXT PRIMARY KEY,
  region    TEXT,
  cc        TEXT,
  sort      INTEGER NOT NULL DEFAULT 0,
  active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ref_districts (
  id        SERIAL PRIMARY KEY,
  country   TEXT NOT NULL REFERENCES ref_countries (name) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  sort      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (country, name)
);

-- Generic single-column lists (asset types, licences, stages, area bands, price bands).
CREATE TABLE IF NOT EXISTS ref_lists (
  id        SERIAL PRIMARY KEY,
  kind      TEXT NOT NULL,   -- asset_type | licence | stage | area | price
  value     TEXT NOT NULL,
  sort      INTEGER NOT NULL DEFAULT 0,
  active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (kind, value)
);
CREATE INDEX IF NOT EXISTS idx_ref_lists_kind ON ref_lists (kind);
