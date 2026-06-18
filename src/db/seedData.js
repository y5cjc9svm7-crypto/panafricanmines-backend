// ============================================================
// Reference + sample data, ported from the original front-end.
// Edit here (or directly in the DB) to change dropdowns/filters.
// ============================================================

export const COMM_CODE = {
  Copper: 'Cu', Cobalt: 'Co', Zinc: 'Zn', Nickel: 'Ni', Lead: 'Pb', Tin: 'Sn',
  Aluminium: 'Al', Gold: 'Au', Silver: 'Ag', Platinum: 'Pt', Palladium: 'Pd',
  Rhodium: 'Rh', Iridium: 'Ir', 'Iron ore': 'Fe', Manganese: 'Mn', Chromium: 'Cr',
  Vanadium: 'V', Tungsten: 'W', Molybdenum: 'Mo', Coal: 'C', Uranium: 'U',
  Lithium: 'Li', Graphite: 'Gr', Thorium: 'Th', Diamond: 'Dia', Emerald: 'Em',
  Sapphire: 'Sa', Ruby: 'Ru', Tanzanite: 'Tz', Tourmaline: 'To', Aquamarine: 'Aq',
  Amethyst: 'Am', Garnet: 'Gt', Topaz: 'Tp', Phosphate: 'P', Fluorspar: 'F',
  'Rare earths': 'REE', Bauxite: 'Bx', Limestone: 'Ls', Gypsum: 'Gy', Kaolin: 'Ka',
  Talc: 'Tc', Mica: 'Mi', 'Silica sand': 'Si', 'Titanium / Ilmenite': 'Ti',
  Zirconium: 'Zr', Barite: 'Ba', Vermiculite: 'Vm', 'Soda ash': 'Na', Potash: 'K',
};

export const COMMODITY_FAMILIES = [
  { g: 'Base metals', items: ['Copper', 'Cobalt', 'Zinc', 'Nickel', 'Lead', 'Tin', 'Aluminium'] },
  { g: 'Precious metals', items: ['Gold', 'Silver', 'Platinum', 'Palladium', 'Rhodium', 'Iridium'] },
  { g: 'Ferrous metals', items: ['Iron ore', 'Manganese', 'Chromium', 'Vanadium', 'Tungsten', 'Molybdenum'] },
  { g: 'Energy minerals', items: ['Coal', 'Uranium', 'Lithium', 'Graphite', 'Thorium'] },
  { g: 'Gemstones', items: ['Diamond', 'Emerald', 'Sapphire', 'Ruby', 'Tanzanite', 'Tourmaline', 'Aquamarine', 'Amethyst', 'Garnet', 'Topaz'] },
  { g: 'Industrial minerals', items: ['Phosphate', 'Fluorspar', 'Rare earths', 'Bauxite', 'Limestone', 'Gypsum', 'Kaolin', 'Talc', 'Mica', 'Silica sand', 'Titanium / Ilmenite', 'Zirconium', 'Barite', 'Vermiculite', 'Soda ash', 'Potash'] },
];

// name -> { region, cc } for every country offered in the form.
export const COUNTRY_META = {
  Algeria: { region: 'North Africa', cc: 'DZ', iso: 'DZA' },
  Angola: { region: 'Southern Africa', cc: 'AO', iso: 'AGO' },
  Benin: { region: 'West Africa', cc: 'BJ', iso: 'BEN' },
  Botswana: { region: 'Southern Africa', cc: 'BW', iso: 'BWA' },
  'Burkina Faso': { region: 'West Africa', cc: 'BF', iso: 'BFA' },
  Burundi: { region: 'East Africa', cc: 'BI', iso: 'BDI' },
  Cameroon: { region: 'Central Africa', cc: 'CM', iso: 'CMR' },
  'Central African Republic': { region: 'Central Africa', cc: 'CF', iso: 'CAF' },
  Chad: { region: 'Central Africa', cc: 'TD', iso: 'TCD' },
  "Côte d'Ivoire": { region: 'West Africa', cc: 'CI', iso: 'CIV' },
  'Democratic Republic of Congo': { region: 'Central Africa', cc: 'CD', iso: 'COD' },
  'Republic of Congo': { region: 'Central Africa', cc: 'CG', iso: 'COG' },
  Egypt: { region: 'North Africa', cc: 'EG', iso: 'EGY' },
  'Equatorial Guinea': { region: 'Central Africa', cc: 'GQ', iso: 'GNQ' },
  Eritrea: { region: 'East Africa', cc: 'ER', iso: 'ERI' },
  Eswatini: { region: 'Southern Africa', cc: 'SZ', iso: 'SWZ' },
  Ethiopia: { region: 'East Africa', cc: 'ET', iso: 'ETH' },
  Gabon: { region: 'Central Africa', cc: 'GA', iso: 'GAB' },
  Gambia: { region: 'West Africa', cc: 'GM', iso: 'GMB' },
  Ghana: { region: 'West Africa', cc: 'GH', iso: 'GHA' },
  Guinea: { region: 'West Africa', cc: 'GN', iso: 'GIN' },
  'Guinea-Bissau': { region: 'West Africa', cc: 'GW', iso: 'GNB' },
  Kenya: { region: 'East Africa', cc: 'KE', iso: 'KEN' },
  Lesotho: { region: 'Southern Africa', cc: 'LS', iso: 'LSO' },
  Liberia: { region: 'West Africa', cc: 'LR', iso: 'LBR' },
  Libya: { region: 'North Africa', cc: 'LY', iso: 'LBY' },
  Madagascar: { region: 'East Africa', cc: 'MG', iso: 'MDG' },
  Malawi: { region: 'Southern Africa', cc: 'MW', iso: 'MWI' },
  Mali: { region: 'West Africa', cc: 'ML', iso: 'MLI' },
  Mauritania: { region: 'West Africa', cc: 'MR', iso: 'MRT' },
  Mauritius: { region: 'East Africa', cc: 'MU', iso: 'MUS' },
  Morocco: { region: 'North Africa', cc: 'MA', iso: 'MAR' },
  Mozambique: { region: 'Southern Africa', cc: 'MZ', iso: 'MOZ' },
  Namibia: { region: 'Southern Africa', cc: 'NA', iso: 'NAM' },
  Niger: { region: 'West Africa', cc: 'NE', iso: 'NER' },
  Nigeria: { region: 'West Africa', cc: 'NG', iso: 'NGA' },
  Rwanda: { region: 'East Africa', cc: 'RW', iso: 'RWA' },
  Senegal: { region: 'West Africa', cc: 'SN', iso: 'SEN' },
  'Sierra Leone': { region: 'West Africa', cc: 'SL', iso: 'SLE' },
  Somalia: { region: 'East Africa', cc: 'SO', iso: 'SOM' },
  'South Africa': { region: 'Southern Africa', cc: 'ZA', iso: 'ZAF' },
  'South Sudan': { region: 'East Africa', cc: 'SS', iso: 'SSD' },
  Sudan: { region: 'North Africa', cc: 'SD', iso: 'SDN' },
  Tanzania: { region: 'East Africa', cc: 'TZ', iso: 'TZA' },
  Togo: { region: 'West Africa', cc: 'TG', iso: 'TGO' },
  Tunisia: { region: 'North Africa', cc: 'TN', iso: 'TUN' },
  Uganda: { region: 'East Africa', cc: 'UG', iso: 'UGA' },
  Zambia: { region: 'Southern Africa', cc: 'ZM', iso: 'ZMB' },
  Zimbabwe: { region: 'Southern Africa', cc: 'ZW', iso: 'ZWE' },
};

export const COUNTRIES_FORM = Object.keys(COUNTRY_META);

export const DISTRICTS_FORM = {
  Algeria: ['Adrar Province', 'Tamanrasset Province', 'Béchar Province', 'Tindouf Province', 'Annaba Province', 'Other / specify in contact'],
  Angola: ['Lunda Norte Province', 'Lunda Sul Province', 'Huambo Province', 'Cuanza Sul Province', 'Other / specify in contact'],
  Botswana: ['Ghanzi District', 'Kgalagadi District', 'Central District', 'North-East District', 'Other / specify in contact'],
  'Burkina Faso': ['Centre-Nord Region', 'Sahel Region', 'Sud-Ouest Region', 'Hauts-Bassins Region', 'Other / specify in contact'],
  Cameroon: ['East Region', 'South Region', 'Adamawa Region', 'Other / specify in contact'],
  Chad: ['Tibesti Region', 'Borkou Region', 'Ennedi Region', 'Other / specify in contact'],
  "Côte d'Ivoire": ['Bafing District', 'Tonkpi District', 'Worodougou District', 'Other / specify in contact'],
  'Democratic Republic of Congo': ['Lualaba Province', 'Haut-Katanga', 'Sud-Kivu', 'Tshopo Province', 'Ituri Province', 'Other / specify in contact'],
  Egypt: ['Eastern Desert', 'Sinai Peninsula', 'Western Desert', 'Aswan Governorate', 'Other / specify in contact'],
  Eritrea: ['Northern Red Sea Region', 'Anseba Region', 'Other / specify in contact'],
  Ethiopia: ['Tigray Region', 'Oromia Region', 'Afar Region', 'Somali Region', 'Other / specify in contact'],
  Gabon: ['Haut-Ogooué Province', 'Ogooué-Lolo Province', 'Other / specify in contact'],
  Ghana: ['Ashanti Region', 'Western Region', 'Eastern Region', 'Central Region', 'Other / specify in contact'],
  Guinea: ['Boké Region', 'Kankan Region', 'Faranah Region', 'Other / specify in contact'],
  Kenya: ['Taita-Taveta County', 'Migori County', 'Kakamega County', 'Turkana County', 'Other / specify in contact'],
  Lesotho: ['Mokhotlong District', 'Maseru District', 'Other / specify in contact'],
  Liberia: ['Nimba County', 'Bong County', 'Grand Bassa County', 'Other / specify in contact'],
  Libya: ['Murzuq District', 'Sebha District', 'Other / specify in contact'],
  Madagascar: ['Atsimo-Andrefana', 'Ihorombe Region', 'Boeny Region', 'Other / specify in contact'],
  Malawi: ['Mzimba District', 'Lilongwe District', 'Other / specify in contact'],
  Mali: ['Kayes Region', 'Sikasso Region', 'Koulikoro Region', 'Other / specify in contact'],
  Mauritania: ['Tiris Zemmour Region', 'Adrar Region', 'Inchiri Region', 'Other / specify in contact'],
  Morocco: ['Drâa-Tafilalet Region', 'Oriental Region', 'Souss-Massa', 'Other / specify in contact'],
  Mozambique: ['Tete Province', 'Nampula Province', 'Manica Province', 'Cabo Delgado', 'Other / specify in contact'],
  Namibia: ['Erongo Region', 'Karas Region', 'Kunene Region', 'Otjozondjupa Region', 'Other / specify in contact'],
  Niger: ['Agadez Region', 'Tahoua Region', 'Other / specify in contact'],
  Nigeria: ['Plateau State', 'Nasarawa State', 'Kogi State', 'Bauchi State', 'Other / specify in contact'],
  Rwanda: ['Western Province', 'Southern Province', 'Other / specify in contact'],
  Senegal: ['Kédougou Region', 'Tambacounda Region', 'Other / specify in contact'],
  'Sierra Leone': ['Kono District', 'Tonkolili District', 'Bo District', 'Other / specify in contact'],
  'South Africa': ['Limpopo, Bushveld', 'Mpumalanga', 'Northern Cape', 'North West Province', 'Free State', 'Gauteng', 'Other / specify in contact'],
  Sudan: ['River Nile State', 'Red Sea State', 'Other / specify in contact'],
  Tanzania: ['Geita Region', 'Mwanza, Lake Zone', 'Kahama District', 'Chunya, Mbeya', 'Mara Region', 'Other / specify in contact'],
  Togo: ['Plateaux Region', 'Centrale Region', 'Other / specify in contact'],
  Tunisia: ['Gafsa Governorate', 'Kasserine Governorate', 'Other / specify in contact'],
  Uganda: ['Karamoja sub-region', 'Rwenzori sub-region', 'Other / specify in contact'],
  Zambia: ['Solwezi District, NW Province', 'Chingola, Copperbelt', 'Mumbwa, Central Province', 'Lufwanyama, Copperbelt', 'Serenje, Central Province', 'Mkushi, Central Province', 'Kabwe District', 'Mpika District', 'Other / specify in contact'],
  Zimbabwe: ['Midlands Province', 'Mashonaland West', 'Matabeleland South', 'Mashonaland Central', 'Other / specify in contact'],
};

export const ASSET_TYPES = [
  'Operating mine', 'Care & maintenance mine', 'Mining licence (large-scale)', 'Mining licence (small-scale)',
  'Exploration licence', 'Prospecting permit', 'Artisanal mining permit', 'Mineral concession',
  'Tailings retreatment project', 'Beneficiation plant', 'Brownfield project', 'Greenfield project',
  'Mining right', 'Joint-venture interest', 'Royalty interest',
];

export const LICENCES_FORM = [
  'Large-scale mining licence', 'Small-scale mining licence', 'Artisanal mining permit',
  'Exploration licence (preliminary)', 'Exploration licence (advanced)', 'Prospecting permit',
  'Mineral concession', 'Mining lease', 'Mineral title', 'Industrial minerals permit',
  'Quarrying licence', 'Reconnaissance permit', 'Special mining licence', 'Salt extraction licence',
];

export const STAGES_FORM = [
  'Reconnaissance', 'Greenfield exploration', 'Brownfield exploration', 'Resource definition',
  'Pre-feasibility study (PFS)', 'Feasibility study (BFS)', 'Definitive feasibility', 'Permitting',
  'Financing', 'Construction', 'Commissioning', 'Operating mine', 'Steady-state production',
  'Expansion', 'Care & maintenance', 'Closure planning', 'Closed / post-closure',
  'Tailings retreatment', 'Joint venture available', 'Royalty available', 'Available for option',
  'Available for sale', 'Other / specify in contact',
];

export const AREAS_FORM = [
  '< 50 hectares', '50–200 hectares', '200–500 hectares', '500–1,000 hectares',
  '1,000–2,500 hectares', '2,500–5,000 hectares', '5,000–10,000 hectares',
  '10,000–25,000 hectares', '25,000–100,000 hectares', '> 100,000 hectares',
];

export const PRICES_FORM = [
  'Under $0.5M', '$0.5M – $1M', '$1M – $2.5M', '$2.5M – $5M', '$5M – $10M',
  '$10M – $25M', '$25M – $50M', '$50M – $100M', '$100M – $250M', 'Over $250M', 'Open to offers',
];

// ── Deterministic sample dataset (mirrors the original buildDataset) ──
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAMILIES = ['Base metals', 'Precious metals', 'Ferrous metals', 'Energy minerals', 'Gemstones', 'Industrial minerals'];
const FAMILY_COMMS = {
  'Base metals': ['Copper', 'Cobalt', 'Zinc', 'Nickel', 'Lead', 'Tin'],
  'Precious metals': ['Gold', 'Silver', 'Platinum', 'Palladium'],
  'Ferrous metals': ['Iron ore', 'Manganese', 'Chromium', 'Vanadium'],
  'Energy minerals': ['Coal', 'Uranium', 'Lithium', 'Graphite'],
  Gemstones: ['Diamond', 'Emerald', 'Sapphire', 'Ruby', 'Tanzanite', 'Tourmaline'],
  'Industrial minerals': ['Phosphate', 'Fluorspar', 'Bauxite', 'Limestone', 'Soda ash'],
};
const SAMPLE_COUNTRIES = [
  { name: 'Zambia', region: 'Southern Africa', cc: 'ZM', iso: 'ZMB', districts: DISTRICTS_FORM.Zambia.slice(0, 6) },
  { name: 'Tanzania', region: 'East Africa', cc: 'TZ', iso: 'TZA', districts: ['Geita Region', 'Mwanza, Lake Zone', 'Kahama District', 'Chunya, Mbeya'] },
  { name: 'Mozambique', region: 'Southern Africa', cc: 'MZ', iso: 'MOZ', districts: ['Tete Province', 'Nampula Province', 'Manica Province'] },
  { name: 'Madagascar', region: 'East Africa', cc: 'MG', iso: 'MDG', districts: ['Atsimo-Andrefana', 'Ihorombe Region'] },
  { name: 'South Africa', region: 'Southern Africa', cc: 'ZA', iso: 'ZAF', districts: ['Limpopo, Bushveld', 'Mpumalanga', 'Northern Cape', 'North West Province'] },
  { name: 'Botswana', region: 'Southern Africa', cc: 'BW', iso: 'BWA', districts: ['Ghanzi District', 'Kgalagadi District', 'Central District'] },
  { name: 'Namibia', region: 'Southern Africa', cc: 'NA', iso: 'NAM', districts: ['Erongo Region', 'Karas Region', 'Kunene Region'] },
  { name: 'Zimbabwe', region: 'Southern Africa', cc: 'ZW', iso: 'ZWE', districts: ['Midlands Province', 'Mashonaland West', 'Matabeleland South'] },
  { name: 'DRC', region: 'Central Africa', cc: 'CD', iso: 'COD', districts: ['Lualaba Province', 'Haut-Katanga', 'Sud-Kivu'] },
  { name: 'Ghana', region: 'West Africa', cc: 'GH', iso: 'GHA', districts: ['Ashanti Region', 'Western Region', 'Eastern Region'] },
  { name: 'Burkina Faso', region: 'West Africa', cc: 'BF', iso: 'BFA', districts: ['Centre-Nord Region', 'Sahel Region', 'Sud-Ouest Region'] },
  { name: 'Mali', region: 'West Africa', cc: 'ML', iso: 'MLI', districts: ['Kayes Region', 'Sikasso Region'] },
  { name: 'Egypt', region: 'North Africa', cc: 'EG', iso: 'EGY', districts: ['Eastern Desert', 'Sinai Peninsula'] },
];
const LICENCES_T = ['Large-scale mining licence', 'Small-scale mining licence', 'Exploration licence', 'Prospecting permit', 'Artisanal mining permit'];
const STAGES = ['Greenfield exploration', 'Brownfield exploration', 'Resource definition', 'Pre-feasibility', 'Feasibility', 'Construction', 'Operating mine', 'Care & maintenance'];
const TYPE_WORDS = ['Concession', 'Block', 'Project', 'Tenement', 'Field', 'Site'];
const AREA_RANGE = [[40, 180], [150, 420], [300, 820], [600, 1400], [1100, 2200], [1900, 3500]];
const PRICE_TIERS = [['$0.4M–0.9M', 650000], ['$0.9M–1.8M', 1300000], ['$1.8M–3.5M', 2500000], ['$3.5M–7M', 5200000], ['$7M–14M', 10000000], ['$14M–28M', 20000000], ['$28M+', 40000000]];

export function buildSampleListings() {
  const r = mulberry32(20260519);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const items = [];
  items.push({ id: 'PAM-ZM-0001', name: 'Solwezi NW Cu Block', country: 'Zambia', region: 'Southern Africa', district: 'Solwezi District, NW Province', commodity: 'Copper', family: 'Base metals', licence: 'Large-scale mining licence', area: 1240, stage: 'Resource definition', priceLabel: '$7M–14M', priceVal: 10000000, status: 'Live' });
  items.push({ id: 'PAM-ZM-0002', name: 'Chingola Copperbelt Concession', country: 'Zambia', region: 'Southern Africa', district: 'Chingola, Copperbelt', commodity: 'Copper', family: 'Base metals', licence: 'Exploration licence', area: 680, stage: 'Brownfield exploration', priceLabel: '$1.8M–3.5M', priceVal: 2500000, status: 'Live' });
  items.push({ id: 'PAM-ZM-0003', name: 'Mumbwa Cu-Co Tenement', country: 'Zambia', region: 'Southern Africa', district: 'Mumbwa, Central Province', commodity: 'Cobalt', family: 'Base metals', licence: 'Exploration licence', area: 920, stage: 'Greenfield exploration', priceLabel: '$0.9M–1.8M', priceVal: 1300000, status: 'Live' });
  items.push({ id: 'PAM-ZM-0004', name: 'Lufwanyama Cu Block', country: 'Zambia', region: 'Southern Africa', district: 'Lufwanyama, Copperbelt', commodity: 'Copper', family: 'Base metals', licence: 'Large-scale mining licence', area: 1810, stage: 'Pre-feasibility', priceLabel: '$14M–28M', priceVal: 20000000, status: 'Live' });
  for (let i = 0; i < 40; i++) {
    const c = pick(SAMPLE_COUNTRIES);
    const family = pick(FAMILIES);
    const commodity = pick(FAMILY_COMMS[family]);
    const district = pick(c.districts);
    const lic = pick(LICENCES_T);
    const stage = pick(STAGES);
    const tw = pick(TYPE_WORDS);
    const ar = pick(AREA_RANGE);
    const area = Math.floor(ar[0] + r() * (ar[1] - ar[0]));
    const pt = pick(PRICE_TIERS);
    const code = COMM_CODE[commodity] || commodity.slice(0, 2);
    const name = district.split(',')[0] + ' ' + code + ' ' + tw;
    const sr = r();
    const status = sr < 0.09 ? 'Pending review' : sr < 0.17 ? 'Under offer' : 'Live';
    items.push({ id: 'PAM-' + c.cc + '-' + String(i + 5).padStart(4, '0'), name, country: c.name, region: c.region, district, commodity, family, licence: lic, area, stage, priceLabel: pt[0], priceVal: pt[1], status });
  }
  return items;
}
