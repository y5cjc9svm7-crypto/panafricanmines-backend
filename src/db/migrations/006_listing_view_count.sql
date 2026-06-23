-- Public "watched" counter: how often a listing's detail page has been opened
-- by visitors. Visible to the operator only. Defaults to 0 for existing rows.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
