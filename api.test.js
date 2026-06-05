/**
 * End-to-end API test suite.
 *
 * Exercises the public marketplace API, the seller submission + engagement
 * letter flow, email alerts, operator authentication, the full listing status
 * workflow (publish -> offer -> close) including the 10% matching fee, and the
 * buyer contact-request rules — all against a real PostgreSQL instance.
 *
 * Run with:  npm test
 */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareEnv, startServer } from './setup.js';

let baseUrl;
let teardown;
let token;
let newId;

// 1x1 transparent PNG used as a stand-in for the drawn engagement-letter signature.
const SIGNATURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function authHeaders() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

before(async () => {
  await prepareEnv();
  ({ baseUrl, teardown } = await startServer());
});

after(async () => {
  if (teardown) await teardown();
});

test('reference data is served for form dropdowns', async () => {
  const { status, body } = await api('/reference');
  assert.equal(status, 200);
  assert.equal(body.commodityFamilies.length, 6);
  assert.ok(body.countries.length >= 49, 'expected at least 49 countries');
});

test('public listings are paginated and hide non-public rows + seller email', async () => {
  const { status, body } = await api('/listings?limit=100');
  assert.equal(status, 200);
  assert.ok(body.total > 0);
  assert.ok(
    body.items.every((l) => ['Live', 'Under offer'].includes(l.status)),
    'only Live / Under offer rows should be public',
  );
  assert.ok(
    body.items.every((l) => l.contactEmail === undefined),
    'seller contact email must never be exposed publicly',
  );
});

test('public listings can be filtered by commodity', async () => {
  const { body } = await api('/listings?commodity=Copper');
  assert.ok(body.items.length > 0);
  assert.ok(body.items.every((l) => l.commodity === 'Copper'));
});

test('a single curated listing can be fetched by id', async () => {
  const { status, body } = await api('/listings/PAM-ZM-0001');
  assert.equal(status, 200);
  assert.equal(body.id, 'PAM-ZM-0001');
});

test('explore endpoint returns market aggregates', async () => {
  const { status, body } = await api('/explore');
  assert.equal(status, 200);
  assert.ok(body.total > 0);
  assert.ok(body.regionFamily, 'expected a region x family matrix');
});

test('submitting an asset with a signed engagement letter creates a Pending listing', async () => {
  const { status, body } = await api('/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetType: 'Exploration licence',
      commodity: 'Gold',
      country: 'Ghana',
      location: 'Ashanti Region',
      licence: 'Exploration licence (advanced)',
      area: '500–1,000 hectares',
      stage: 'Greenfield exploration',
      price: '$5M – $10M',
      email: 'seller@example.com',
      engagementLetter: { accepted: true, signature: SIGNATURE, termsVersion: '2026-05-19' },
    }),
  });
  assert.equal(status, 201);
  assert.equal(body.status, 'Pending review');
  assert.match(body.id, /^PAM-GH-\d{4}$/);
  newId = body.id;
});

test('a freshly submitted (Pending) listing is not publicly visible', async () => {
  const { status } = await api(`/listings/${newId}`);
  assert.equal(status, 404);
});

test('submission without a signed engagement letter is rejected', async () => {
  const { status } = await api('/listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetType: 'X',
      commodity: 'Gold',
      country: 'Ghana',
      location: 'Ashanti Region',
      licence: 'Mining lease',
    }),
  });
  assert.equal(status, 400);
});

test('an email alert can be created and returns an unsubscribe link', async () => {
  const { status, body } = await api('/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.com', commodity: 'Gold', country: 'Ghana' }),
  });
  assert.equal(status, 201);
  assert.ok(body.unsubscribeUrl.includes('/unsubscribe?token='));
});

test('operator can log in and receive a JWT', async () => {
  const { status, body } = await api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ops@test.local', password: 'opsPassw0rd!' }),
  });
  assert.equal(status, 200);
  assert.ok(body.token);
  token = body.token;
});

test('wrong password is rejected', async () => {
  const { status } = await api('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ops@test.local', password: 'wrong' }),
  });
  assert.equal(status, 401);
});

test('operator endpoints require authentication', async () => {
  const { status } = await api('/operator/stats');
  assert.equal(status, 401);
});

test('operator stats expose dashboard tiles', async () => {
  const { status, body } = await api('/operator/stats', { headers: authHeaders() });
  assert.equal(status, 200);
  assert.equal(typeof body.pending, 'number');
});

test('a new submission appears in the operator review queue', async () => {
  const { body } = await api('/operator/listings?status=Pending%20review', { headers: authHeaders() });
  assert.ok(body.items.some((l) => l.id === newId));
});

test('publish moves a listing Pending review -> Live and makes it public', async () => {
  const pub = await api(`/operator/listings/${newId}/publish`, { method: 'POST', headers: authHeaders() });
  assert.equal(pub.status, 200);
  assert.equal(pub.body.status, 'Live');

  const visible = await api(`/listings/${newId}`);
  assert.equal(visible.status, 200);
});

test('an invalid status transition is rejected (close from Live)', async () => {
  const { status } = await api(`/operator/listings/${newId}/close`, {
    method: 'POST',
    headers: authHeaders(),
    body: '{}',
  });
  assert.equal(status, 409);
});

test('offer then close charges a 10% matching fee', async () => {
  const offer = await api(`/operator/listings/${newId}/offer`, { method: 'POST', headers: authHeaders() });
  assert.equal(offer.body.status, 'Under offer');

  const close = await api(`/operator/listings/${newId}/close`, {
    method: 'POST',
    headers: authHeaders(),
    body: '{}',
  });
  assert.equal(close.body.status, 'Closed');
  // $5M–$10M band -> representative value 7,500,000 -> 10% fee = 750,000.
  assert.equal(close.body.feeInvoiced, 750000);
});

test('a buyer can request contact on a Live listing', async () => {
  const { status } = await api('/listings/PAM-ZM-0001/contact-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer2@example.com', message: 'Interested.' }),
  });
  assert.equal(status, 201);
});

test('contact requests are refused once a listing is Closed', async () => {
  const { status } = await api(`/listings/${newId}/contact-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'late@example.com' }),
  });
  assert.equal(status, 409);
});

test('operator listing detail includes contact requests', async () => {
  const { body } = await api('/operator/listings/PAM-ZM-0001', { headers: authHeaders() });
  assert.ok(Array.isArray(body.contactRequests));
  assert.ok(body.contactRequests.length >= 1);
});
