-- Remember the status a listing had immediately before it was withdrawn,
-- so an accidental withdrawal can be undone (restored to that exact status).
-- Nullable: it is only set while a listing is "Withdrawn" and cleared on restore.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS prev_status listing_status;
