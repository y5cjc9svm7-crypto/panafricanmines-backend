-- 004_listing_status_withdrawn.sql
-- Adds a "Withdrawn" status so a listing can be taken off the public site
-- (hidden from buyers) without being deleted and without invoicing a fee.
-- Public statuses remain 'Live' and 'Under offer'; 'Withdrawn' is non-public.
-- PostgreSQL 12+ allows ADD VALUE inside a transaction as long as the value is
-- not USED in the same transaction (it isn't here), so this is migration-safe.
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'Withdrawn';
