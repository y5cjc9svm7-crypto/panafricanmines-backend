import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { exploreStats } from '../services/statsService.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await exploreStats());
  })
);

export default router;
