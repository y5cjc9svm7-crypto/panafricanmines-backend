import logger from '../lib/logger.js';
import config from '../config.js';

// A small helper for throwing HTTP errors from anywhere.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: { message: 'Not found' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) logger.error({ err, path: req.path }, 'Request error');
  else logger.debug({ err: err.message, path: req.path }, 'Client error');

  const body = { error: { message: status >= 500 ? 'Internal server error' : err.message } };
  if (err.details) body.error.details = err.details;
  if (!config.isProd && status >= 500) body.error.stack = err.stack;
  res.status(status).json(body);
}
