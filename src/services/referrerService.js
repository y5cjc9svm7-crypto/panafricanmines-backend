import { query } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { uuid } from '../lib/ids.js';

// Code alphabet without easily-confused characters (no 0/O, 1/I, etc.).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randomCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return 'PAM-' + s;
}

// Opt-in registration. Validates inline (no schema dependency). Returns the
// referrer's code. If the email already has an active code, that code is reused
// rather than issuing a duplicate.
export async function registerReferrer(input = {}, meta = {}) {
  const name = String(input.fullName || input.name || '').trim();
  const email = String(input.email || '').trim();
  const country = String(input.country || '').trim() || null;

  if (!name) throw new HttpError(400, 'Your name is required');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required');
  if (input.ageConfirmed !== true) throw new HttpError(400, 'You must confirm you are at least 18 years old');
  if (input.acceptedTerms !== true) throw new HttpError(400, 'You must accept the referral programme terms');

  const existing = await query(
    `SELECT code FROM referrers WHERE lower(email) = lower($1) AND status = 'active' LIMIT 1`,
    [email]
  );
  if (existing.rows.length) return { code: existing.rows[0].code, reused: true };

  let code = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = randomCode();
    const clash = await query(`SELECT 1 FROM referrers WHERE code = $1`, [candidate]);
    if (!clash.rows.length) { code = candidate; break; }
  }
  if (!code) throw new HttpError(500, 'Could not generate a referral code, please try again');

  await query(
    `INSERT INTO referrers
       (id, code, full_name, email, country, age_confirmed, terms_version, accepted_at, reg_ip, reg_user_agent)
     VALUES ($1,$2,$3,$4,$5,TRUE,$6,now(),$7,$8)`,
    [uuid(), code, name, email, country, input.termsVersion || null, meta.ip || null, meta.userAgent || null]
  );
  return { code, reused: false };
}

// Resolve a code to an active referrer, or null. Case-insensitive on the suffix.
export async function getReferrerByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  const { rows } = await query(`SELECT * FROM referrers WHERE upper(code) = $1 AND status = 'active'`, [c]);
  return rows[0] || null;
}
