# SalesHub Worker API (Cloudflare D1)

Backend storage for Subur Maju Printing SalesHub. The Vercel frontend
cannot bind D1 directly, so this Worker is the API layer in front of D1.

## API surface

- `GET /api/health` — no auth, health response.
- `GET/POST /api/prospects` — list/create prospects (Bearer `SALESHUB_API_KEY`).
- `GET/PATCH/DELETE /api/prospects/:id` — prospect CRUD.
- `GET/POST /api/quotations` — list/create quotations.
- `GET/PATCH/DELETE /api/quotations/:id` — quotation CRUD.
- `POST /api/intake/funnel-events` — server-to-server interaction-event intake (Bearer `SALESHUB_INTAKE_API_KEY`).
- `POST /api/intake/page-view` — public, origin-allowlisted first-party page-view intake (no browser secret).
- `GET /api/funnel-events?from=&limit=` — interaction-event reporting (Bearer `SALESHUB_API_KEY`).
- `GET /api/visitor-analytics?from=&to=` — aggregated visitor analytics (Bearer `SALESHUB_API_KEY`).

Funnel events are behavioral telemetry, not sales leads. In particular,
`whatsapp_click` is a click/open intent and does not prove a WhatsApp
conversation occurred. Only create or qualify a sales lead after the actual
customer conversation is confirmed.

## Database setup / migration

For a fresh database, configure the D1 `database_id` in `wrangler.toml`
and execute `schema.sql`.

For an existing database, back it up first and run only the unapplied
migration. Funnel event storage is migration 003:

```bash
npx wrangler d1 export saleshub-db --remote --output backup-before-funnel.sql
npx wrangler d1 execute saleshub-db --remote --file=./migrations/003_funnel_events.sql
npx wrangler d1 execute saleshub-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='funnel_events';"
```

Do not re-run migrations 001 or 002 if they are already applied. The
migration 003 statement is additive and does not alter existing prospects
or quotations.

Visitor analytics uses migration 008. Back up D1 first, then apply it once:

```bash
npx wrangler d1 export saleshub-db --remote --output backup-before-visitor-analytics.sql
npx wrangler d1 execute saleshub-db --remote --file=./migrations/008_visitor_page_views.sql
npx wrangler d1 execute saleshub-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='visitor_page_views';"
```

Do not re-run migration 008 if it is already recorded in `schema_migrations`.
The visitor table is separate from `funnel_events`; page views never create
prospects or sales leads. It stores random visitor/session IDs, page paths,
UTM attribution, coarse Cloudflare location, device class, and bot status.
It does not store raw IP addresses, full user-agent strings, names, or emails.

## Secrets and deployment

Set two separate Worker secrets. Never commit either value:

```bash
npx wrangler secret put SALESHUB_API_KEY
npx wrangler secret put SALESHUB_INTAKE_API_KEY
npx wrangler deploy
```

`SALESHUB_API_KEY` is for the SalesHub admin proxy. The separate
`SALESHUB_INTAKE_API_KEY` is used only by the SalesHub server-side intake
proxy. The marketing website must never receive either Worker secret.

## Vercel environment variables

On the SalesHub Vercel project, configure:

- `NEXT_PUBLIC_SALESHUB_API_URL` — deployed Worker URL.
- `SALESHUB_API_KEY` — same value as the Worker admin secret.
- `SALESHUB_INTAKE_API_KEY` — same value as the Worker intake secret.
- `SITE_FUNNEL_SHARED_SECRET` — a separate long random secret shared only with the marketing website's server-side proxy.

On the marketing website's Vercel project, configure:

- `SALESHUB_FUNNEL_INGEST_URL` — SalesHub Vercel URL plus `/api/intake/funnel-events`.
- `SALESHUB_FUNNEL_INGEST_KEY` — same value as `SITE_FUNNEL_SHARED_SECRET`.

After environment changes, redeploy both Vercel projects. The website-side
server proxy still needs to be added/configured in the marketing website
repository; do not send a secret from browser JavaScript.

## Frontend persistence

The SalesHub dashboard uses the Next.js API proxy to sync prospect and
quotation data to D1, with localStorage as a cache/fallback. The Website
Funnel view reads event data from the authenticated `/api/funnel-events`
proxy. It does not turn website events into prospect records.


### Funnel dashboard read access

Set `SALESHUB_FUNNEL_READ_KEY` as a strong random secret in the SalesHub Vercel project. The Website funnel screen asks an authorized operator for this key and stores it only in the current browser session. The `/api/funnel-events` reporting proxy rejects requests without the key. Do not reuse the website intake secret or the Cloudflare Worker API key.
