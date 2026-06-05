import { HttpError } from './error.js';

// Validate req[part] against a Zod schema, replacing it with the parsed value.
export const validate = (schema, part = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return next(new HttpError(400, 'Validation failed', details));
  }
  req[part] = result.data;
  next();
};
