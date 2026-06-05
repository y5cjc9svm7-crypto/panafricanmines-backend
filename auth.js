import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireOperator } from '../middleware/auth.js';
import { loginSchema } from '../validators/schemas.js';
import { login } from '../services/operatorService.js';

const router = Router();

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    res.json(await login(req.body.email, req.body.password));
  })
);

router.get('/me', requireOperator, (req, res) => res.json({ operator: req.operator }));

export default router;
