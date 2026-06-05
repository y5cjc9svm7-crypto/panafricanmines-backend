import jwt from 'jsonwebtoken';
import config from '../config.js';
import { HttpError } from './error.js';

// Verify a Bearer JWT and attach the operator claims to req.operator.
export function requireOperator(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Authentication required'));
  }
  try {
    const claims = jwt.verify(token, config.jwt.secret);
    req.operator = { id: claims.sub, email: claims.email, role: claims.role, name: claims.name };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.operator || !roles.includes(req.operator.role)) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }
    next();
  };
}
