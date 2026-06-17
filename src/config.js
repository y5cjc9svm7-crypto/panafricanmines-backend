import dotenv from 'dotenv';
dotenv.config();

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}
function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 8080),
  isProd: (process.env.NODE_ENV || 'development') === 'production',

  corsOrigin: (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    connectionString: process.env.DATABASE_URL,
    ssl:
      (process.env.PGSSLMODE || 'disable').toLowerCase() === 'require'
        ? { rejectUnauthorized: false }
        : false,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'insecure-dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },

  seed: {
    operatorEmail: process.env.SEED_OPERATOR_EMAIL || 'ops@stramin.africa',
    operatorPassword: process.env.SEED_OPERATOR_PASSWORD || 'change-me-now',
    operatorName: process.env.SEED_OPERATOR_NAME || 'Platform Operator',
    sampleListings: bool(process.env.SEED_SAMPLE_LISTINGS, false),
  },

  feeRate: num(process.env.MATCHING_FEE_RATE, 0.1),

  mail: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'PanAfricanMines <no-reply@panafricanmines.com>',
    opsNotify: process.env.OPS_NOTIFY_EMAIL || '',
  },

  publicSiteUrl: (() => {
    let u = (process.env.PUBLIC_SITE_URL || 'https://panafricanmines.com').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');  // ensure scheme so email links are absolute
    return u;
  })(),

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: num(process.env.RATE_LIMIT_MAX, 100),
  },
};

if (config.isProd && config.jwt.secret === 'insecure-dev-secret-change-me') {
  // eslint-disable-next-line no-console
  console.error('FATAL: JWT_SECRET must be set in production.');
  process.exit(1);
}

export default config;
