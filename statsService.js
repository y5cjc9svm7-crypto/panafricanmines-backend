import { query } from '../db/pool.js';

const PUBLIC = ['Live', 'Under offer'];

// Operator dashboard tiles.
export async function operatorStats() {
  const counts = await query(`SELECT status, count(*)::int AS c FROM listings GROUP BY status`);
  const out = { pending: 0, live: 0, underOffer: 0, closed: 0, declined: 0 };
  for (const r of counts.rows) {
    if (r.status === 'Pending review') out.pending = r.c;
    else if (r.status === 'Live') out.live = r.c;
    else if (r.status === 'Under offer') out.underOffer = r.c;
    else if (r.status === 'Closed') out.closed = r.c;
    else if (r.status === 'Declined') out.declined = r.c;
  }
  const fees = await query(
    `SELECT coalesce(sum(fee_invoiced),0)::bigint AS total, count(*)::int AS deals
       FROM listings WHERE status = 'Closed' AND fee_invoiced IS NOT NULL`
  );
  out.feesInvoiced = Number(fees.rows[0].total);
  out.closedDeals = fees.rows[0].deals;
  return out;
}

// Market explorer: region x family matrix, per-country counts, public totals.
export async function exploreStats() {
  const rows = (await query(
    `SELECT region, family, country, count(*)::int AS c
       FROM listings WHERE status = ANY($1) GROUP BY region, family, country`,
    [PUBLIC]
  )).rows;

  const regionFamily = {}; // region -> family -> count
  const regionCountry = {}; // region -> country -> count
  const totalsByRegion = {};
  let total = 0;

  for (const r of rows) {
    regionFamily[r.region] = regionFamily[r.region] || {};
    regionFamily[r.region][r.family] = (regionFamily[r.region][r.family] || 0) + r.c;
    regionCountry[r.region] = regionCountry[r.region] || {};
    regionCountry[r.region][r.country] = (regionCountry[r.region][r.country] || 0) + r.c;
    totalsByRegion[r.region] = (totalsByRegion[r.region] || 0) + r.c;
    total += r.c;
  }

  return { regionFamily, regionCountry, totalsByRegion, total };
}
