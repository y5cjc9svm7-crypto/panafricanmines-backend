// Currency helpers. Monetary values are stored as whole USD integers.

export function formatUSD(n) {
  if (n == null) return '';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'k';
  return '$' + n;
}

// Matching fee charged to the seller on a completed transaction.
export function matchingFee(priceVal, rate) {
  return Math.round(Number(priceVal || 0) * Number(rate));
}

// Representative USD value for each price band (used as the fee basis when a
// listing is created from a banded form selection). null = "Open to offers".
export const PRICE_BAND_VALUE = {
  'Under $0.5M': 400000,
  '$0.5M – $1M': 750000,
  '$1M – $2.5M': 1750000,
  '$2.5M – $5M': 3750000,
  '$5M – $10M': 7500000,
  '$10M – $25M': 17500000,
  '$25M – $50M': 37500000,
  '$50M – $100M': 75000000,
  '$100M – $250M': 175000000,
  'Over $250M': 300000000,
  'Open to offers': null,
};

export function priceBandToValue(label) {
  if (!label) return null;
  if (Object.prototype.hasOwnProperty.call(PRICE_BAND_VALUE, label)) return PRICE_BAND_VALUE[label];
  return null;
}

// Parse a free-text area band like "1,000–2,500 hectares" to a representative integer.
export function parseAreaHa(label) {
  if (!label) return null;
  const nums = String(label).replace(/,/g, '').match(/\d+/g);
  if (!nums) return null;
  if (nums.length === 1) return parseInt(nums[0], 10);
  const a = parseInt(nums[0], 10);
  const b = parseInt(nums[1], 10);
  return Math.round((a + b) / 2);
}
