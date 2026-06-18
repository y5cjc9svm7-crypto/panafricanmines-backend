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
