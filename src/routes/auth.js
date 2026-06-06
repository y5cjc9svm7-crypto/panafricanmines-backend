import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireOperator } from '../middleware/auth.js';
import { loginSchema } from '../validators/schemas.js';
import { login } from '../services/operatorService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import config from '../config.js';

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

// Logged-in operator changes their own login details.
// Blank optional fields are left unchanged; the current password is required.
const changeCredentialsSchema = z
  .object({
    currentPassword: z.string().min(1),
    newEmail: z.string().trim().email().max(160).optional().or(z.literal('')),
    newName: z.string().trim().max(120).optional().or(z.literal('')),
    newPassword: z.string().min(8).max(200).optional().or(z.literal('')),
  })
  .strip();

router.post(
  '/change-credentials',
  requireOperator,
  validate(changeCredentialsSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newEmail, newName, newPassword } = req.body;
    const { rows } = await query('SELECT * FROM operators WHERE id = $1 AND active', [req.operator.id]);
    const op = rows[0];
    if (!op) throw new HttpError(401, 'Operator not found');

    const ok = await bcrypt.compare(currentPassword, op.password_hash);
    if (!ok) throw new HttpError(401, 'Current password is incorrect');

    const sets = [];
    const params = [];
    let i = 1;
    let email = op.email;
    let name = op.name;

    if (newEmail && newEmail.trim() && newEmail.trim().toLowerCase() !== op.email.toLowerCase()) {
      const dup = await query('SELECT 1 FROM operators WHERE lower(email) = lower($1) AND id <> $2', [newEmail.trim(), op.id]);
      if (dup.rows.length) throw new HttpError(409, 'That email is already in use');
      email = newEmail.trim();
      sets.push(`email = $${i++}`);
      params.push(email);
    }
    if (newName && newName.trim()) {
      name = newName.trim();
      sets.push(`name = $${i++}`);
      params.push(name);
    }
    if (newPassword && newPassword.trim()) {
      const hash = await bcrypt.hash(newPassword, 12);
      sets.push(`password_hash = $${i++}`);
      params.push(hash);
    }
    if (sets.length) {
      params.push(op.id);
      await query(`UPDATE operators SET ${sets.join(', ')} WHERE id = $${i}`, params);
    }

    const token = jwt.sign(
      { sub: op.id, email, role: op.role, name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    res.json({ ok: true, token, operator: { id: op.id, email, name, role: op.role } });
  })
);

export default router;
