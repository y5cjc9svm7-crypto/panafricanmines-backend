-- 003_region_southern_africa.sql
-- Reclassify Zambia and Mozambique under the "Southern Africa" grouping
-- (SADC / Southern Africa), consistent with Angola, Botswana, Eswatini,
-- Lesotho, Malawi, Namibia, South Africa and Zimbabwe.
--
-- Runs automatically once on the next deploy (migration runner).
-- Safe to keep: it only updates two countries and is idempotent.

-- 1) Reference table -> drives the region of NEW listings and the explorer.
UPDATE ref_countries
   SET region = 'Southern Africa'
 WHERE name IN ('Zambia', 'Mozambique');

-- 2) Back-fill the region stored on EXISTING listings.
UPDATE listings
   SET region = 'Southern Africa'
 WHERE country IN ('Zambia', 'Mozambique');
