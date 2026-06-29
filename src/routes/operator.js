import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireOperator } from '../middleware/auth.js';
import {
  operatorListingQuerySchema, declineSchema, closeSchema,
} from '../validators/schemas.js';
import {
  listForOperator, getForOperator, transition, toOperator, deleteListing,
} from '../services/listingService.js';
import { operatorStats } from '../services/statsService.js';
import { listContactRequests } from '../services/contactService.js';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

// Everything below requires a valid operator JWT.
router.use(requireOperator);

router.get('/stats', asyncHandler(async (req, res) => res.json(await operatorStats())));

router.get(
  '/listings',
  validate(operatorListingQuerySchema, 'query'),
  asyncHandler(async (req, res) => res.json(await listForOperator(req.query)))
);

router.get(
  '/listings/:id',
  asyncHandler(async (req, res) => res.json(await getForOperator(req.params.id)))
);

router.post(
  '/listings/:id/publish',
  asyncHandler(async (req, res) =>
    res.json(await transition(req.params.id, 'publish', req.operator))
  )
);

router.post(
  '/listings/:id/decline',
  validate(declineSchema),
  asyncHandler(async (req, res) =>
    res.json(await transition(req.params.id, 'decline', req.operator, { reason: req.body.reason }))
  )
);

router.post(
  '/listings/:id/offer',
  asyncHandler(async (req, res) =>
    res.json(await transition(req.params.id, 'offer', req.operator))
  )
);

router.post(
  '/listings/:id/close',
  validate(closeSchema),
  asyncHandler(async (req, res) =>
    res.json(
      await transition(req.params.id, 'close', req.operator, {
        transactionValue: req.body.transactionValue,
      })
    )
  )
);

router.post(
  '/listings/:id/withdraw',
  asyncHandler(async (req, res) =>
    res.json(await transition(req.params.id, 'withdraw', req.operator))
  )
);

router.post(
  '/listings/:id/restore',
  asyncHandler(async (req, res) =>
    res.json(await transition(req.params.id, 'restore', req.operator))
  )
);

router.delete(
  '/listings/:id',
  asyncHandler(async (req, res) => res.json(await deleteListing(req.params.id, req.operator)))
);

// ── Buyer (contact) requests (operator) ─────────────────────────────────
// Every buyer who requested an introduction, joined to the listing they were
// interested in, newest first. Operator-only (the whole router is behind
// requireOperator), since this is personal data. Returns a stable camelCase
// shape the dashboard consumes directly.
router.get(
  '/contact-requests',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT c.id, c.listing_id, c.buyer_email, c.buyer_name, c.message, c.status, c.created_at,
              l.name AS listing_name
         FROM contact_requests c
         LEFT JOIN listings l ON l.id = c.listing_id
        ORDER BY c.created_at DESC`
    );
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        listingId: r.listing_id,
        listingName: r.listing_name,
        buyerEmail: r.buyer_email,
        buyerName: r.buyer_name,
        message: r.message,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  })
);

// ── Edit / delete a buyer (contact) request (operator) ──────────────────
// Editable: buyer email, buyer name, message, status. A blank text field means
// "leave unchanged". Status is one of New / Contacted / Closed and is always
// applied when provided.
const editContactRequestSchema = z
  .object({
    buyerEmail: z.string().trim().max(200).optional().or(z.literal('')),
    buyerName: z.string().trim().max(200).optional().or(z.literal('')),
    message: z.string().trim().max(5000).optional().or(z.literal('')),
    status: z.enum(['New', 'Contacted', 'Closed']).optional(),
  })
  .strip();

router.post(
  '/contact-requests/:id/edit',
  validate(editContactRequestSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const patch = req.body;
    const sets = [];
    const params = [];
    let i = 1;
    // Blank text field = leave unchanged.
    for (const [key, col] of Object.entries({ buyerEmail: 'buyer_email', buyerName: 'buyer_name', message: 'message' })) {
      if (patch[key] === undefined) continue;
      const val = typeof patch[key] === 'string' ? patch[key].trim() : patch[key];
      if (val === '') continue;
      sets.push(`${col} = $${i++}`);
      params.push(val);
    }
    // Status is always applied when provided.
    if (patch.status !== undefined) { sets.push(`status = $${i++}`); params.push(patch.status); }

    if (!sets.length) return res.json({ ok: true, changed: 0 });

    params.push(id);
    const upd = await query(
      `UPDATE contact_requests SET ${sets.join(', ')} WHERE id = $${i} RETURNING id`,
      params
    );
    if (!upd.rows.length) throw new HttpError(404, 'Contact request not found');
    res.json({ ok: true, changed: sets.length });
  })
);

// Permanently delete a buyer request. This cannot be undone.
router.delete(
  '/contact-requests/:id',
  asyncHandler(async (req, res) => {
    const del = await query('DELETE FROM contact_requests WHERE id = $1 RETURNING id', [req.params.id]);
    if (!del.rows.length) throw new HttpError(404, 'Contact request not found');
    res.json({ deleted: true, id: req.params.id });
  })
);

// ── Referrers (operator) ────────────────────────────────────────────────
// Every person who registered for the referral programme, with a count of how
// many listings each has brought in and how many of those are flagged for
// review (e.g. 'same-ip'). Operator-only (the whole router is behind
// requireOperator), since this is personal data.
router.get(
  '/referrers',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT r.id, r.code, r.full_name, r.first_name, r.last_name, r.email, r.country, r.status,
              r.terms_version, r.accepted_at, r.reg_ip, r.created_at,
              count(l.id)::int AS listings_count,
              count(l.id) FILTER (WHERE l.referral_flag IS NOT NULL)::int AS flagged_count
         FROM referrers r
         LEFT JOIN listings l ON l.referrer_id = r.id
        GROUP BY r.id
        ORDER BY r.created_at DESC`
    );
    res.json({
      items: rows.map((r) => ({
        id: r.id,
        code: r.code,
        fullName: r.full_name,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        country: r.country,
        status: r.status,
        termsVersion: r.terms_version,
        acceptedAt: r.accepted_at,
        regIp: r.reg_ip,
        createdAt: r.created_at,
        listingsCount: r.listings_count,
        flaggedCount: r.flagged_count,
      })),
    });
  })
);

// ── Edit / delete a referrer (operator) ─────────────────────────────────
// Editable: first/last name, email, country, status. The code is intentionally
// NOT editable (it is stamped onto listings and is how attribution works).
// A blank text field means "leave unchanged". Setting status to 'inactive'
// is a safe soft-delete: the record is kept but the code can no longer be used
// on new listings (getReferrerByCode only matches active referrers).
const editReferrerSchema = z
  .object({
    firstName: z.string().trim().max(120).optional(),
    lastName: z.string().trim().max(120).optional(),
    fullName: z.string().trim().max(200).optional(),   // legacy single-name, still accepted
    email: z.string().trim().email().max(160).optional().or(z.literal('')),
    country: z.string().trim().max(80).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strip();

router.post(
  '/referrers/:id/edit',
  validate(editReferrerSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const patch = req.body;

    // Need the current names to recompute the combined full_name when only one
    // of first/last is being changed.
    const cur = await query('SELECT first_name, last_name FROM referrers WHERE id = $1', [id]);
    if (!cur.rows.length) throw new HttpError(404, 'Referrer not found');

    const sets = [];
    const params = [];
    let i = 1;

    // Name: prefer first/last. A blank field means "leave unchanged". When
    // either changes, first_name, last_name and the combined full_name are all
    // kept in sync. A legacy single fullName is accepted only if no first/last
    // were supplied.
    const fn = typeof patch.firstName === 'string' ? patch.firstName.trim() : undefined;
    const ln = typeof patch.lastName === 'string' ? patch.lastName.trim() : undefined;
    if ((fn !== undefined && fn !== '') || (ln !== undefined && ln !== '')) {
      const newFirst = (fn !== undefined && fn !== '') ? fn : (cur.rows[0].first_name || '');
      const newLast = (ln !== undefined && ln !== '') ? ln : (cur.rows[0].last_name || '');
      sets.push(`first_name = $${i++}`); params.push(newFirst || null);
      sets.push(`last_name = $${i++}`); params.push(newLast || null);
      sets.push(`full_name = $${i++}`); params.push([newFirst, newLast].filter(Boolean).join(' ') || null);
    } else if (typeof patch.fullName === 'string' && patch.fullName.trim() !== '') {
      sets.push(`full_name = $${i++}`); params.push(patch.fullName.trim());
    }

    // Other editable fields (blank text = no change).
    for (const [key, col] of Object.entries({ email: 'email', country: 'country', status: 'status' })) {
      if (patch[key] === undefined) continue;
      let val = patch[key];
      if (typeof val === 'string') { val = val.trim(); if (val === '') continue; }
      sets.push(`${col} = $${i++}`);
      params.push(val);
    }

    if (!sets.length) return res.json({ ok: true, changed: 0 });

    params.push(id);
    const upd = await query(
      `UPDATE referrers SET ${sets.join(', ')} WHERE id = $${i} RETURNING id`,
      params
    );
    if (!upd.rows.length) throw new HttpError(404, 'Referrer not found');
    res.json({ ok: true, changed: sets.length });
  })
);

// Permanently delete a referrer. Any listings that used their code keep the
// referral_code text on record (for commission history); only the foreign-key
// link (referrer_id) is cleared so the delete does not violate the constraint.
router.delete(
  '/referrers/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await withTransaction(async (client) => {
      const exist = await client.query('SELECT id FROM referrers WHERE id = $1 FOR UPDATE', [id]);
      if (!exist.rows.length) throw new HttpError(404, 'Referrer not found');
      const det = await client.query('UPDATE listings SET referrer_id = NULL WHERE referrer_id = $1', [id]);
      await client.query('DELETE FROM referrers WHERE id = $1', [id]);
      return { detached: det.rowCount || 0 };
    });
    res.json({ deleted: true, id, detachedListings: result.detached });
  })
);

// ── Edit a listing's content (operator) ─────────────────────────────────
// All fields optional; a blank text field means "leave unchanged".
const editListingSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    assetType: z.string().trim().max(120).optional(),
    commodity: z.string().trim().max(80).optional(),
    family: z.string().trim().max(80).optional(),
    country: z.string().trim().max(80).optional(),
    region: z.string().trim().max(80).optional(),
    district: z.string().trim().max(160).optional(),
    licence: z.string().trim().max(120).optional(),
    area: z.coerce.number().int().min(0).max(100000000).optional(),
    stage: z.string().trim().max(120).optional(),
    priceLabel: z.string().trim().max(80).optional(),
    priceVal: z.coerce.number().int().min(0).optional(),
    verified: z.boolean().optional(),
    contactFirstName: z.string().trim().max(120).optional(),
    contactLastName: z.string().trim().max(120).optional(),
    contactEmail: z.string().trim().max(200).optional(),
  })
  .strip();

const EDIT_COLS = {
  name: 'name', assetType: 'asset_type', commodity: 'commodity', family: 'family',
  country: 'country', region: 'region', district: 'district', licence: 'licence',
  area: 'area_ha', stage: 'stage', priceLabel: 'price_label', priceVal: 'price_val',
  verified: 'verified',
  contactFirstName: 'contact_first_name', contactLastName: 'contact_last_name', contactEmail: 'contact_email',
};

router.post(
  '/listings/:id/edit',
  validate(editListingSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const patch = req.body;
    const sets = [];
    const params = [];
    let i = 1;
    for (const [key, col] of Object.entries(EDIT_COLS)) {
      if (patch[key] === undefined) continue;
      let val = patch[key];
      if (typeof val === 'string') { val = val.trim(); if (val === '') continue; } // blank = no change
      sets.push(`${col} = $${i++}`);
      params.push(val);
    }
    const updated = await withTransaction(async (client) => {
      const exist = await client.query('SELECT id FROM listings WHERE id = $1 FOR UPDATE', [id]);
      if (!exist.rows.length) throw new HttpError(404, 'Listing not found');
      if (!sets.length) {
        const cur = await client.query('SELECT * FROM listings WHERE id = $1', [id]);
        return cur.rows[0];
      }
      params.push(id);
      const upd = await client.query(
        `UPDATE listings SET ${sets.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING *`,
        params
      );
      return upd.rows[0];
    });
    res.json(toOperator(updated));
  })
);

export default router;
