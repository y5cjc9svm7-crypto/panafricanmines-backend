import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getReference } from '../services/referenceService.js';

const router = Router();

// Drives every dropdown and filter on the site.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const ref = await getReference();
    res.json(ref);
  })
);

export default router;
