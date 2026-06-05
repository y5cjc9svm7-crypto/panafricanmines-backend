import crypto from 'node:crypto';
import { query } from '../db/pool.js';

// Listing IDs follow the platform convention  PAM-<CC>-<0000>
// where CC is the ISO country code and the sequence is per country.
// We rely on a Postgres advisory-lock-free sequence table for safe concurrency.
export async function nextListingId(client, countryCode) {
  const cc = String(countryCode || 'XX').toUpperCase().slice(0, 2);
  const q = client || { query };
  const { rows } = await q.query(
    `INSERT INTO listing_counters (country_code, seq)
       VALUES ($1, 1)
     ON CONFLICT (country_code)
       DO UPDATE SET seq = listing_counters.seq + 1
     RETURNING seq`,
    [cc]
  );
  const seq = rows[0].seq;
  return `PAM-${cc}-${String(seq).padStart(4, '0')}`;
}

export function token(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function uuid() {
  return crypto.randomUUID();
}
