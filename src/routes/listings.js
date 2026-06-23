import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import {
  listingQuerySchema, createListingSchema, contactRequestSchema,
} from '../validators/schemas.js';
import { listPublic, getPublicById, createListing, recordView } from '../services/listingService.js';
import { createContactRequest } from '../services/contactService.js';
const router = Router();
function meta(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}
// Public search
router.get(
  '/',
  validate(listingQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await listPublic(req.query));
  })
);
// Single public listing
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getPublicById(req.params.id));
  })
);
// Count a public "watched" event (operator-only counter). Fire-and-forget from
// the frontend; just bumps the counter and returns 204 No Content.
router.post(
  '/:id/view',
  asyncHandler(async (req, res) => {
    await recordView(req.params.id);
    res.status(204).end();
  })
);
// Submit a new listing ("Sell an asset")
router.post(
  '/',
  writeLimiter,
  validate(createListingSchema),
  asyncHandler(async (req, res) => {
    const listing = await createListing(req.body, meta(req));
    res.status(201).json(listing);
  })
);
// Buyer "Request contact"
router.post(
  '/:id/contact-requests',
  writeLimiter,
  validate(contactRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await createContactRequest(req.params.id, req.body, meta(req));
    res.status(201).json(result);
  })
);
export default router;
