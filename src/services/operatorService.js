import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { HttpError } from '../middleware/error.js';
import config from '../config.js';

export async function login(email, password) {
  const { rows } = await query(
    `SELECT * FROM operators WHERE lower(email) = lower($1) AND active`,
    [email]
  );
  const op = rows[0];
  // Constant-ish time: always run a hash comparison.
  const hash = op ? op.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);
  if (!op || !ok) throw new HttpError(401, 'Invalid email or password');

  await query(`UPDATE operators SET last_login_at = now() WHERE id = $1`, [op.id]);

  const token = jwt.sign(
    { sub: op.id, email: op.email, role: op.role, name: op.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  return {
    token,
    operator: { id: op.id, email: op.email, name: op.name, role: op.role },
  };
}
