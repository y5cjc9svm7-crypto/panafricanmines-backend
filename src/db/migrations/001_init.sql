-- ============================================================
-- PanAfricanMines — core schema
-- ============================================================

-- Status of a listing through its lifecycle.
DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM
    ('Pending review', 'Live', 'Under offer', 'Closed', 'Declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-country sequence source for human-readable listing IDs (PAM-CC-0000).
CREATE TABLE IF NOT EXISTS listing_counters (
  country_code TEXT PRIMARY KEY,
  seq          INTEGER NOT NULL DEFAULT 0
);

-- The central entity: a mining licence or asset offered for sale.
CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,                 -- e.g. PAM-ZM-0001
  name          TEXT NOT NULL,
  asset_type    TEXT,
  commodity     TEXT NOT NULL,
  family        TEXT NOT NULL,
  country       TEXT NOT NULL,
  region        TEXT NOT NULL,
  district      TEXT NOT NULL,
  licence       TEXT NOT NULL,
  area_ha       INTEGER,
  stage         TEXT,
  price_label   TEXT,
  price_val     BIGINT,                           -- whole USD; basis for the fee
  status        listing_status NOT NULL DEFAULT 'Pending review',
  fee_invoiced  BIGINT,                           -- set on Close
  contact_email TEXT,
  decline_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listings_status     ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_country    ON listings (country);
CREATE INDEX IF NOT EXISTS idx_listings_commodity  ON listings (commodity);
CREATE INDEX IF NOT EXISTS idx_listings_licence    ON listings (licence);
CREATE INDEX IF NOT EXISTS idx_listings_region     ON listings (region);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at DESC);

-- The signed Engagement Letter that gates every listing submission.
CREATE TABLE IF NOT EXISTS engagement_letters (
  id              UUID PRIMARY KEY,
  listing_id      TEXT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  terms_version   TEXT NOT NULL,
  accepted        BOOLEAN NOT NULL DEFAULT TRUE,
  signature_image TEXT NOT NULL,                  -- PNG data URL drawn by the seller
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip              TEXT,
  user_agent      TEXT
);
CREATE INDEX IF NOT EXISTS idx_eng_listing ON engagement_letters (listing_id);

-- A buyer expressing interest ("Request contact") on a listing.
CREATE TABLE IF NOT EXISTS contact_requests (
  id          UUID PRIMARY KEY,
  listing_id  TEXT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  buyer_email TEXT,
  buyer_name  TEXT,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'new',        -- new | introduced | closed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip          TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_contact_listing ON contact_requests (listing_id);
CREATE INDEX IF NOT EXISTS idx_contact_status  ON contact_requests (status);

-- Email alert subscriptions ("Notify me when a listing matches").
-- NULL on a criterion means "Any".
CREATE TABLE IF NOT EXISTS alerts (
  id                 UUID PRIMARY KEY,
  email              TEXT NOT NULL,
  commodity          TEXT,
  country            TEXT,
  licence            TEXT,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token  TEXT NOT NULL UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_email  ON alerts (lower(email));
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts (active);

-- Dedupe table: which alerts have already been notified about which listing.
CREATE TABLE IF NOT EXISTS alert_notifications (
  alert_id   UUID NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_id, listing_id)
);

-- Back-office users.
CREATE TABLE IF NOT EXISTS operators (
  id            UUID PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'operator',  -- operator | admin
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Immutable audit trail of operator actions.
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  operator_id UUID REFERENCES operators (id),
  action      TEXT NOT NULL,
  listing_id  TEXT,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_listing ON audit_log (listing_id);

-- Keep updated_at fresh on listings.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated ON listings;
CREATE TRIGGER trg_listings_updated
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
