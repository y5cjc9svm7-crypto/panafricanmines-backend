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

const DEMO_LISTINGS = [
  {
    "id": "PAM-ZM-0001",
    "name": "Solwezi NW Cu Block",
    "commodity": "Copper",
    "family": "Base metals",
    "country": "Zambia",
    "region": "East Africa",
    "district": "Solwezi District, NW Province",
    "licence": "Large-scale mining licence",
    "area": 1240,
    "stage": "Resource definition",
    "priceLabel": "$7M–14M",
    "priceVal": 10000000,
    "status": "Live"
  },
  {
    "id": "PAM-ZM-0002",
    "name": "Chingola Copperbelt Concession",
    "commodity": "Copper",
    "family": "Base metals",
    "country": "Zambia",
    "region": "East Africa",
    "district": "Chingola, Copperbelt",
    "licence": "Exploration licence",
    "area": 680,
    "stage": "Brownfield exploration",
    "priceLabel": "$1.8M–3.5M",
    "priceVal": 2500000,
    "status": "Live"
  },
  {
    "id": "PAM-ZM-0003",
    "name": "Mumbwa Cu-Co Tenement",
    "commodity": "Cobalt",
    "family": "Base metals",
    "country": "Zambia",
    "region": "East Africa",
    "district": "Mumbwa, Central Province",
    "licence": "Exploration licence",
    "area": 920,
    "stage": "Greenfield exploration",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-ZM-0004",
    "name": "Lufwanyama Cu Block",
    "commodity": "Copper",
    "family": "Base metals",
    "country": "Zambia",
    "region": "East Africa",
    "district": "Lufwanyama, Copperbelt",
    "licence": "Large-scale mining licence",
    "area": 1810,
    "stage": "Pre-feasibility",
    "priceLabel": "$14M–28M",
    "priceVal": 20000000,
    "status": "Live"
  },
  {
    "id": "PAM-MG-0005",
    "name": "Atsimo-Andrefana Ls Site",
    "commodity": "Limestone",
    "family": "Industrial minerals",
    "country": "Madagascar",
    "region": "East Africa",
    "district": "Atsimo-Andrefana",
    "licence": "Prospecting permit",
    "area": 765,
    "stage": "Feasibility",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-ZA-0006",
    "name": "Northern Cape U Field",
    "commodity": "Uranium",
    "family": "Energy minerals",
    "country": "South Africa",
    "region": "Southern Africa",
    "district": "Northern Cape",
    "licence": "Small-scale mining licence",
    "area": 110,
    "stage": "Greenfield exploration",
    "priceLabel": "$7M–14M",
    "priceVal": 10000000,
    "status": "Live"
  },
  {
    "id": "PAM-TZ-0007",
    "name": "Mwanza V Field",
    "commodity": "Vanadium",
    "family": "Ferrous metals",
    "country": "Tanzania",
    "region": "East Africa",
    "district": "Mwanza, Lake Zone",
    "licence": "Small-scale mining licence",
    "area": 135,
    "stage": "Care & maintenance",
    "priceLabel": "$1.8M–3.5M",
    "priceVal": 2500000,
    "status": "Live"
  },
  {
    "id": "PAM-ZM-0008",
    "name": "Chingola P Project",
    "commodity": "Phosphate",
    "family": "Industrial minerals",
    "country": "Zambia",
    "region": "East Africa",
    "district": "Chingola, Copperbelt",
    "licence": "Large-scale mining licence",
    "area": 252,
    "stage": "Resource definition",
    "priceLabel": "$1.8M–3.5M",
    "priceVal": 2500000,
    "status": "Under offer"
  },
  {
    "id": "PAM-BW-0009",
    "name": "Ghanzi District Ls Site",
    "commodity": "Limestone",
    "family": "Industrial minerals",
    "country": "Botswana",
    "region": "Southern Africa",
    "district": "Ghanzi District",
    "licence": "Small-scale mining licence",
    "area": 149,
    "stage": "Feasibility",
    "priceLabel": "$14M–28M",
    "priceVal": 20000000,
    "status": "Live"
  },
  {
    "id": "PAM-NA-0010",
    "name": "Erongo Region Ni Field",
    "commodity": "Nickel",
    "family": "Base metals",
    "country": "Namibia",
    "region": "Southern Africa",
    "district": "Erongo Region",
    "licence": "Small-scale mining licence",
    "area": 302,
    "stage": "Construction",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Pending review"
  },
  {
    "id": "PAM-BF-0011",
    "name": "Centre-Nord Region Bx Project",
    "commodity": "Bauxite",
    "family": "Industrial minerals",
    "country": "Burkina Faso",
    "region": "West Africa",
    "district": "Centre-Nord Region",
    "licence": "Small-scale mining licence",
    "area": 2939,
    "stage": "Operating mine",
    "priceLabel": "$1.8M–3.5M",
    "priceVal": 2500000,
    "status": "Live"
  },
  {
    "id": "PAM-ZM-0012",
    "name": "Serenje Ls Block",
    "commodity": "Limestone",
    "family": "Industrial minerals",
    "country": "Zambia",
    "region": "East Africa",
    "district": "Serenje, Central Province",
    "licence": "Large-scale mining licence",
    "area": 1940,
    "stage": "Pre-feasibility",
    "priceLabel": "$28M+",
    "priceVal": 40000000,
    "status": "Live"
  },
  {
    "id": "PAM-GH-0013",
    "name": "Ashanti Region Pt Tenement",
    "commodity": "Platinum",
    "family": "Precious metals",
    "country": "Ghana",
    "region": "West Africa",
    "district": "Ashanti Region",
    "licence": "Exploration licence",
    "area": 727,
    "stage": "Greenfield exploration",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-TZ-0014",
    "name": "Kahama District Sn Tenement",
    "commodity": "Tin",
    "family": "Base metals",
    "country": "Tanzania",
    "region": "East Africa",
    "district": "Kahama District",
    "licence": "Artisanal mining permit",
    "area": 807,
    "stage": "Feasibility",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-EG-0015",
    "name": "Eastern Desert Dia Tenement",
    "commodity": "Diamond",
    "family": "Gemstones",
    "country": "Egypt",
    "region": "North Africa",
    "district": "Eastern Desert",
    "licence": "Artisanal mining permit",
    "area": 604,
    "stage": "Operating mine",
    "priceLabel": "$3.5M–7M",
    "priceVal": 5200000,
    "status": "Pending review"
  },
  {
    "id": "PAM-ML-0016",
    "name": "Kayes Region Pb Block",
    "commodity": "Lead",
    "family": "Base metals",
    "country": "Mali",
    "region": "West Africa",
    "district": "Kayes Region",
    "licence": "Exploration licence",
    "area": 1205,
    "stage": "Greenfield exploration",
    "priceLabel": "$28M+",
    "priceVal": 40000000,
    "status": "Live"
  },
  {
    "id": "PAM-GH-0017",
    "name": "Western Region To Field",
    "commodity": "Tourmaline",
    "family": "Gemstones",
    "country": "Ghana",
    "region": "West Africa",
    "district": "Western Region",
    "licence": "Prospecting permit",
    "area": 3324,
    "stage": "Construction",
    "priceLabel": "$1.8M–3.5M",
    "priceVal": 2500000,
    "status": "Live"
  },
  {
    "id": "PAM-BF-0018",
    "name": "Centre-Nord Region V Tenement",
    "commodity": "Vanadium",
    "family": "Ferrous metals",
    "country": "Burkina Faso",
    "region": "West Africa",
    "district": "Centre-Nord Region",
    "licence": "Prospecting permit",
    "area": 2277,
    "stage": "Construction",
    "priceLabel": "$7M–14M",
    "priceVal": 10000000,
    "status": "Under offer"
  },
  {
    "id": "PAM-ML-0019",
    "name": "Sikasso Region Sn Concession",
    "commodity": "Tin",
    "family": "Base metals",
    "country": "Mali",
    "region": "West Africa",
    "district": "Sikasso Region",
    "licence": "Artisanal mining permit",
    "area": 2972,
    "stage": "Brownfield exploration",
    "priceLabel": "$7M–14M",
    "priceVal": 10000000,
    "status": "Live"
  },
  {
    "id": "PAM-ZM-0020",
    "name": "Lufwanyama Au Tenement",
    "commodity": "Gold",
    "family": "Precious metals",
    "country": "Zambia",
    "region": "East Africa",
    "district": "Lufwanyama, Copperbelt",
    "licence": "Exploration licence",
    "area": 622,
    "stage": "Resource definition",
    "priceLabel": "$14M–28M",
    "priceVal": 20000000,
    "status": "Pending review"
  },
  {
    "id": "PAM-MZ-0021",
    "name": "Nampula Province Cr Tenement",
    "commodity": "Chromium",
    "family": "Ferrous metals",
    "country": "Mozambique",
    "region": "East Africa",
    "district": "Nampula Province",
    "licence": "Exploration licence",
    "area": 3310,
    "stage": "Care & maintenance",
    "priceLabel": "$7M–14M",
    "priceVal": 10000000,
    "status": "Live"
  },
  {
    "id": "PAM-ZW-0022",
    "name": "Mashonaland West Mn Field",
    "commodity": "Manganese",
    "family": "Ferrous metals",
    "country": "Zimbabwe",
    "region": "Southern Africa",
    "district": "Mashonaland West",
    "licence": "Large-scale mining licence",
    "area": 173,
    "stage": "Operating mine",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Under offer"
  },
  {
    "id": "PAM-ZW-0023",
    "name": "Midlands Province Au Block",
    "commodity": "Gold",
    "family": "Precious metals",
    "country": "Zimbabwe",
    "region": "Southern Africa",
    "district": "Midlands Province",
    "licence": "Large-scale mining licence",
    "area": 705,
    "stage": "Construction",
    "priceLabel": "$3.5M–7M",
    "priceVal": 5200000,
    "status": "Live"
  },
  {
    "id": "PAM-TZ-0024",
    "name": "Chunya Na Concession",
    "commodity": "Soda ash",
    "family": "Industrial minerals",
    "country": "Tanzania",
    "region": "East Africa",
    "district": "Chunya, Mbeya",
    "licence": "Large-scale mining licence",
    "area": 1179,
    "stage": "Feasibility",
    "priceLabel": "$3.5M–7M",
    "priceVal": 5200000,
    "status": "Live"
  },
  {
    "id": "PAM-CD-0025",
    "name": "Haut-Katanga Na Block",
    "commodity": "Soda ash",
    "family": "Industrial minerals",
    "country": "DRC",
    "region": "Central Africa",
    "district": "Haut-Katanga",
    "licence": "Artisanal mining permit",
    "area": 299,
    "stage": "Operating mine",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-MZ-0026",
    "name": "Tete Province C Tenement",
    "commodity": "Coal",
    "family": "Energy minerals",
    "country": "Mozambique",
    "region": "East Africa",
    "district": "Tete Province",
    "licence": "Artisanal mining permit",
    "area": 317,
    "stage": "Brownfield exploration",
    "priceLabel": "$7M–14M",
    "priceVal": 10000000,
    "status": "Live"
  },
  {
    "id": "PAM-MZ-0027",
    "name": "Manica Province Dia Tenement",
    "commodity": "Diamond",
    "family": "Gemstones",
    "country": "Mozambique",
    "region": "East Africa",
    "district": "Manica Province",
    "licence": "Large-scale mining licence",
    "area": 195,
    "stage": "Feasibility",
    "priceLabel": "$1.8M–3.5M",
    "priceVal": 2500000,
    "status": "Under offer"
  },
  {
    "id": "PAM-MZ-0028",
    "name": "Tete Province Li Field",
    "commodity": "Lithium",
    "family": "Energy minerals",
    "country": "Mozambique",
    "region": "East Africa",
    "district": "Tete Province",
    "licence": "Large-scale mining licence",
    "area": 605,
    "stage": "Construction",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-CD-0029",
    "name": "Sud-Kivu Ru Concession",
    "commodity": "Ruby",
    "family": "Gemstones",
    "country": "DRC",
    "region": "Central Africa",
    "district": "Sud-Kivu",
    "licence": "Small-scale mining licence",
    "area": 164,
    "stage": "Greenfield exploration",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-TZ-0030",
    "name": "Geita Region U Tenement",
    "commodity": "Uranium",
    "family": "Energy minerals",
    "country": "Tanzania",
    "region": "East Africa",
    "district": "Geita Region",
    "licence": "Artisanal mining permit",
    "area": 397,
    "stage": "Construction",
    "priceLabel": "$7M–14M",
    "priceVal": 10000000,
    "status": "Live"
  },
  {
    "id": "PAM-ZM-0031",
    "name": "Mumbwa Co Block",
    "commodity": "Cobalt",
    "family": "Base metals",
    "country": "Zambia",
    "region": "East Africa",
    "district": "Mumbwa, Central Province",
    "licence": "Large-scale mining licence",
    "area": 1377,
    "stage": "Operating mine",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-GH-0032",
    "name": "Eastern Region Ag Field",
    "commodity": "Silver",
    "family": "Precious metals",
    "country": "Ghana",
    "region": "West Africa",
    "district": "Eastern Region",
    "licence": "Prospecting permit",
    "area": 292,
    "stage": "Feasibility",
    "priceLabel": "$3.5M–7M",
    "priceVal": 5200000,
    "status": "Live"
  },
  {
    "id": "PAM-ZW-0033",
    "name": "Matabeleland South Au Site",
    "commodity": "Gold",
    "family": "Precious metals",
    "country": "Zimbabwe",
    "region": "Southern Africa",
    "district": "Matabeleland South",
    "licence": "Small-scale mining licence",
    "area": 1919,
    "stage": "Feasibility",
    "priceLabel": "$3.5M–7M",
    "priceVal": 5200000,
    "status": "Live"
  },
  {
    "id": "PAM-NA-0034",
    "name": "Kunene Region Ls Project",
    "commodity": "Limestone",
    "family": "Industrial minerals",
    "country": "Namibia",
    "region": "Southern Africa",
    "district": "Kunene Region",
    "licence": "Prospecting permit",
    "area": 2555,
    "stage": "Resource definition",
    "priceLabel": "$0.4M–0.9M",
    "priceVal": 650000,
    "status": "Live"
  },
  {
    "id": "PAM-ZW-0035",
    "name": "Mashonaland West To Site",
    "commodity": "Tourmaline",
    "family": "Gemstones",
    "country": "Zimbabwe",
    "region": "Southern Africa",
    "district": "Mashonaland West",
    "licence": "Artisanal mining permit",
    "area": 401,
    "stage": "Resource definition",
    "priceLabel": "$14M–28M",
    "priceVal": 20000000,
    "status": "Under offer"
  },
  {
    "id": "PAM-MG-0036",
    "name": "Atsimo-Andrefana V Project",
    "commodity": "Vanadium",
    "family": "Ferrous metals",
    "country": "Madagascar",
    "region": "East Africa",
    "district": "Atsimo-Andrefana",
    "licence": "Large-scale mining licence",
    "area": 2327,
    "stage": "Greenfield exploration",
    "priceLabel": "$14M–28M",
    "priceVal": 20000000,
    "status": "Live"
  },
  {
    "id": "PAM-TZ-0037",
    "name": "Chunya Au Project",
    "commodity": "Gold",
    "family": "Precious metals",
    "country": "Tanzania",
    "region": "East Africa",
    "district": "Chunya, Mbeya",
    "licence": "Exploration licence",
    "area": 1232,
    "stage": "Feasibility",
    "priceLabel": "$14M–28M",
    "priceVal": 20000000,
    "status": "Live"
  },
  {
    "id": "PAM-ML-0038",
    "name": "Sikasso Region Mn Block",
    "commodity": "Manganese",
    "family": "Ferrous metals",
    "country": "Mali",
    "region": "West Africa",
    "district": "Sikasso Region",
    "licence": "Prospecting permit",
    "area": 1146,
    "stage": "Pre-feasibility",
    "priceLabel": "$14M–28M",
    "priceVal": 20000000,
    "status": "Live"
  },
  {
    "id": "PAM-MZ-0039",
    "name": "Tete Province C Field",
    "commodity": "Coal",
    "family": "Energy minerals",
    "country": "Mozambique",
    "region": "East Africa",
    "district": "Tete Province",
    "licence": "Large-scale mining licence",
    "area": 1875,
    "stage": "Feasibility",
    "priceLabel": "$1.8M–3.5M",
    "priceVal": 2500000,
    "status": "Live"
  },
  {
    "id": "PAM-ML-0040",
    "name": "Kayes Region Mn Tenement",
    "commodity": "Manganese",
    "family": "Ferrous metals",
    "country": "Mali",
    "region": "West Africa",
    "district": "Kayes Region",
    "licence": "Exploration licence",
    "area": 342,
    "stage": "Care & maintenance",
    "priceLabel": "$28M+",
    "priceVal": 40000000,
    "status": "Live"
  },
  {
    "id": "PAM-EG-0041",
    "name": "Eastern Desert Pb Block",
    "commodity": "Lead",
    "family": "Base metals",
    "country": "Egypt",
    "region": "North Africa",
    "district": "Eastern Desert",
    "licence": "Prospecting permit",
    "area": 133,
    "stage": "Brownfield exploration",
    "priceLabel": "$3.5M–7M",
    "priceVal": 5200000,
    "status": "Live"
  },
  {
    "id": "PAM-TZ-0042",
    "name": "Chunya Au Block",
    "commodity": "Gold",
    "family": "Precious metals",
    "country": "Tanzania",
    "region": "East Africa",
    "district": "Chunya, Mbeya",
    "licence": "Exploration licence",
    "area": 418,
    "stage": "Construction",
    "priceLabel": "$0.9M–1.8M",
    "priceVal": 1300000,
    "status": "Live"
  },
  {
    "id": "PAM-ZW-0043",
    "name": "Matabeleland South P Project",
    "commodity": "Phosphate",
    "family": "Industrial minerals",
    "country": "Zimbabwe",
    "region": "Southern Africa",
    "district": "Matabeleland South",
    "licence": "Large-scale mining licence",
    "area": 415,
    "stage": "Greenfield exploration",
    "priceLabel": "$0.4M–0.9M",
    "priceVal": 650000,
    "status": "Live"
  },
  {
    "id": "PAM-ZW-0044",
    "name": "Midlands Province Cu Block",
    "commodity": "Copper",
    "family": "Base metals",
    "country": "Zimbabwe",
    "region": "Southern Africa",
    "district": "Midlands Province",
    "licence": "Artisanal mining permit",
    "area": 1239,
    "stage": "Care & maintenance",
    "priceLabel": "$28M+",
    "priceVal": 40000000,
    "status": "Under offer"
  }
];

async function seedSampleListings(client) {
  // Insert a fixed set of demo/sample assets exactly once.
  // A marker row in listing_counters prevents re-insertion on later restarts,
  // so demo assets you delete later will NOT come back.
  const marker = await client.query(
    "SELECT 1 FROM listing_counters WHERE country_code = '__demo_seeded__' LIMIT 1"
  );
  if (marker.rows.length) {
    logger.info('Demo assets already seeded — skipping.');
    return;
  }
  for (const l of DEMO_LISTINGS) {
    await client.query(
      `INSERT INTO listings
        (id, name, asset_type, commodity, family, country, region, district, licence,
         area_ha, stage, price_label, price_val, status, published_at)
       VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::listing_status,
               CASE WHEN $13::text IN ('Live','Under offer') THEN now() ELSE NULL END)
       ON CONFLICT (id) DO NOTHING`,
      [l.id, l.name, l.commodity, l.family, l.country, l.region, l.district, l.licence,
       l.area, l.stage, l.priceLabel, l.priceVal, l.status]
    );
  }
  // Advance per-country counters past the highest seeded sequence to avoid ID collisions.
  await client.query(`
    INSERT INTO listing_counters (country_code, seq)
    SELECT split_part(id, '-', 2) AS cc,
           max(split_part(id, '-', 3)::int) AS seq
      FROM listings
     WHERE id LIKE 'PAM-%'
     GROUP BY 1
    ON CONFLICT (country_code) DO UPDATE SET seq = GREATEST(listing_counters.seq, EXCLUDED.seq)
  `);
  // Set the marker so this block never runs again.
  await client.query(
    "INSERT INTO listing_counters (country_code, seq) VALUES ('__demo_seeded__', 1) ON CONFLICT (country_code) DO NOTHING"
  );
  logger.info(`Seeded ${DEMO_LISTINGS.length} demo assets.`);
}

export async function seed() {
  await migrate();
  await withTransaction(async (client) => {
    await seedReference(client);
    await seedOperator(client);
    await seedSampleListings(client); // demo assets baked in; runs once (marker-gated)
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
