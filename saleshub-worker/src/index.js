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
//   DELETE /api/prospects/:id        delete a prospect (cascades to its quotations + items in one batch)
//   GET    /api/quotations           list quotations (optional ?prospect_id=, ?limit=)
//   GET    /api/quotations/:id       single quotation, with its items
//   POST   /api/quotations           create a quotation (prospect must exist)
//   PATCH  /api/quotations/:id       update header fields / replace items in one batch
//   DELETE /api/quotations/:id       delete header + items in one batch
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

const QUOTE_STATUSES = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'];
const QUOTE_FIELDS = [
  'prospect_id',
  'quote_number',
  'status',
  'product',
  'discount',
  'shipping',
  'tax_rate',
  'payment_terms',
  'production_lead_time',
  'delivery',
  'notes',
  'valid_until',
];

// Totals match the frontend: discount is capped at the subtotal, tax is a
// percentage applied to (subtotal - discount), shipping is added last.
// total = (subtotal - discount) + tax + shipping, where tax is computed on
// the discounted subtotal. All money values are REAL on the server.
function computeTotals(items, discount, taxRate, shipping) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unit_price || 0), 0);
  const cappedDiscount = Math.min(Number(discount || 0), subtotal);
  const taxable = subtotal - cappedDiscount;
  const tax = taxable * (Number(taxRate || 0) / 100);
  return { subtotal, total: taxable + tax + shipping };
}

function validateQuotationItems(items, { requireItems = true } = {}) {
  const errors = [];
  if (items === undefined) {
    if (requireItems) errors.push('items is required');
    return errors;
  }
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items must be a non-empty array');
    return errors;
  }
  for (const item of items) {
    if (!item || typeof item !== 'object') { errors.push('each item must be an object'); continue; }
    if (!item.description || typeof item.description !== 'string') errors.push('item description is required');
    if (item.qty === undefined || !Number.isInteger(item.qty) || item.qty < 0) errors.push('item qty must be a non-negative integer');
    if (item.unit_price === undefined || typeof item.unit_price !== 'number' || item.unit_price < 0) errors.push('item unit_price must be a non-negative number');
  }
  return errors;
}

function validateQuotation(input, { partial = false } = {}) {
  const errors = [];
  if (!partial) {
    if (!input.prospect_id || typeof input.prospect_id !== 'string') errors.push('prospect_id is required');
    if (!input.quote_number || typeof input.quote_number !== 'string') errors.push('quote_number is required');
  }
  if (input.status !== undefined && !QUOTE_STATUSES.includes(input.status)) {
    errors.push(`status must be one of: ${QUOTE_STATUSES.join(', ')}`);
  }
  for (const key of ['discount', 'shipping']) {
    if (input[key] !== undefined && input[key] !== null && (typeof input[key] !== 'number' || input[key] < 0)) {
      errors.push(`${key} must be a non-negative number`);
    }
  }
  if (input.tax_rate !== undefined && input.tax_rate !== null && (typeof input.tax_rate !== 'number' || input.tax_rate < 0 || input.tax_rate > 100)) {
    errors.push('tax_rate must be a number between 0 and 100');
  }
  for (const key of ['product', 'payment_terms', 'production_lead_time', 'delivery', 'notes', 'valid_until', 'prospect_id', 'quote_number']) {
    if (input[key] !== undefined && input[key] !== null && typeof input[key] !== 'string') {
      errors.push(`${key} must be a string`);
    }
  }
  return errors;
}

async function getQuotationWithItems(env, id) {
  const header = await env.DB.prepare('SELECT * FROM quotations WHERE id = ?').bind(id).first();
  if (!header) return null;
  const { results } = await env.DB.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY rowid').bind(id).all();
  return { ...header, items: results };
}

async function handleQuotations(request, env, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api','quotations', id?]
  const id = parts[2] || null;
  try {
    if (request.method === 'GET' && !id) {
      const prospectId = url.searchParams.get('prospect_id');
      const limitRaw = parseInt(url.searchParams.get('limit') || '200', 10);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;
      let query = 'SELECT * FROM quotations';
      const params = [];
      if (prospectId) { query += ' WHERE prospect_id = ?'; params.push(prospectId); }
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return jsonResponse(request, env, { quotations: results });
    }
    if (request.method === 'GET' && id) {
      const quotation = await getQuotationWithItems(env, id);
      if (!quotation) return jsonResponse(request, env, { error: 'not_found' }, 404);
      return jsonResponse(request, env, { quotation });
    }
    if (request.method === 'POST' && !id) {
      const input = await request.json().catch(() => null);
      if (!input || typeof input !== 'object') return jsonResponse(request, env, { error: 'invalid_json' }, 400);
      const errors = [...validateQuotation(input), ...validateQuotationItems(input.items)];
      if (errors.length) return jsonResponse(request, env, { error: 'validation', details: errors }, 400);
      const prospect = await env.DB.prepare('SELECT id FROM prospects WHERE id = ?').bind(input.prospect_id).first();
      if (!prospect) return jsonResponse(request, env, { error: 'prospect_not_found' }, 404);
      const duplicate = await env.DB.prepare('SELECT id FROM quotations WHERE quote_number = ?').bind(input.quote_number).first();
      if (duplicate) return jsonResponse(request, env, { error: 'duplicate_quote_number' }, 409);
      const newId = `quotation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { subtotal, total } = computeTotals(input.items, input.discount ?? 0, input.tax_rate ?? 0, input.shipping ?? 0);
      const values = {
        prospect_id: input.prospect_id,
        quote_number: input.quote_number,
        status: input.status || 'Draft',
        product: input.product || null,
        discount: input.discount ?? 0,
        shipping: input.shipping ?? 0,
        tax_rate: input.tax_rate ?? 0,
        subtotal,
        total,
        payment_terms: input.payment_terms || null,
        production_lead_time: input.production_lead_time || null,
        delivery: input.delivery || null,
        notes: input.notes || null,
        valid_until: input.valid_until || null,
      };
      // 15 columns / 15 placeholders / 15 binds. created_at/updated_at are
      // DB defaults, exactly like prospects, so they are not bound here.
      await env.DB.prepare(
        `INSERT INTO quotations
         (id, prospect_id, quote_number, status, product, discount, shipping,
          tax_rate, subtotal, total, payment_terms, production_lead_time,
          delivery, notes, valid_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        newId, values.prospect_id, values.quote_number, values.status, values.product,
        values.discount, values.shipping, values.tax_rate, values.subtotal, values.total,
        values.payment_terms, values.production_lead_time, values.delivery, values.notes,
        values.valid_until,
      ).run();
      for (const item of input.items) {
        // 6 columns / 6 placeholders / 6 binds per item.
        await env.DB.prepare(
          'INSERT INTO quotation_items (id, quotation_id, description, qty, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)',
        ).bind(
          `quotation-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          newId, item.description, item.qty, item.unit_price, Number(item.qty) * Number(item.unit_price),
        ).run();
      }
      const quotation = await getQuotationWithItems(env, newId);
      return jsonResponse(request, env, { quotation }, 201);
    }
    if (request.method === 'PATCH' && id) {
      const input = await request.json().catch(() => null);
      if (!input || typeof input !== 'object') return jsonResponse(request, env, { error: 'invalid_json' }, 400);
      const errors = [...validateQuotation(input, { partial: true }), ...validateQuotationItems(input.items, { requireItems: false })];
      if (errors.length) return jsonResponse(request, env, { error: 'validation', details: errors }, 400);
      const existing = await getQuotationWithItems(env, id);
      if (!existing) return jsonResponse(request, env, { error: 'not_found' }, 404);
      // quote_number is editable only while the quotation is still Draft.
      if (input.quote_number !== undefined && input.quote_number !== existing.quote_number && existing.status !== 'Draft') {
        return jsonResponse(request, env, { error: 'validation', details: ['quote_number cannot be edited after Draft'] }, 400);
      }
      if (input.quote_number !== undefined && input.quote_number !== existing.quote_number) {
        const duplicate = await env.DB.prepare('SELECT id FROM quotations WHERE quote_number = ? AND id != ?').bind(input.quote_number, id).first();
        if (duplicate) return jsonResponse(request, env, { error: 'duplicate_quote_number' }, 409);
      }
      if (input.prospect_id !== undefined && input.prospect_id !== existing.prospect_id) {
        const prospect = await env.DB.prepare('SELECT id FROM prospects WHERE id = ?').bind(input.prospect_id).first();
        if (!prospect) return jsonResponse(request, env, { error: 'prospect_not_found' }, 404);
      }
      const updates = {};
      for (const field of QUOTE_FIELDS) {
        if (input[field] !== undefined) updates[field] = input[field];
      }
      const items = input.items !== undefined ? input.items : existing.items;
      const discount = updates.discount !== undefined ? updates.discount : existing.discount;
      const taxRate = updates.tax_rate !== undefined ? updates.tax_rate : existing.tax_rate;
      const shipping = updates.shipping !== undefined ? updates.shipping : existing.shipping;
      const { subtotal, total } = computeTotals(items, discount, taxRate, shipping);
      updates.subtotal = subtotal;
      updates.total = total;
      const setClause = Object.keys(updates).map((field) => `${field} = ?`).join(', ');
      if (input.items !== undefined) {
        // One batch: delete old items + insert new items + update header.
        const statements = [env.DB.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').bind(id)];
        for (const item of items) {
          statements.push(env.DB.prepare(
            'INSERT INTO quotation_items (id, quotation_id, description, qty, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)',
          ).bind(
            `quotation-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            id, item.description, item.qty, item.unit_price, Number(item.qty) * Number(item.unit_price),
          ));
        }
        statements.push(env.DB.prepare(
          `UPDATE quotations SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
        ).bind(...Object.values(updates), id));
        await env.DB.batch(statements);
      } else {
        const result = await env.DB.prepare(
          `UPDATE quotations SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
        ).bind(...Object.values(updates), id).run();
        if (result.meta.changes === 0) return jsonResponse(request, env, { error: 'not_found' }, 404);
      }
      const quotation = await getQuotationWithItems(env, id);
      return jsonResponse(request, env, { quotation });
    }
    if (request.method === 'DELETE' && id) {
      // One batch: items first, then the header.
      const results = await env.DB.batch([
        env.DB.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').bind(id),
        env.DB.prepare('DELETE FROM quotations WHERE id = ?').bind(id),
      ]);
      if (!results[1] || results[1].meta.changes === 0) return jsonResponse(request, env, { error: 'not_found' }, 404);
      return jsonResponse(request, env, { deleted: true });
    }
    return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);
  } catch (err) {
    return jsonResponse(request, env, { error: 'server_error' }, 500);
  }
}

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

    if (!url.pathname.startsWith('/api/prospects') && !url.pathname.startsWith('/api/quotations')) {
      return jsonResponse(request, env, { error: 'not_found' }, 404);
    }

    if (!isAuthorized(request, env)) {
      return jsonResponse(request, env, { error: 'unauthorized' }, 401);
    }

    if (url.pathname.startsWith('/api/quotations')) {
      return handleQuotations(request, env, url);
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
            pic_name, pic_role, email, draft_email, follow_up_date, source_url, notes,
            area, qty, price, po_value, source, verification_status, verified_at,
            reason, sent_date, last_narahubung, company_source_url,
            contact_source_url, email_source_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                   ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        // One batch: the prospect's quotation items, then its quotations,
        // then the prospect itself, so no orphan quotations remain.
        const results = await env.DB.batch([
          env.DB.prepare('DELETE FROM quotation_items WHERE quotation_id IN (SELECT id FROM quotations WHERE prospect_id = ?)').bind(id),
          env.DB.prepare('DELETE FROM quotations WHERE prospect_id = ?').bind(id),
          env.DB.prepare('DELETE FROM prospects WHERE id = ?').bind(id),
        ]);
        if (!results[2] || results[2].meta.changes === 0) {
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
