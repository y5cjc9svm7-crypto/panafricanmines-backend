import { query, withTransaction } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import { nextListingId, uuid } from '../lib/ids.js';
import { matchingFee, priceBandToValue, parseAreaHa, formatUSD } from '../lib/money.js';
import config from '../config.js';
import logger from '../lib/logger.js';
import { resolveCommodityFamily, resolveCountry, getReference } from './referenceService.js';
import { notifyAlertsForListing } from './alertService.js';
import { sendMail } from '../lib/mailer.js';
import { listingSubmittedEmail, newSubmissionOpsEmail, listingPublishedEmail } from './emailTemplates.js';
import { getReferrerByCode } from './referrerService.js';
import { runListingSanityCheck } from './listingSanityCheck.js';

const PUBLIC_STATUSES = ['Live', 'Under offer'];

// Convert a positive integer to a Roman numeral (2 -> II, 3 -> III, ...).
// Used to keep auto-generated listing names unique.
function toRoman(n) {
  const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
               [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let s = '';
  for (const [v, sym] of map) { while (n >= v) { s += sym; n -= v; } }
  return s;
}

// Map a DB row to the public API shape (camelCase; no internal fields).
export function toPublic(row) {
  return {
    id: row.id,
    name: row.name,
    assetType: row.asset_type,
    commodity: row.commodity,
    family: row.family,
    country: row.country,
    region: row.region,
    district: row.district,
    licence: row.licence,
    area: row.area_ha,
    stage: row.stage,
    priceLabel: row.price_label,
    priceVal: row.price_val == null ? null : Number(row.price_val),
    status: row.status,
    verified: row.verified === true,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    // NOTE: jointVenture is intentionally NOT exposed publicly. If you ever want
    // buyers to see it, add:  jointVenture: row.joint_venture,
    // NOTE: contactName / contactEmail are private and operator-only (see toOperator).
  };
}

// Operator view exposes everything.
export function toOperator(row) {
  return {
    ...toPublic(row),
    contactFirstName: row.contact_first_name || null,
    contactLastName: row.contact_last_name || null,
    contactName: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || null,
    contactEmail: row.contact_email,
    jointVenture: row.joint_venture,          // true = Yes, false = No, null = not answered
    feeInvoiced: row.fee_invoiced == null ? null : Number(row.fee_invoiced),
    declineReason: row.decline_reason,
    viewCount: row.view_count == null ? 0 : Number(row.view_count),
    referralCode: row.referral_code || null,
    referralFlag: row.referral_flag || null,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

// ── Public listing search ───────────────────────────────────────────────
export async function listPublic(filters) {
  const where = [`status = ANY($1)`];
  const params = [PUBLIC_STATUSES];
  let i = 2;

  if (filters.status) { where.push(`status = $${i++}`); params.push(filters.status); }
  if (filters.commodity && filters.commodity !== 'All') { where.push(`commodity = $${i++}`); params.push(filters.commodity); }
  if (filters.country && filters.country !== 'All') { where.push(`country = $${i++}`); params.push(filters.country); }
  if (filters.licence && filters.licence !== 'All') { where.push(`licence = $${i++}`); params.push(filters.licence); }
  if (filters.q) {
    where.push(`(name ILIKE $${i} OR id ILIKE $${i} OR district ILIKE $${i} OR country ILIKE $${i})`);
    params.push(`%${filters.q}%`); i++;
  }

  const whereSql = where.join(' AND ');
  const offset = (filters.page - 1) * filters.limit;

  const totalQ = await query(`SELECT count(*)::int AS c FROM listings WHERE ${whereSql}`, params);
  const rowsQ = await query(
    `SELECT * FROM listings WHERE ${whereSql}
       ORDER BY published_at DESC NULLS LAST, created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
    [...params, filters.limit, offset]
  );

  // Facets reflect the full public pool (so the dropdowns list everything available).
  const facetsQ = await query(
    `SELECT 'commodity' AS k, commodity AS v FROM listings WHERE status = ANY($1)
     UNION ALL SELECT 'country', country FROM listings WHERE status = ANY($1)
     UNION ALL SELECT 'licence', licence FROM listings WHERE status = ANY($1)`,
    [PUBLIC_STATUSES]
  );
  const facets = { commodities: new Set(), countries: new Set(), licences: new Set() };
  for (const r of facetsQ.rows) {
    if (r.k === 'commodity') facets.commodities.add(r.v);
    else if (r.k === 'country') facets.countries.add(r.v);
    else facets.licences.add(r.v);
  }

  return {
    items: rowsQ.rows.map(toPublic),
    total: totalQ.rows[0].c,
    page: filters.page,
    limit: filters.limit,
    facets: {
      commodities: [...facets.commodities].sort(),
      countries: [...facets.countries].sort(),
      licences: [...facets.licences].sort(),
    },
  };
}

export async function getPublicById(id) {
  const { rows } = await query(`SELECT * FROM listings WHERE id = $1 AND status = ANY($2)`, [id, PUBLIC_STATUSES]);
  if (!rows.length) throw new HttpError(404, 'Listing not found');
  return toPublic(rows[0]);
}

// Increment the public "watched" counter for a listing. Only publicly visible
// listings are counted. Never throws: a failed count must not break the page
// the visitor is looking at.
export async function recordView(id) {
  await query(
    `UPDATE listings SET view_count = view_count + 1 WHERE id = $1 AND status = ANY($2)`,
    [id, PUBLIC_STATUSES]
  );
}

// Attach a referrer's code to a listing, once, at submission. Hard-blocks an
// exact self-referral (referrer email == lister contact email). Records a
// non-blocking review flag for soft signals (e.g. same originating IP) that the
// operator can check before any payout. The referral is immutable once set.
export async function attachReferral(listingId, code, meta = {}) {
  const referrer = await getReferrerByCode(code);
  if (!referrer) throw new HttpError(404, 'Referral code not found');

  const { rows } = await query(
    `SELECT id, contact_email, referrer_id FROM listings WHERE id = $1`,
    [listingId]
  );
  const listing = rows[0];
  if (!listing) throw new HttpError(404, 'Listing not found');
  if (listing.referrer_id) throw new HttpError(409, 'This listing already has a referral code');

  if (
    listing.contact_email &&
    listing.contact_email.trim().toLowerCase() === String(referrer.email).trim().toLowerCase()
  ) {
    throw new HttpError(400, 'The referrer cannot be the same person listing this asset');
  }

  const flags = [];
  if (meta.ip && referrer.reg_ip && meta.ip === referrer.reg_ip) flags.push('same-ip');
  const flag = flags.length ? flags.join(',') : null;

  await query(
    `UPDATE listings SET referrer_id = $2, referral_code = $3, referral_flag = $4 WHERE id = $1`,
    [listingId, referrer.id, referrer.code, flag]
  );
  return { attached: true, code: referrer.code, flag };
}

// ── Submission ("Sell an asset") ────────────────────────────────────────
export async function createListing(input, meta = {}) {
  const family = await resolveCommodityFamily(input.commodity);
  const { region, cc } = await resolveCountry(input.country);
  const ref = await getReference();
  const commodityCode = ref.commodityCode[input.commodity] || input.commodity.slice(0, 2);

  // Base name = district + commodity code + asset-type word, plus the project
  // stage after an en dash (e.g. "Chingola Cu Brownfield – Feasibility").
  // The stage is appended only when present, so this stays backward-safe.
  const stageLabel = (input.stage || '').trim();
  const baseName =
    (input.location.split(',')[0] || input.location).trim() +
    ' ' + commodityCode + ' ' + (input.assetType.split(' ')[0] || 'Asset') +
    (stageLabel ? ' \u2013 ' + stageLabel : '');

  const priceVal = priceBandToValue(input.price);
  const areaHa = parseAreaHa(input.area);

  // First and last name of the person listing the asset (required by the form).
  const firstName = input.firstName ? String(input.firstName).trim() : null;
  const lastName = input.lastName ? String(input.lastName).trim() : null;

  // "Open for joint venture": 'Yes' -> true, 'No' -> false, anything else -> null
  // (null = "not answered", which keeps the field fully optional/backward-safe).
  const jointVenture =
    input.jointVenture === 'Yes' ? true : input.jointVenture === 'No' ? false : null;

  const listing = await withTransaction(async (client) => {
    const id = await nextListingId(client, cc);

    // Keep the auto-generated name unique. The first listing keeps the plain
    // base name; any later listing that would collide gets a Roman-numeral
    // suffix (base, then "base II", "base III", ...). URLs use the ID, not the
    // name, so this never affects links.
    let name = baseName;
    const { rows: sameName } = await client.query(
      `SELECT name FROM listings WHERE name = $1 OR name LIKE $1 || ' %'`,
      [baseName]
    );
    if (sameName.some((r) => r.name === baseName)) {
      const used = new Set(sameName.map((r) => r.name));
      let n = 2;
      while (used.has(baseName + ' ' + toRoman(n))) n++;
      name = baseName + ' ' + toRoman(n);
    }

    const insert = await client.query(
      `INSERT INTO listings
        (id, name, asset_type, commodity, family, country, region, district, licence,
         area_ha, stage, price_label, price_val, status, contact_email, joint_venture, contact_first_name, contact_last_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Pending review',$14,$15,$16,$17)
       RETURNING *`,
      [id, name, input.assetType, input.commodity, family, input.country, region,
       input.location, input.licence, areaHa, input.stage || null,
       input.price || null, priceVal, input.email || null, jointVenture, firstName, lastName]
    );
    await client.query(
      `INSERT INTO engagement_letters
        (id, listing_id, terms_version, accepted, signature_image, ip, user_agent)
       VALUES ($1,$2,$3,TRUE,$4,$5,$6)`,
      [uuid(), id, input.engagementLetter.termsVersion, input.engagementLetter.signature,
       meta.ip || null, meta.userAgent || null]
    );
    return insert.rows[0];
  });

  // Fire-and-forget notifications.
  if (listing.contact_email) {
    const m = listingSubmittedEmail(listing);
    sendMail({ to: listing.contact_email, ...m });
  }
  if (config.mail.opsNotify) {
    const m = newSubmissionOpsEmail(listing);
    sendMail({ to: config.mail.opsNotify, ...m });
  }

  // Claude-powered rough sanity check -> emails the verdict to the operator.
  // Fire-and-forget: it never throws and never blocks submission.
  runListingSanityCheck(listing).catch((err) =>
    logger.error({ err, id: listing.id }, 'Listing sanity check failed to start')
  );

  return toOperator(listing);
}

// ── Operator queue ──────────────────────────────────────────────────────
export async function listForOperator(filters) {
  const where = [];
  const params = [];
  let i = 1;
  if (filters.status && filters.status !== 'All') { where.push(`status = $${i++}`); params.push(filters.status); }
  if (filters.q) {
    where.push(`(name ILIKE $${i} OR id ILIKE $${i} OR country ILIKE $${i})`);
    params.push(`%${filters.q}%`); i++;
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (filters.page - 1) * filters.limit;

  const totalQ = await query(`SELECT count(*)::int AS c FROM listings ${whereSql}`, params);
  const rowsQ = await query(
    `SELECT * FROM listings ${whereSql} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
    [...params, filters.limit, offset]
  );
  const countsQ = await query(`SELECT status, count(*)::int AS c FROM listings GROUP BY status`);
  const counts = { 'Pending review': 0, Live: 0, 'Under offer': 0, Closed: 0, Declined: 0, Withdrawn: 0 };
  for (const r of countsQ.rows) counts[r.status] = r.c;

  return { items: rowsQ.rows.map(toOperator), total: totalQ.rows[0].c, page: filters.page, limit: filters.limit, counts };
}

export async function getForOperator(id) {
  const { rows } = await query(`SELECT * FROM listings WHERE id = $1`, [id]);
  if (!rows.length) throw new HttpError(404, 'Listing not found');
  const listing = toOperator(rows[0]);
  const eng = await query(
    `SELECT terms_version, accepted, signature_image, signed_at, ip FROM engagement_letters WHERE listing_id = $1 ORDER BY signed_at DESC LIMIT 1`,
    [id]
  );
  const contacts = await query(
    `SELECT id, buyer_email, buyer_name, message, status, created_at FROM contact_requests WHERE listing_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  return { ...listing, engagementLetter: eng.rows[0] || null, contactRequests: contacts.rows };
}

// ── Status transitions ──────────────────────────────────────────────────
const TRANSITIONS = {
  publish: { from: ['Pending review'], to: 'Live' },
  decline: { from: ['Pending review'], to: 'Declined' },
  offer: { from: ['Live'], to: 'Under offer' },
  withdraw: { from: ['Pending review', 'Live', 'Under offer'], to: 'Withdrawn' },
  // Undo a withdrawal. The target status is resolved at runtime from the
  // status the listing held before it was withdrawn (see the restore branch).
  restore: { from: ['Withdrawn'] },
  close: { from: ['Under offer'], to: 'Closed' },
};

async function audit(client, operator, action, listingId, extra) {
  await client.query(
    `INSERT INTO audit_log (operator_id, action, listing_id, meta) VALUES ($1,$2,$3,$4)`,
    [operator?.id || null, action, listingId, extra ? JSON.stringify(extra) : null]
  );
}

export async function transition(id, action, operator, opts = {}) {
  const rule = TRANSITIONS[action];
  if (!rule) throw new HttpError(400, `Unknown action: ${action}`);

  const updated = await withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM listings WHERE id = $1 FOR UPDATE`, [id]);
    if (!rows.length) throw new HttpError(404, 'Listing not found');
    const cur = rows[0];
    if (!rule.from.includes(cur.status)) {
      throw new HttpError(409, `Cannot ${action} a listing that is "${cur.status}". Allowed from: ${rule.from.join(', ')}.`);
    }

    let sql, params, restoredTo;
    if (action === 'publish') {
      sql = `UPDATE listings SET status='Live', published_at=now(), decline_reason=NULL WHERE id=$1 RETURNING *`;
      params = [id];
    } else if (action === 'decline') {
      sql = `UPDATE listings SET status='Declined', decline_reason=$2 WHERE id=$1 RETURNING *`;
      params = [id, opts.reason || null];
    } else if (action === 'offer') {
      sql = `UPDATE listings SET status='Under offer' WHERE id=$1 RETURNING *`;
      params = [id];
    } else if (action === 'withdraw') {
      // Remember the current status so the withdrawal can be undone later.
      sql = `UPDATE listings SET prev_status=status, status='Withdrawn' WHERE id=$1 RETURNING *`;
      params = [id];
    } else if (action === 'restore') {
      // Undo a withdrawal: put the listing back to the exact status it held
      // before it was withdrawn. Withdrawals made before this feature existed
      // have no recorded prior status, so they default to 'Live'. When the
      // target is 'Live', published_at is (re)set if it was never published.
      const RESTORABLE = ['Pending review', 'Live', 'Under offer'];
      restoredTo = RESTORABLE.includes(cur.prev_status) ? cur.prev_status : 'Live';
      if (restoredTo === 'Live') {
        sql = `UPDATE listings SET status='Live', prev_status=NULL, published_at=COALESCE(published_at, now()) WHERE id=$1 RETURNING *`;
        params = [id];
      } else {
        sql = `UPDATE listings SET status=$2, prev_status=NULL WHERE id=$1 RETURNING *`;
        params = [id, restoredTo];
      }
    } else {
      // close: invoice the matching fee
      const basis = opts.transactionValue != null ? opts.transactionValue : Number(cur.price_val || 0);
      const fee = matchingFee(basis, config.feeRate);
      sql = `UPDATE listings SET status='Closed', closed_at=now(), fee_invoiced=$2 WHERE id=$1 RETURNING *`;
      params = [id, fee];
    }

    const res = await client.query(sql, params);
    await audit(client, operator, action, id, action === 'restore' ? { to: restoredTo } : opts);
    return res.rows[0];
  });

  // Side effects after commit.
  if (action === 'publish') {
    notifyAlertsForListing(updated).catch((err) =>
      logger.error({ err, id }, 'Alert notification failed')
    );
    // Confirm to the seller that their listing is now live.
    if (updated.contact_email) {
      const m = listingPublishedEmail(updated);
      sendMail({ to: updated.contact_email, ...m });
    }
  }
  if (action === 'close') {
    logger.info(
      { id, fee: updated.fee_invoiced },
      `Fee invoiced ${formatUSD(updated.fee_invoiced)} on close of ${id}`
    );
  }

  return toOperator(updated);
}

// ── Hard delete (operator) ──────────────────────────────────
// Permanently removes a listing AND, via ON DELETE CASCADE, its engagement
// letter (signature), contact requests and alert-notification records.
// A deletion record is written to the audit log (no FK to listings, so it
// survives the delete). This is irreversible.
export async function deleteListing(id, operator) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT id, name, status FROM listings WHERE id = $1 FOR UPDATE', [id]);
    if (!rows.length) throw new HttpError(404, 'Listing not found');
    await audit(client, operator, 'delete', id, { name: rows[0].name, status: rows[0].status });
    await client.query('DELETE FROM listings WHERE id = $1', [id]);
    return { deleted: true, id };
  });
}
