# SalesHub Worker API (Cloudflare D1)

Backend storage for Subur Maju Printing SalesHub. The Vercel frontend
cannot bind D1 directly, so this Worker is the API layer in front of D1.

**What this build is:** Worker + D1 schema + prospects API only.
**What it is NOT yet:** the Vercel frontend is NOT rewired to this API
(it still uses browser localStorage), no data has been imported, and
no email is sent from here. Those are separate, explicitly approved steps.

## Deploy (needs a Cloudflare account; no token goes in chat)

```bash
cd saleshub-worker
npx wrangler login
npx wrangler d1 create saleshub-db
# Copy the database_id it prints into wrangler.toml, then:
npx wrangler d1 execute saleshub-db --remote --file=./schema.sql
npx wrangler secret put SALESHUB_API_KEY
# Type a long random key when prompted. Keep it private.
npx wrangler deploy
# Note the *.workers.dev URL it prints.
npx wrangler dev   # local dev, with --local for a local D1 copy
```

## Test it

```bash
curl https://saleshub-api.<your-subdomain>.workers.dev/api/health
# {"ok":true}

curl -H "Authorization: Bearer <SALESHUB_API_KEY>" \
  https://saleshub-api.<your-subdomain>.workers.dev/api/prospects
# {"prospects":[]}
```

## Next steps (separate approvals)

1. In Vercel, set `NEXT_PUBLIC_SALESHUB_API_URL` to the Worker URL
   and `SALESHUB_API_KEY` (server-side only, never `NEXT_PUBLIC_` for
   the key) — then rewire `app/sales-hub/page.jsx` from localStorage
   to this API. That change touches the live dashboard, so it needs
   its own review before deploy.
2. Import the 20 already-researched leads (Batch 1 + Pilot) as the
   first seed data, with Ace Hardware flagged Manual Review Required
   (stale Kawan Lama identity — see research notes).
3. Email sending stays separate: a draft is never sent without Angga
   approving the recipient list and the email content first.

## API summary

- `GET /api/health` — no auth, `{ ok: true }`
- `GET /api/prospects?stage=&limit=` — Bearer auth, list by score desc
- `POST /api/prospects` — Bearer auth, `company` required, `stage`
  must be New / Qualified / Draft ready / Contacted / Interested /
  Negotiation / Won, `score` 0–100
- `PATCH /api/prospects/:id` — Bearer auth, partial update
- `DELETE /api/prospects/:id` — Bearer auth
