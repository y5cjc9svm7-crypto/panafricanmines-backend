# Integrating the existing site with the backend

This guide explains how to connect the current single-page `PanAfricanMines.html`
to the new backend. The site already has a clean central state object (`S`) and a
single `render()` loop, so the integration is mostly: **replace the in-memory data
mutations with API calls, then `render()`**.

You do not need to rewrite the UI. The HTML/CSS, the `render()` machinery, i18n,
and the legal pages all stay exactly as they are.

---

## 1. Include the API client

Add the client **before** the page's own `<script>` block:

```html
<script src="panafricanmines-api.js"></script>
<script>
  // If the API is served from the same origin under /api/v1, this line is optional.
  PamAPI.configure({ baseUrl: 'https://api.panafricanmines.com/api/v1' });
</script>
```

CORS: set the backend's `CORS_ORIGIN` to the exact origin that serves the HTML
(e.g. `https://panafricanmines.com`).

---

## 2. Load reference data + listings instead of `buildDataset()`

Today `S.listings` is filled synchronously by `buildDataset()`. Replace that with
data fetched from the API at start-up.

**Before**

```js
const S = {
  // ...
  listings: buildDataset(),
  // ...
};
// ...
render();
```

**After**

```js
const S = {
  // ...
  listings: [],          // start empty; filled from the API
  reference: null,       // optional: dropdown data from the backend
  loading: true,
  // ...
};

async function boot() {
  try {
    const [ref, page] = await Promise.all([
      PamAPI.getReference(),
      PamAPI.listListings({ limit: 100 }),
    ]);
    S.reference = ref;
    S.listings = page.items;
  } catch (err) {
    console.error('Failed to load data', err);
  } finally {
    S.loading = false;
    render();
  }
}

boot();   // replaces the bare render() at the bottom of the file
```

You can keep `buildDataset()` in the file as a fallback for offline demos, but it
is no longer the source of truth.

> The API field names already match what the UI reads (`id, name, country, region,
> district, commodity, family, licence, area, stage, priceLabel, priceVal,
> status`). Public responses additionally include `assetType`, `createdAt` and
> `publishedAt`, which the UI can ignore. The seller `contactEmail` and
> `feeInvoiced` are intentionally **not** present in public responses.

### Optional: drive the dropdowns from the backend

The hard-coded arrays (`COMMODITY_FAMILIES`, `COUNTRIES_FORM`, `DISTRICTS_FORM`,
`LICENCES_FORM`, `STAGES_FORM`, `AREAS_FORM`, `PRICES_FORM`) can stay as-is, or you
can populate them from `S.reference` so they're editable in the database without a
redeploy. This is optional and can be done later.

---

## 3. Searching / filtering (`S.lf`)

Filtering is currently done client-side in `publicListings()` / `filterOpts()`.
You have two options:

- **Keep client-side filtering** — simplest. Load up to `limit: 100` once (as in
  `boot()` above) and let the existing code filter `S.listings` in the browser.
- **Server-side filtering** — recommended once volume grows. On filter change, call
  the API and replace `S.listings`:

```js
async function applyFilters() {
  const page = await PamAPI.listListings({
    q: S.lf.q,
    commodity: S.lf.commodity,   // 'All' is dropped automatically by the client
    country: S.lf.country,
    licence: S.lf.licence,
    limit: 100,
  });
  S.listings = page.items;
  render();
}
```

Then call `applyFilters()` from the existing `input`/`change` handlers that set
`S.lf.*` (debounce the free-text `q` field if you like).

---

## 4. Opening a listing detail

The detail click handler looks the row up in `S.listings`. For public listings
that's fine as-is. If you want always-fresh data (or deep links), fetch on demand:

```js
// inside the [data-open] handler
const id = openEl.getAttribute('data-open');
PamAPI.getListing(id)
  .then(l => { S.current = l; S.page = 'detail'; S.detailReq = false; render(); })
  .catch(() => { /* show a "not found / no longer available" message */ });
```

---

## 5. "Sell an asset" submission (`submit-add`)

This is the most important change. **Stop pushing a fake row into `S.listings`** and
instead POST the form plus the signed engagement letter. The signature is already
captured as a PNG data URL in `S.sigData`.

**Before**

```js
if (act === 'submit-add') {
  const f = S.form;
  const newL = { id: 'PAM-' + f.country.slice(0,2).toUpperCase() + '-' + ..., ... , status: 'Pending review' };
  S.listings.unshift(newL);
  S.addDone = true; render(); return;
}
```

**After**

```js
if (act === 'submit-add') {
  const f = S.form;

  // Require the signed engagement letter, exactly as the UI already implies.
  if (!S.signed || !S.sigData) { alert(t('add_need_sign')); return; }

  PamAPI.createListing({
    assetType: f.assetType,
    commodity: f.commodity,
    country: f.country,
    location: f.location,     // district
    licence: f.licence,
    area: f.area,
    stage: f.stage,
    price: f.price,
    email: f.email,
    engagementLetter: {
      accepted: true,
      signature: S.sigData,             // PNG data URL from the canvas
      termsVersion: '2026-05-19',
    },
  })
  .then(() => {
    S.addDone = true;
    // reset the form + signature state
    S.form = { assetType:'', commodity:'', country:'', location:'', licence:'', area:'', stage:'', price:'', email:'' };
    S.signed = false; S.sigData = null;
    render();
  })
  .catch(err => { alert(err.message || 'Submission failed'); });
  return;
}
```

Key behavioural notes:

- The backend generates the real ID (`PAM-<CC>-####`, per-country sequence) — do
  **not** build the ID in the browser any more.
- The new listing is created as **`Pending review`** and is **not** publicly
  visible until an operator publishes it. That's why you should not unshift it into
  the public `S.listings`; it would otherwise appear immediately.
- Submitting without a signature returns `400`; the guard above prevents that.

---

## 6. Buyer "Request contact" (`req-contact`)

Currently this just flips `S.detailReq = true` to show a confirmation. Send it to
the backend so the operations team is notified:

```js
if (act === 'req-contact') {
  PamAPI.requestContact(S.current.id, {
    email: /* value from your contact field, if you add one */ '',
    message: '',
  })
  .then(() => { S.detailReq = true; render(); })
  .catch(err => { alert(err.message || 'Could not send request'); });
  return;
}
```

(If you add an email/message input to the detail page, pass those values through.)
Contact requests are only accepted while a listing is `Live` or `Under offer`; a
closed listing returns `409`.

---

## 7. Email alerts (`alert-create`, `alert-delete`, alerts list)

**Create** — replace the local `S.alerts.push(...)`:

```js
if (act === 'alert-create') {
  const af = S.alertForm;
  if (!af.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(af.email)) { alert(t('al_email_invalid')); return; }

  PamAPI.createAlert({
    email: af.email,
    commodity: af.commodity,
    country: af.country,
    licence: af.licence,
  })
  .then(() => {
    S.alertDonePayload = { ...af };
    S.alertDone = true;
    S.alertForm = { commodity:'', country:'', licence:'', email:'' };
    return PamAPI.listAlerts(af.email);   // refresh the "active alerts" list
  })
  .then(res => { S.alerts = res.alerts; render(); })
  .catch(err => { alert(err.message || 'Could not create alert'); });
  return;
}
```

**List** — the current UI keeps `S.alerts` purely in memory. To show a returning
visitor their alerts, load them by email (e.g. when they type their address, or via
the unsubscribe link). Each alert from the API includes a `token`.

**Delete** — the existing button uses an array index. Switch it to the alert's
`token` (render `data-token="<token>"` on the button) and call:

```js
if (act === 'alert-delete') {
  const tok = actEl.getAttribute('data-token');
  PamAPI.deleteAlert(tok)
    .then(() => PamAPI.listAlerts(S.alertDonePayload ? S.alertDonePayload.email : ''))
    .then(res => { S.alerts = res.alerts || []; render(); })
    .catch(err => { alert(err.message || 'Could not delete alert'); });
  return;
}
```

Matching alerts are emailed automatically by the backend when a listing goes
`Live`, with a one-click unsubscribe link — no front-end work needed for delivery.

---

## 8. Operator back-office (`operator()` page + `data-op` actions)

The back-office now requires authentication. Add a small login step and load real
data instead of reading from `S.listings`.

**Login** (add a simple email/password form on the operator page):

```js
PamAPI.login(email, password)
  .then(() => loadOperator())
  .catch(() => alert('Invalid login'));
```

**Load the queue + stats** (replace the parts of `operator()` that compute from
`S.listings`):

```js
async function loadOperator() {
  const [stats, queue] = await Promise.all([
    PamAPI.operatorStats(),
    PamAPI.operatorListings({ status: S.opTab }),  // 'Pending review', 'Live', ...
  ]);
  S.opStats = stats;
  S.opListings = queue.items;
  render();
}
```

Render the operator table from `S.opListings` (operator responses include
`contactEmail` and `feeInvoiced`). When the tab changes (`data-tab`), call
`loadOperator()` again.

**Status actions** — replace the direct mutations:

**Before**

```js
if (op === 'publish') l.status = 'Live';
else if (op === 'decline') l.status = 'Declined';
else if (op === 'offer') l.status = 'Under offer';
else if (op === 'close') { l.status = 'Closed'; l.feeInvoiced = Math.round(l.priceVal * 0.10); }
render();
```

**After**

```js
let p;
if (op === 'publish') p = PamAPI.publish(id);
else if (op === 'decline') p = PamAPI.decline(id);   // optionally pass a reason string
else if (op === 'offer')   p = PamAPI.offer(id);
else if (op === 'close')   p = PamAPI.close(id);      // fee is computed server-side

p.then(() => loadOperator())
 .catch(err => alert(err.message || 'Action failed'));   // e.g. 409 on an invalid transition
```

Notes:

- The **10% matching fee is computed by the backend** on close — remove the
  client-side `priceVal * 0.10` calculation.
- The backend enforces the legal transitions (`Pending review → Live → Under offer
  → Closed`, plus `Declined`). An illegal action returns `409`; surface it to the
  operator.
- `PamAPI.operatorListing(id)` returns full detail including the engagement letter
  (with the stored signature image) and the buyer contact requests, for a review
  screen.

---

## 9. Market explorer (`explore()`)

The heatmap aggregates can be computed in the browser from the loaded listings, or
fetched ready-made:

```js
PamAPI.getExplore().then(data => { S.explore = data; render(); });
// data.regionFamily  -> region x commodity-family counts
// data.regionCountry -> region x country counts
// data.total         -> total public listings
```

---

## 10. Error handling & auth expiry

Every client method rejects with an `Error` carrying `.status` and `.body`. A
couple of patterns worth adding:

- On any operator call that returns `401`, call `PamAPI.logout()` and show the
  login form again (the token has expired — default lifetime is 12h).
- Show `err.message` from `400`/`409` responses directly; the backend returns
  human-readable validation and transition messages.

---

## Mapping summary

| UI action (existing) | Replace with |
|---|---|
| `buildDataset()` at start | `PamAPI.getReference()` + `PamAPI.listListings()` in a `boot()` |
| filter change (`S.lf.*`) | client-side filter, or `PamAPI.listListings(filters)` |
| open detail (`data-open`) | optional `PamAPI.getListing(id)` |
| `submit-add` | `PamAPI.createListing({ ..., engagementLetter })` |
| `req-contact` | `PamAPI.requestContact(id, {...})` |
| `alert-create` | `PamAPI.createAlert({...})` |
| `alert-delete` | `PamAPI.deleteAlert(token)` |
| operator login (new) | `PamAPI.login(email, password)` |
| operator page data | `PamAPI.operatorStats()` + `PamAPI.operatorListings({status})` |
| `op==='publish'` | `PamAPI.publish(id)` |
| `op==='decline'` | `PamAPI.decline(id, reason)` |
| `op==='offer'` | `PamAPI.offer(id)` |
| `op==='close'` | `PamAPI.close(id)` (fee server-side) |
| explore heatmap | `PamAPI.getExplore()` |

Once these calls are in place the site is fully backed by the database, multi-user,
and operator-controlled — with no change to the look and feel.
