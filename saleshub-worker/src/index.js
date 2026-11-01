// SalesHub Worker API — D1-backed prospects API for Subur Maju Printing.
// Auth: every /api/* request must carry `Authorization: Bearer <SALESHUB_API_KEY>`
// (the secret set with `wrangler secret put SALESHUB_API_KEY`).
// No email is sent from here. Email sending is a separate, explicitly
// approved step in the frontend / Gmail flow, never automatic.
//
// Endpoints:
//   GET    /api/prospects            list prospects (optional ?stage=, ?limit=)
//   POST   /api/prospects            create a prospect
//   PATCH  /api/prospects/:id        update stage / score / follow_up_date / pic / email / notes
//   DELETE /api/prospects/:id        delete a prospect
//   GET    /api/health               no auth, returns { ok: true } only

const STAGES = [
  'New',
  'Qualified',
  'Draft ready',
  'Contacted',
  'Interested',
  'Negotiation',
  'Won',
  'Lost',
  'Opt-out',
];

const ALLOWED_FIELDS = [
  'company',
  'website',
  'jakarta_address',
  'city',
  'industry',
  'score',
  'stage',
  'pic_name',
  'pic_role',
  'email',
  'draft_email',
  'follow_up_date',
  'source_url',
  'notes',
  'area',
  'qty',
  'price',
  'po_value',
  'source',
  'verification_status',
  'verified_at',
  'reason',
  'sent_date',
  'last_narahubung',
  'company_source_url',
  'contact_source_url',
  'email_source_url',
];

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN || 'https://subur-maju-printing.vercel.app';
  const allowOrigin =
    origin === allowed || origin === 'http://localhost:3000' ? origin : allowed;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
  });
}

function isAuthorized(request, env) {
  if (!env.SALESHUB_API_KEY) return false;
  const header = request.headers.get('Authorization') || '';
  // Constant-time-ish compare for a short secret: compare lengths first,
  // then every character, so a wrong key is not rejected early on length
  // alone in a way that leaks the secret length through timing in logs.
  const expected = `Bearer ${env.SALESHUB_API_KEY}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function validateProspect(input, { partial = false } = {}) {
  const errors = [];
  if (!partial && (!input.company || typeof input.company !== 'string')) {
    errors.push('company is required');
  }
  if (input.stage !== undefined && !STAGES.includes(input.stage)) {
    errors.push(`stage must be one of: ${STAGES.join(', ')}`);
  }
  if (
    input.score !== undefined &&
    (!Number.isInteger(input.score) || input.score < 0 || input.score > 100)
  ) {
    errors.push('score must be an integer between 0 and 100');
  }
  for (const key of ['qty', 'price']) {
    if (input[key] !== undefined && input[key] !== null && (!Number.isInteger(input[key]) || input[key] < 0)) {
      errors.push(`${key} must be a non-negative integer`);
    }
  }
  if (input.po_value !== undefined && input.po_value !== null && typeof input.po_value !== 'number') {
    errors.push('po_value must be a number');
  }
  for (const key of ['website', 'jakarta_address', 'city', 'industry', 'pic_name', 'pic_role', 'email', 'draft_email', 'follow_up_date', 'source_url', 'notes', 'area', 'source', 'verification_status', 'verified_at', 'reason', 'sent_date', 'last_narahubung', 'company_source_url', 'contact_source_url', 'email_source_url']) {
    if (input[key] !== undefined && input[key] !== null && typeof input[key] !== 'string') {
      errors.push(`${key} must be a string`);
    }
  }
  return errors;
}

function rowToProspect(row) {
  return row;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (url.pathname === '/api/health') {
      return jsonResponse(request, env, { ok: true });
    }

    if (!url.pathname.startsWith('/api/prospects')) {
      return jsonResponse(request, env, { error: 'not_found' }, 404);
    }

    if (!isAuthorized(request, env)) {
      return jsonResponse(request, env, { error: 'unauthorized' }, 401);
    }

    const parts = url.pathname.split('/').filter(Boolean); // ['api','prospects', id?]
    const id = parts[2] || null;

    try {
      if (request.method === 'GET' && !id) {
        const stage = url.searchParams.get('stage');
        const limitRaw = parseInt(url.searchParams.get('limit') || '200', 10);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;
        let query = 'SELECT * FROM prospects';
        const params = [];
        if (stage) {
          if (!STAGES.includes(stage)) {
            return jsonResponse(request, env, { error: 'invalid_stage' }, 400);
          }
          query += ' WHERE stage = ?';
          params.push(stage);
        }
        query += ' ORDER BY score DESC, created_at DESC LIMIT ?';
        params.push(limit);
        const { results } = await env.DB.prepare(query).bind(...params).all();
        return jsonResponse(request, env, { prospects: results.map(rowToProspect) });
      }

      if (request.method === 'GET' && id) {
        const row = await env.DB.prepare('SELECT * FROM prospects WHERE id = ?')
          .bind(id)
          .first();
        if (!row) return jsonResponse(request, env, { error: 'not_found' }, 404);
        return jsonResponse(request, env, { prospect: rowToProspect(row) });
      }

      if (request.method === 'POST' && !id) {
        const input = await request.json().catch(() => null);
        if (!input || typeof input !== 'object') {
          return jsonResponse(request, env, { error: 'invalid_json' }, 400);
        }
        const errors = validateProspect(input);
        if (errors.length) {
          return jsonResponse(request, env, { error: 'validation', details: errors }, 400);
        }
        const newId =
          input.id && typeof input.id === 'string'
            ? input.id
            : `prospect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const values = {
          company: input.company,
          website: input.website || null,
          jakarta_address: input.jakarta_address || null,
          city: input.city || null,
          industry: input.industry || null,
          score: input.score ?? 0,
          stage: input.stage || 'New',
          pic_name: input.pic_name || null,
          pic_role: input.pic_role || null,
          email: input.email || null,
          draft_email: input.draft_email || null,
          follow_up_date: input.follow_up_date || null,
          source_url: input.source_url || null,
          notes: input.notes || null,
          area: input.area || null,
          qty: input.qty ?? 1000,
          price: input.price ?? 27500,
          po_value: input.po_value ?? null,
          source: input.source || null,
          verification_status: input.verification_status || null,
          verified_at: input.verified_at || null,
          reason: input.reason || null,
          sent_date: input.sent_date || null,
          last_narahubung: input.last_narahubung || null,
          company_source_url: input.company_source_url || null,
          contact_source_url: input.contact_source_url || null,
          email_source_url: input.email_source_url || null,
        };
        await env.DB.prepare(
          `INSERT INTO prospects
           (id, company, website, jakarta_address, city, industry, score, stage,
            pic_name, pic_role, email, draft_email, follow_up_date, source_url, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            newId,
            values.company,
            values.website,
            values.jakarta_address,
            values.city,
            values.industry,
            values.score,
            values.stage,
            values.pic_name,
            values.pic_role,
            values.email,
            values.draft_email,
            values.follow_up_date,
            values.source_url,
            values.notes,
            values.area,
            values.qty,
            values.price,
            values.po_value,
            values.source,
            values.verification_status,
            values.verified_at,
            values.reason,
            values.sent_date,
            values.last_narahubung,
            values.company_source_url,
            values.contact_source_url,
            values.email_source_url,
          )
          .run();
        const row = await env.DB.prepare('SELECT * FROM prospects WHERE id = ?')
          .bind(newId)
          .first();
        return jsonResponse(request, env, { prospect: rowToProspect(row) }, 201);
      }

      if (request.method === 'PATCH' && id) {
        const input = await request.json().catch(() => null);
        if (!input || typeof input !== 'object') {
          return jsonResponse(request, env, { error: 'invalid_json' }, 400);
        }
        const errors = validateProspect(input, { partial: true });
        if (errors.length) {
          return jsonResponse(request, env, { error: 'validation', details: errors }, 400);
        }
        const updates = {};
        for (const field of ALLOWED_FIELDS) {
          if (input[field] !== undefined) updates[field] = input[field];
        }
        if (Object.keys(updates).length === 0) {
          return jsonResponse(request, env, { error: 'no_fields_to_update' }, 400);
        }
        const setClause = Object.keys(updates)
          .map((field) => `${field} = ?`)
          .join(', ');
        const result = await env.DB.prepare(
          `UPDATE prospects SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
        )
          .bind(...Object.values(updates), id)
          .run();
        if (result.meta.changes === 0) {
          return jsonResponse(request, env, { error: 'not_found' }, 404);
        }
        const row = await env.DB.prepare('SELECT * FROM prospects WHERE id = ?')
          .bind(id)
          .first();
        return jsonResponse(request, env, { prospect: rowToProspect(row) });
      }

      if (request.method === 'DELETE' && id) {
        const result = await env.DB.prepare('DELETE FROM prospects WHERE id = ?')
          .bind(id)
          .run();
        if (result.meta.changes === 0) {
          return jsonResponse(request, env, { error: 'not_found' }, 404);
        }
        return jsonResponse(request, env, { deleted: true });
      }

      return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);
    } catch (err) {
      // Never leak DB internals to the client.
      return jsonResponse(request, env, { error: 'server_error' }, 500);
    }
  },
};
