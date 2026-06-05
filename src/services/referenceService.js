import { query } from '../db/pool.js';

let cache = null;
let cacheAt = 0;
const TTL = 5 * 60 * 1000;

export async function getReference({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < TTL) return cache;

  const [commodities, countries, districts, lists] = await Promise.all([
    query('SELECT family, name, code FROM ref_commodities WHERE active ORDER BY sort, name'),
    query('SELECT name, region, cc FROM ref_countries WHERE active ORDER BY sort, name'),
    query('SELECT country, name FROM ref_districts ORDER BY country, sort, name'),
    query('SELECT kind, value FROM ref_lists WHERE active ORDER BY kind, sort, value'),
  ]);

  // Group commodities by family.
  const famMap = new Map();
  const commodityCode = {};
  for (const r of commodities.rows) {
    if (!famMap.has(r.family)) famMap.set(r.family, []);
    famMap.get(r.family).push(r.name);
    if (r.code) commodityCode[r.name] = r.code;
  }
  const commodityFamilies = [...famMap.entries()].map(([g, items]) => ({ g, items }));

  // Districts by country.
  const districtMap = {};
  for (const d of districts.rows) {
    (districtMap[d.country] = districtMap[d.country] || []).push(d.name);
  }

  const byKind = (k) => lists.rows.filter((r) => r.kind === k).map((r) => r.value);

  cache = {
    assetTypes: byKind('asset_type'),
    commodityFamilies,
    commodityCode,
    countries: countries.rows.map((c) => ({
      name: c.name,
      region: c.region,
      cc: c.cc,
      districts: districtMap[c.name] || [],
    })),
    licences: byKind('licence'),
    stages: byKind('stage'),
    areas: byKind('area'),
    prices: byKind('price'),
  };
  cacheAt = Date.now();
  return cache;
}

export function clearReferenceCache() {
  cache = null;
}

// Look up the family + region/cc for a commodity/country at submission time.
export async function resolveCommodityFamily(commodity) {
  const { rows } = await query('SELECT family FROM ref_commodities WHERE name = $1 LIMIT 1', [commodity]);
  return rows[0]?.family || 'Base metals';
}

export async function resolveCountry(country) {
  const { rows } = await query('SELECT region, cc FROM ref_countries WHERE name = $1 LIMIT 1', [country]);
  return rows[0] || { region: 'Africa', cc: country.slice(0, 2).toUpperCase() };
}
