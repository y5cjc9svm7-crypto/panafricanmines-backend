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

router.get(
  '/contact-requests',
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query;
    res.json({
      items: await listContactRequests({
        status: status || undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      }),
    });
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
      `SELECT r.id, r.code, r.full_name, r.email, r.country, r.status,
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
// Editable: name, email, country, status. The code is intentionally NOT
// editable (it is stamped onto listings and is how attribution works).
// A blank text field means "leave unchanged". Setting status to 'inactive'
// is a safe soft-delete: the record is kept but the code can no longer be used
// on new listings (getReferrerByCode only matches active referrers).
const editReferrerSchema = z
  .object({
    fullName: z.string().trim().max(200).optional(),
    email: z.string().trim().email().max(160).optional().or(z.literal('')),
    country: z.string().trim().max(80).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .strip();

const REF_EDIT_COLS = {
  fullName: 'full_name', email: 'email', country: 'country', status: 'status',
};

router.post(
  '/referrers/:id/edit',
  validate(editReferrerSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const patch = req.body;
    const sets = [];
    const params = [];
    let i = 1;
    for (const [key, col] of Object.entries(REF_EDIT_COLS)) {
      if (patch[key] === undefined) continue;
      let val = patch[key];
      if (typeof val === 'string') { val = val.trim(); if (val === '') continue; } // blank = no change
      sets.push(`${col} = $${i++}`);
      params.push(val);
    }
    if (!sets.length) {
      const cur = await query('SELECT id FROM referrers WHERE id = $1', [id]);
      if (!cur.rows.length) throw new HttpError(404, 'Referrer not found');
      return res.json({ ok: true, changed: 0 });
    }
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
  })
  .strip();

const EDIT_COLS = {
  name: 'name', assetType: 'asset_type', commodity: 'commodity', family: 'family',
  country: 'country', region: 'region', district: 'district', licence: 'licence',
  area: 'area_ha', stage: 'stage', priceLabel: 'price_label', priceVal: 'price_val',
  verified: 'verified',
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
