import { query } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { uuid } from '../lib/ids.js';
import config from '../config.js';
import { sendMail } from '../lib/mailer.js';
import { referrerWelcomeEmail, newReferrerOpsEmail } from './emailTemplates.js';
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
  // Preferred: separate first/last name. Backward-compatible: fall back to a
  // single full name (fullName/name) if first/last are not supplied.
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const fallbackFull = String(input.fullName || input.name || '').trim();
  const fullName = (firstName || lastName)
    ? [firstName, lastName].filter(Boolean).join(' ')
    : fallbackFull;
  const email = String(input.email || '').trim();
  const country = String(input.country || '').trim() || null;
  if (!fullName) throw new HttpError(400, 'Your name is required');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'A valid email is required');
  if (input.ageConfirmed !== true) throw new HttpError(400, 'You must confirm you are at least 18 years old');
  if (input.acceptedTerms !== true) throw new HttpError(400, 'You must accept the referral programme terms');
  const existing = await query(
    `SELECT code FROM referrers WHERE lower(email) = lower($1) AND status = 'active' LIMIT 1`,
    [email]
  );
  // Reusing an existing code is not a new registration, so no email is resent.
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
       (id, code, full_name, first_name, last_name, email, country, age_confirmed, terms_version, accepted_at, reg_ip, reg_user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,now(),$9,$10)`,
    [uuid(), code, fullName, firstName || null, lastName || null, email, country,
     input.termsVersion || null, meta.ip || null, meta.userAgent || null]
  );
  // Fire-and-forget notifications. Email is best-effort: the code is already
  // saved and returned below, so a mail failure must never block registration.
  try {
    const referrer = { code, full_name: fullName, first_name: firstName || null, last_name: lastName || null, email, country };
    sendMail({ to: email, ...referrerWelcomeEmail(referrer) });            // welcome the referrer
    if (config.mail.opsNotify) {
      sendMail({ to: config.mail.opsNotify, ...newReferrerOpsEmail(referrer) }); // notify the operator
    }
  } catch (e) {
    /* ignore: notifications are best-effort */
  }
  return { code, reused: false };
}
// Resolve a code to an active referrer, or null. Case-insensitive on the suffix.
export async function getReferrerByCode(code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return null;
  const { rows } = await query(`SELECT * FROM referrers WHERE upper(code) = $1 AND status = 'active'`, [c]);
  return rows[0] || null;
}
