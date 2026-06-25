-- 008_joint_venture.sql
-- Adds the optional "Open for joint venture" answer to listings.
--
-- Backward-compatible by design:
--   * The column is NULLable, so every existing listing keeps working and simply
--     shows as NULL ("not answered"). No existing row is changed or rejected.
--   * IF NOT EXISTS makes this safe to run more than once.
--
-- Values written by the app:  TRUE = "Yes", FALSE = "No", NULL = not answered.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS joint_venture BOOLEAN;
