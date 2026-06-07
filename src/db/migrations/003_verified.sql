-- ============================================================
-- Add the "independently verified" flag to listings
-- ============================================================
-- Safe to run repeatedly: only adds the column if it isn't there yet.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
