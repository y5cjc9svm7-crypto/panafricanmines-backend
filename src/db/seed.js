import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './pool.js';
import { migrate } from './migrate.js';
import { uuid } from '../lib/ids.js';
import config from '../config.js';
import logger from '../lib/logger.js';
import {
  COMMODITY_FAMILIES, COMM_CODE, COUNTRY_META, DISTRICTS_FORM,
  ASSET_TYPES, LICENCES_FORM, STAGES_FORM, AREAS_FORM, PRICES_FORM,
  buildSampleListings,
} from './seedData.js';

async function seedReference(client) {
  // Commodities
  let sort = 0;
  for (const fam of COMMODITY_FAMILIES) {
    for (const name of fam.items) {
      await client.query(
        `INSERT INTO ref_commodities (family, name, code, sort)
           VALUES ($1,$2,$3,$4)
         ON CONFLICT (family, name) DO UPDATE SET code = EXCLUDED.code, sort = EXCLUDED.sort`,
        [fam.g, name, COMM_CODE[name] || null, sort++]
      );
    }
  }

  // Countries + districts
  sort = 0;
  for (const [name, meta] of Object.entries(COUNTRY_META)) {
    await client.query(
      `INSERT INTO ref_countries (name, region, cc, sort)
         VALUES ($1,$2,$3,$4)
       ON CONFLICT (name) DO UPDATE SET region = EXCLUDED.region, cc = EXCLUDED.cc, sort = EXCLUDED.sort`,
      [name, meta.region, meta.cc, sort++]
    );
    const districts = DISTRICTS_FORM[name] || [];
    let dsort = 0;
    for (const d of districts) {
      await client.query(
        `INSERT INTO ref_districts (country, name, sort)
           VALUES ($1,$2,$3)
         ON CONFLICT (country, name) DO UPDATE SET sort = EXCLUDED.sort`,
        [name, d, dsort++]
      );
    }
  }

  // Generic lists
  const lists = {
    asset_type: ASSET_TYPES,
    licence: LICENCES_FORM,
    stage: STAGES_FORM,
    area: AREAS_FORM,
    price: PRICES_FORM,
  };
  for (const [kind, values] of Object.entries(lists)) {
    let s = 0;
    for (const value of values) {
      await client.query(
        `INSERT INTO ref_lists (kind, value, sort)
           VALUES ($1,$2,$3)
         ON CONFLICT (kind, value) DO UPDATE SET sort = EXCLUDED.sort`,
        [kind, value, s++]
      );
    }
  }
  logger.info('Reference data seeded.');
}

async function seedOperator(client) {
  const { rows } = await client.query('SELECT id FROM operators WHERE lower(email) = lower($1)', [
    config.seed.operatorEmail,
  ]);
  if (rows.length) {
    logger.info(`Operator ${config.seed.operatorEmail} already exists — skipping.`);
    return;
  }
  const hash = await bcrypt.hash(config.seed.operatorPassword, 12);
  await client.query(
    `INSERT INTO operators (id, email, password_hash, name, role)
       VALUES ($1,$2,$3,$4,'admin')`,
    [uuid(), config.seed.operatorEmail, hash, config.seed.operatorName]
  );
  logger.info(`Bootstrap operator created: ${config.seed.operatorEmail} (change the password after first login).`);
}

async function seedSampleListings(client) {
  const { rows } = await client.query('SELECT count(*)::int AS c FROM listings');
  if (rows[0].c > 0) {
    logger.info('Listings table not empty — skipping sample data.');
    return;
  }
  const items = buildSampleListings();
  for (const l of items) {
    await client.query(
      `INSERT INTO listings
        (id, name, asset_type, commodity, family, country, region, district, licence,
         area_ha, stage, price_label, price_val, status, contact_email, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::listing_status,$15,
               CASE WHEN $14::text IN ('Live','Under offer') THEN now() ELSE NULL END)`,
      [l.id, l.name, l.licence, l.commodity, l.family, l.country, l.region, l.district,
       l.licence, l.area, l.stage, l.priceLabel, l.priceVal, l.status, 'seller@example.com']
    );
  }
  // Advance per-country counters past the highest seeded sequence to avoid ID collisions.
  await client.query(`
    INSERT INTO listing_counters (country_code, seq)
    SELECT split_part(id, '-', 2) AS cc,
           max(split_part(id, '-', 3)::int) AS seq
      FROM listings GROUP BY 1
    ON CONFLICT (country_code) DO UPDATE SET seq = GREATEST(listing_counters.seq, EXCLUDED.seq)
  `);
  logger.info(`Seeded ${items.length} sample listings.`);
}

export async function seed() {
  await migrate();
  await withTransaction(async (client) => {
    await seedReference(client);
    await seedOperator(client);
    if (config.seed.sampleListings) await seedSampleListings(client);
  });
  logger.info('Seed complete.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Seed error');
      process.exit(1);
    });
}
