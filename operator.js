import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireOperator } from '../middleware/auth.js';
import {
  operatorListingQuerySchema, declineSchema, closeSchema,
} from '../validators/schemas.js';
import {
  listForOperator, getForOperator, transition,
} from '../services/listingService.js';
import { operatorStats } from '../services/statsService.js';
import { listContactRequests } from '../services/contactService.js';

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

export default router;
