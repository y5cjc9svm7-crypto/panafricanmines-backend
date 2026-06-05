import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { createAlertSchema } from '../validators/schemas.js';
import {
  createAlert, unsubscribe, deleteAlertByToken, listAlertsByEmail,
} from '../services/alertService.js';

const router = Router();

// Create an alert ("Notify me when a listing matches my criteria")
router.post(
  '/',
  writeLimiter,
  validate(createAlertSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createAlert(req.body));
  })
);

// List a subscriber's own alerts:  GET /alerts?email=you@example.com
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const email = String(req.query.email || '').trim();
    if (!email) return res.json({ alerts: [] });
    res.json({ alerts: await listAlertsByEmail(email) });
  })
);

// One-click unsubscribe link target (used in alert emails).
router.get(
  '/unsubscribe',
  asyncHandler(async (req, res) => {
    const tok = String(req.query.token || '');
    await unsubscribe(tok);
    res
      .type('html')
      .send('<p style="font-family:sans-serif">You have been unsubscribed from this alert.</p>');
  })
);

// Programmatic delete (used by the in-page "Delete" button).
router.delete(
  '/:token',
  asyncHandler(async (req, res) => {
    res.json(await deleteAlertByToken(req.params.token));
  })
);

export default router;
