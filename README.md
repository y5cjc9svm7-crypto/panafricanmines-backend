# PanAfricanMines — Backend API

Production backend for the **PanAfricanMines** marketplace (operated by *StraMin Africa Zambia Limited*),
a platform that matches sellers and buyers of mining licences and assets across Africa.

This service replaces the in-browser synthetic dataset used by the current single-page site
(`buildDataset()` in the HTML) with a real, persistent, multi-user backend: a PostgreSQL database,
a JSON HTTP API, operator authentication, an automated email-alert engine, and the 10% matching-fee
workflow.

It is framework-light and dependency-light on purpose so the in-house team can own and maintain it:
plain **Node.js + Express + raw SQL** (no ORM, no build step).

---

## What the backend does

- **Public marketplace** — searchable, paginated, filterable listings. Only `Live` and `Under offer`
  listings are ever exposed publicly, and the seller's contact email is never returned to buyers.
- **"Sell an asset" submissions** — gated behind a signed **Engagement Letter** (the canvas signature
  is stored as a PNG). New submissions land as `Pending review`.
- **Buyer "Request contact"** — captured against a listing and emailed to the operations team.
- **Email alerts** — buyers subscribe by commodity / country / licence; when a matching listing goes
  `Live` the backend emails them automatically (with a one-click unsubscribe link), de-duplicated so a
  subscriber is never notified twice for the same listing.
- **Operator back-office** — JWT-authenticated endpoints for the review queue and the status workflow
  `Pending review → Live → Under offer → Closed` (plus `Declined`). Closing a deal automatically
  invoices the **10% matching fee**.
- **Market explorer** — region × commodity-family and region × country aggregates for the heatmap.
- **Reference data** — all the dropdown data (commodity families, 49 countries, districts, licences,
  stages, areas, price bands) lives in the database and is editable without a redeploy.
- Every state change is written to an **audit log**.

---

## Requirements

- **Node.js 20+** (developed and tested on Node 22)
- **PostgreSQL 14+** (tested against PostgreSQL 18)

---

## Quick start (local)

```bash
cp .env.example .env          # then edit DATABASE_URL, JWT_SECRET, SMTP_*, etc.
npm install
npm run migrate               # create the schema
npm run seed                  # reference data + bootstrap operator (+ optional sample listings)
npm run dev                   # http://localhost:8080
```

Health check:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/v1/reference | head
```

### Create / reset an operator login

The seed step creates one bootstrap operator from `SEED_OPERATOR_*`. To add more (or rotate a
password):

```bash
npm run create-operator -- ops2@stramin.africa 'a-strong-password' "Jane Operator" admin
```

---

## Run with Docker

The repository ships a `Dockerfile` and a `docker-compose.yml` that brings up the API together with
PostgreSQL:

```bash
cp .env.example .env          # set JWT_SECRET and a real SEED_OPERATOR_PASSWORD at minimum
docker compose up --build
```

On first boot the container runs migrations automatically (`RUN_MIGRATIONS_ON_BOOT=true`) and seeds
reference data + the bootstrap operator. The API is then available on `http://localhost:8080`.

---

## Configuration

All configuration is via environment variables (see `.env.example` for the full list). The most
important ones:

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **required** |
| `PGSSLMODE` | `require` to enable TLS to the DB | use `require` for most managed Postgres |
| `JWT_SECRET` | Signs operator session tokens | **required in production** — the app refuses to start with the default |
| `CORS_ORIGIN` | Comma-separated allowed origins | set to your site origin(s), e.g. `https://panafricanmines.com` |
| `PORT` | HTTP port | default `8080` |
| `SEED_OPERATOR_EMAIL` / `SEED_OPERATOR_PASSWORD` | Bootstrap operator credentials | change the password after first login |
| `SEED_SAMPLE_LISTINGS` | Load the demo dataset (4 curated + 40 generated) | leave `false` in production |
| `MATCHING_FEE_RATE` | Matching fee rate | default `0.10` (10%) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | Outbound email | if `SMTP_HOST` is empty, emails are logged instead of sent (safe for dev) |
| `MAIL_FROM` | From address for outbound email | |
| `OPS_NOTIFY_EMAIL` | Where new-submission / contact-request notifications go | |
| `PUBLIC_SITE_URL` | Used to build unsubscribe links | e.g. `https://panafricanmines.com` |
| `RUN_MIGRATIONS_ON_BOOT` | Run migrations on server start | default `true` |

> **Email in development:** with no `SMTP_HOST`, nodemailer uses a JSON transport that writes the
> message to the logs instead of sending. Configure real SMTP credentials before going live.

---

## NPM scripts

| Script | What it does |
|---|---|
| `npm start` | Start the API (production) |
| `npm run dev` | Start with file-watch reload |
| `npm run migrate` | Apply pending SQL migrations |
| `npm run seed` | Seed reference data, bootstrap operator, optional samples |
| `npm run create-operator -- <email> <password> [name] [role]` | Create/update an operator |
| `npm test` | Run the end-to-end test suite |

---

## Tests

```bash
npm test
```

The suite (`test/api.test.js`) is a full black-box run against the real HTTP app and a **real
PostgreSQL database**. By default it boots a throwaway in-process PostgreSQL via `embedded-postgres`,
so it needs no external services. To run it against your own database instead:

```bash
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/pam_test npm test
```

It covers reference data, public search + filtering, listing privacy, the signed-submission flow,
alerts, operator auth, the full publish → offer → close workflow (asserting the 10% fee), invalid
transitions, and the buyer contact-request rules.

---

## API overview

All endpoints are under `/api/v1`. See [`openapi.yaml`](./openapi.yaml) for the full machine-readable
specification, and [`INTEGRATION.md`](./INTEGRATION.md) for wiring the existing front-end to it.

**Public**

| Method | Path | Description |
|---|---|---|
| `GET` | `/reference` | All dropdown / filter reference data |
| `GET` | `/listings` | Search public listings (`q, commodity, country, licence, status, page, limit`) |
| `GET` | `/listings/:id` | One public listing |
| `POST` | `/listings` | Submit an asset (requires signed engagement letter) |
| `POST` | `/listings/:id/contact-requests` | Buyer "request contact" |
| `GET` | `/explore` | Market aggregates for the heatmap |
| `POST` | `/alerts` | Create an email alert |
| `GET` | `/alerts?email=` | List a subscriber's alerts |
| `GET` | `/alerts/unsubscribe?token=` | One-click unsubscribe |
| `DELETE` | `/alerts/:token` | Delete an alert |

**Operator** (require `Authorization: Bearer <token>`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Operator login → JWT |
| `GET` | `/auth/me` | Current operator |
| `GET` | `/operator/stats` | Dashboard tiles |
| `GET` | `/operator/listings` | Review queue (filter by `status`) |
| `GET` | `/operator/listings/:id` | Full detail (+ engagement letter, contact requests) |
| `POST` | `/operator/listings/:id/publish` | `Pending review → Live` |
| `POST` | `/operator/listings/:id/decline` | `Pending review → Declined` |
| `POST` | `/operator/listings/:id/offer` | `Live → Under offer` |
| `POST` | `/operator/listings/:id/close` | `Under offer → Closed` (invoices fee) |
| `GET` | `/operator/contact-requests` | All buyer contact requests |

**Ops**

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Liveness |
| `GET` | `/readyz` | Readiness (checks DB) |

---

## Project layout

```
src/
  app.js              Express app (helmet, cors, rate-limit, routes, error handling)
  server.js           Boot: migrate-on-start, listen, graceful shutdown
  config.js           Env-driven configuration
  db/
    pool.js           pg pool + query/withTransaction helpers
    migrate.js        SQL migration runner (tracks schema_migrations)
    seed.js           Reference + operator + sample seeding
    seedData.js       Curated reference data and sample listings
    migrations/       001_init.sql, 002_reference.sql
  lib/                logger, money/fee math, id generation, mailer
  middleware/         auth (JWT), validation (zod), rate limit, errors
  validators/         zod request schemas
  services/           business logic (listings, alerts, contact, stats, operators, reference)
  routes/             HTTP route definitions
scripts/
  create-operator.js  Operator CLI
test/
  api.test.js         End-to-end test suite
  setup.js            Test DB bootstrap
public-integration/
  panafricanmines-api.js   Drop-in browser API client for the existing site
```

---

## Deployment notes

- Put the service behind a TLS-terminating reverse proxy / load balancer. The app sets
  `trust proxy`, so `X-Forwarded-*` headers are honoured for client IPs and rate limiting.
- Set a strong `JWT_SECRET` and a real `SEED_OPERATOR_PASSWORD`; rotate the bootstrap operator
  password immediately after first login.
- Point `CORS_ORIGIN` at the exact site origin(s) — avoid `*` in production.
- Use a managed PostgreSQL with automated backups; set `PGSSLMODE=require`.
- `GET /healthz` (liveness) and `GET /readyz` (readiness, checks the DB) are provided for your
  orchestrator's probes.
