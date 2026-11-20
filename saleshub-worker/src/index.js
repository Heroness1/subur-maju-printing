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



const ORDER_STATUSES = ['confirmed', 'in_production', 'completed', 'cancelled'];
function validateOrder(input) {
  const errors = [];
  if (!input.order_number || typeof input.order_number !== 'string') errors.push('order_number is required');
  if (!input.prospect_id || typeof input.prospect_id !== 'string') errors.push('prospect_id is required');
  if (typeof input.revenue !== 'number' || !Number.isFinite(input.revenue) || input.revenue < 0) errors.push('revenue must be a non-negative number');
  for (const key of ['cogs', 'shipping_cost', 'other_cost']) if (input[key] !== undefined && (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0)) errors.push(key + ' must be a non-negative number');
  if (input.status !== undefined && !ORDER_STATUSES.includes(input.status)) errors.push('invalid order status');
  for (const key of ['quotation_id','confirmed_at','source','medium','campaign','gclid','gbraid','wbraid','session_id','notes']) if (input[key] !== undefined && input[key] !== null && typeof input[key] !== 'string') errors.push(key + ' must be a string');
  return errors;
}

async function handleCampaignSpend(request, env, url) {
  try {
    if (request.method === 'GET') {
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      let query = 'SELECT * FROM campaign_spend WHERE 1=1'; const params = [];
      if (from && Number.isFinite(Date.parse(from))) { query += ' AND spend_date >= ?'; params.push(from.slice(0,10)); }
      if (to && Number.isFinite(Date.parse(to))) { query += ' AND spend_date <= ?'; params.push(to.slice(0,10)); }
      query += ' ORDER BY spend_date DESC, platform ASC, campaign ASC LIMIT 1000';
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return jsonResponse(request, env, { spends: results });
    }
    if (request.method === 'POST') {
      const input = await request.json().catch(() => null);
      if (!input || typeof input !== 'object' || Array.isArray(input)) return jsonResponse(request, env, { error: 'invalid_json' }, 400);
      const errors = [];
      const dateShape = typeof input.spend_date === 'string' && input.spend_date.length === 10 && input.spend_date[4] === '-' && input.spend_date[7] === '-';
      if (!dateShape || !Number.isFinite(Date.parse(input.spend_date))) errors.push('spend_date must use YYYY-MM-DD');
      if (!input.platform || typeof input.platform !== 'string') errors.push('platform is required');
      if (!input.campaign || typeof input.campaign !== 'string') errors.push('campaign is required');
      if (typeof input.spend !== 'number' || !Number.isFinite(input.spend) || input.spend < 0) errors.push('spend must be a non-negative number');
      for (const key of ['clicks','impressions']) if (input[key] !== undefined && (!Number.isInteger(input[key]) || input[key] < 0)) errors.push(key + ' must be a non-negative integer');
      if (input.notes !== undefined && input.notes !== null && typeof input.notes !== 'string') errors.push('notes must be a string');
      if (errors.length) return jsonResponse(request, env, { error: 'validation', details: errors }, 400);
      const id = 'spend-' + input.spend_date + '-' + Math.random().toString(36).slice(2,10);
      await env.DB.prepare(`INSERT INTO campaign_spend (id, spend_date, platform, campaign, spend, clicks, impressions, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(spend_date, platform, campaign) DO UPDATE SET
          spend = excluded.spend, clicks = excluded.clicks, impressions = excluded.impressions,
          notes = excluded.notes, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`)
        .bind(id, input.spend_date, safeText(input.platform,80), safeText(input.campaign,300), input.spend,
          input.clicks ?? 0, input.impressions ?? 0, safeText(input.notes,1000)).run();
      const row = await env.DB.prepare('SELECT * FROM campaign_spend WHERE spend_date = ? AND platform = ? AND campaign = ?')
        .bind(input.spend_date, safeText(input.platform,80), safeText(input.campaign,300)).first();
      return jsonResponse(request, env, { spend: row }, 201);
    }
    return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);
  } catch (err) { return jsonResponse(request, env, { error: 'server_error' }, 500); }
}

async function handleOrders(request, env, url) {
  try {
    if (request.method === 'GET') {
      const limitRaw = parseInt(url.searchParams.get('limit') || '200', 10);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 200;
      const from = url.searchParams.get('from'), to = url.searchParams.get('to'), status = url.searchParams.get('status');
      let query = 'SELECT * FROM sales_orders WHERE 1=1'; const params = [];
      if (from && Number.isFinite(Date.parse(from))) { query += ' AND confirmed_at >= ?'; params.push(from); }
      if (to && Number.isFinite(Date.parse(to))) { query += ' AND confirmed_at <= ?'; params.push(to); }
      if (status && ORDER_STATUSES.includes(status)) { query += ' AND status = ?'; params.push(status); }
      query += ' ORDER BY confirmed_at DESC LIMIT ?'; params.push(limit);
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return jsonResponse(request, env, { orders: results.map(row => ({...row, gross_profit: Number(row.revenue)-Number(row.cogs)-Number(row.shipping_cost)-Number(row.other_cost)})) });
    }
    if (request.method === 'POST') {
      const input = await request.json().catch(() => null);
      if (!input || typeof input !== 'object' || Array.isArray(input)) return jsonResponse(request, env, { error: 'invalid_json' }, 400);
      const errors = validateOrder(input); if (errors.length) return jsonResponse(request, env, { error: 'validation', details: errors }, 400);
      const prospect = await env.DB.prepare('SELECT id FROM prospects WHERE id = ?').bind(input.prospect_id).first();
      if (!prospect) return jsonResponse(request, env, { error: 'prospect_not_found' }, 404);
      if (input.quotation_id) {
        const quotation = await env.DB.prepare('SELECT id, prospect_id, status FROM quotations WHERE id = ?').bind(input.quotation_id).first();
        if (!quotation) return jsonResponse(request, env, { error: 'quotation_not_found' }, 404);
        if (quotation.prospect_id !== input.prospect_id) return jsonResponse(request, env, { error: 'quotation_prospect_mismatch' }, 400);
        if (quotation.status !== 'Accepted') return jsonResponse(request, env, { error: 'quotation_not_accepted' }, 409);
      }
      const duplicate = await env.DB.prepare('SELECT id FROM sales_orders WHERE order_number = ?').bind(input.order_number.trim()).first();
      if (duplicate) return jsonResponse(request, env, { error: 'duplicate_order_number' }, 409);
      const id = 'order-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const confirmedAt = input.confirmed_at && Number.isFinite(Date.parse(input.confirmed_at)) ? input.confirmed_at : new Date().toISOString();
      await env.DB.prepare(`INSERT INTO sales_orders
        (id, order_number, prospect_id, quotation_id, status, confirmed_at, revenue, cogs, shipping_cost, other_cost, source, medium, campaign, gclid, gbraid, wbraid, session_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, input.order_number.trim(), input.prospect_id, input.quotation_id || null, input.status || 'confirmed', confirmedAt,
          input.revenue, input.cogs ?? 0, input.shipping_cost ?? 0, input.other_cost ?? 0,
          safeText(input.source,200), safeText(input.medium,200), safeText(input.campaign,300), safeText(input.gclid,500),
          safeText(input.gbraid,500), safeText(input.wbraid,500), safeText(input.session_id,120), safeText(input.notes,2000)).run();
      await env.DB.prepare("UPDATE prospects SET stage = 'Won' WHERE id = ?").bind(input.prospect_id).run();
      const order = await env.DB.prepare('SELECT * FROM sales_orders WHERE id = ?').bind(id).first();
      return jsonResponse(request, env, { order: {...order, gross_profit: Number(order.revenue)-Number(order.cogs)-Number(order.shipping_cost)-Number(order.other_cost)} }, 201);
    }
    return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);
  } catch (err) { return jsonResponse(request, env, { error: 'server_error' }, 500); }
}


function productWithMetrics(row) {
  const unitCost = Number(row.material_cost || 0) + Number(row.print_cost || 0) +
    Number(row.finishing_cost || 0) + Number(row.labor_cost || 0) + Number(row.other_cost || 0);
  const sellingPrice = Number(row.selling_price || 0);
  const grossProfit = sellingPrice - unitCost;
  return { ...row, moq: Number(row.moq || 0), active: Number(row.active) === 1,
    unit_cost: unitCost, gross_profit: grossProfit,
    gross_margin_percent: sellingPrice > 0 ? grossProfit / sellingPrice * 100 : 0 };
}

function validateProduct(input, partial = false) {
  const errors = [];
  const textFields = ['sku','product_name','category','variant','unit','notes','image_url'];
  for (const key of textFields) {
    if (input[key] !== undefined && input[key] !== null && typeof input[key] !== 'string') errors.push(key + ' must be text');
  }
  if (!partial) {
    for (const key of ['sku','product_name','category']) if (!input[key] || typeof input[key] !== 'string') errors.push(key + ' is required');
  }
  for (const key of ['moq','material_cost','print_cost','finishing_cost','labor_cost','other_cost','selling_price']) {
    if (input[key] !== undefined && (!Number.isFinite(Number(input[key])) || Number(input[key]) < 0)) errors.push(key + ' must be a non-negative number');
  }
  if (input.moq !== undefined && !Number.isInteger(Number(input.moq))) errors.push('moq must be an integer');
  if (input.active !== undefined && ![true,false,0,1].includes(input.active)) errors.push('active must be boolean');
  return errors;
}

async function handlePublicProducts(request, env) {
  if (request.method !== 'GET') return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);
  try {
    const { results } = await env.DB.prepare(
      'SELECT sku, product_name, category, variant, unit, moq, selling_price, image_url, updated_at FROM product_master WHERE active = 1 AND selling_price > 0 ORDER BY category, product_name, variant'
    ).all();
    return jsonResponse(request, env, { products: results });
  } catch (err) {
    return jsonResponse(request, env, { error: 'server_error' }, 500);
  }
}

async function handleProductMaster(request, env, url) {
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[2] || null;
  const isHistory = parts[3] === 'history';
  try {
    if (request.method === 'GET' && !id) {
      const category = url.searchParams.get('category');
      const active = url.searchParams.get('active');
      let query = 'SELECT * FROM product_master';
      const clauses = [], params = [];
      if (category) { clauses.push('category = ?'); params.push(category); }
      if (active === 'true' || active === 'false') { clauses.push('active = ?'); params.push(active === 'true' ? 1 : 0); }
      if (clauses.length) query += ' WHERE ' + clauses.join(' AND ');
      query += ' ORDER BY category, product_name, variant';
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return jsonResponse(request, env, { products: results.map(productWithMetrics) });
    }
    if (request.method === 'GET' && id && isHistory) {
      const { results } = await env.DB.prepare('SELECT * FROM product_price_history WHERE product_id = ? ORDER BY changed_at DESC LIMIT 100').bind(id).all();
      return jsonResponse(request, env, { history: results });
    }
    if (request.method === 'POST' && !id) {
      const input = await request.json().catch(() => null);
      if (!input || typeof input !== 'object' || Array.isArray(input)) return jsonResponse(request, env, { error: 'invalid_json' }, 400);
      const errors = validateProduct(input);
      if (errors.length) return jsonResponse(request, env, { error: 'validation', details: errors }, 400);
      const duplicateSku = await env.DB.prepare('SELECT id FROM product_master WHERE sku = ?').bind(input.sku.trim()).first();
      if (duplicateSku) return jsonResponse(request, env, { error: 'duplicate_sku' }, 409);
      const idNew = 'product-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
      await env.DB.prepare(`INSERT INTO product_master
        (id,sku,product_name,category,variant,unit,moq,material_cost,print_cost,finishing_cost,labor_cost,other_cost,selling_price,active,notes,image_url)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
          idNew,input.sku.trim(),input.product_name.trim(),input.category.trim(),input.variant || null,
          input.unit || 'pcs',Number(input.moq ?? 1),Number(input.material_cost ?? 0),Number(input.print_cost ?? 0),
          Number(input.finishing_cost ?? 0),Number(input.labor_cost ?? 0),Number(input.other_cost ?? 0),
          Number(input.selling_price ?? 0),input.active === false ? 0 : 1,input.notes || null,input.image_url || null
        ).run();
      const row = await env.DB.prepare('SELECT * FROM product_master WHERE id = ?').bind(idNew).first();
      return jsonResponse(request, env, { product: productWithMetrics(row) }, 201);
    }
    if (request.method === 'PATCH' && id && !isHistory) {
      const input = await request.json().catch(() => null);
      if (!input || typeof input !== 'object' || Array.isArray(input)) return jsonResponse(request, env, { error: 'invalid_json' }, 400);
      const errors = validateProduct(input, true);
      if (errors.length) return jsonResponse(request, env, { error: 'validation', details: errors }, 400);
      const old = await env.DB.prepare('SELECT * FROM product_master WHERE id = ?').bind(id).first();
      if (!old) return jsonResponse(request, env, { error: 'not_found' }, 404);
      if (input.sku && input.sku.trim() !== old.sku) {
        const duplicateSku = await env.DB.prepare('SELECT id FROM product_master WHERE sku = ? AND id != ?').bind(input.sku.trim(), id).first();
        if (duplicateSku) return jsonResponse(request, env, { error: 'duplicate_sku' }, 409);
      }
      const fields = ['sku','product_name','category','variant','unit','moq','material_cost','print_cost','finishing_cost','labor_cost','other_cost','selling_price','active','notes','image_url'];
      const updates = {};
      for (const key of fields) if (input[key] !== undefined) updates[key] = key === 'active' ? (input[key] ? 1 : 0) : input[key];
      if (!Object.keys(updates).length) return jsonResponse(request, env, { error: 'no_fields_to_update' }, 400);
      const next = { ...old, ...updates };
      const oldCost = ['material_cost','print_cost','finishing_cost','labor_cost','other_cost'].reduce((sum,k)=>sum+Number(old[k]||0),0);
      const newCost = ['material_cost','print_cost','finishing_cost','labor_cost','other_cost'].reduce((sum,k)=>sum+Number(next[k]||0),0);
      if (Number(old.selling_price) !== Number(next.selling_price) || oldCost !== newCost) {
        await env.DB.prepare(`INSERT INTO product_price_history
          (id,product_id,old_selling_price,new_selling_price,old_unit_cost,new_unit_cost,note)
          VALUES (?,?,?,?,?,?,?)`).bind(
            'price-history-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
            id,Number(old.selling_price),Number(next.selling_price),oldCost,newCost,
            typeof input.price_change_note === 'string' ? input.price_change_note.slice(0,500) : null
          ).run();
      }
      const set = Object.keys(updates).map(k=>k+' = ?').join(', ');
      await env.DB.prepare('UPDATE product_master SET '+set+', updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?')
        .bind(...Object.values(updates),id).run();
      const row = await env.DB.prepare('SELECT * FROM product_master WHERE id = ?').bind(id).first();
      return jsonResponse(request, env, { product: productWithMetrics(row) });
    }
    if (request.method === 'DELETE' && id && !isHistory) {
      const result = await env.DB.prepare('UPDATE product_master SET active = 0, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?').bind(id).run();
      if (!result.meta.changes) return jsonResponse(request, env, { error: 'not_found' }, 404);
      return jsonResponse(request, env, { archived: true });
    }
    return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);
  } catch (err) {
    return jsonResponse(request, env, { error: 'server_error' }, 500);
  }
}

const FUNNEL_EVENTS = new Set([
  'whatsapp_click', 'category_selected', 'product_selected', 'add_to_cart',
  'begin_checkout', 'order_details_generated', 'order_request_prepared',
]);

function safeText(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) || null : null;
}

function matchesSecret(request, secretName, env) {
  const secret = env[secretName];
  if (!secret) return false;
  const header = request.headers.get('Authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (supplied.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= supplied.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

async function handleFunnelIntake(request, env) {
  if (request.method !== 'POST') return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);
  if (!matchesSecret(request, 'SALESHUB_INTAKE_API_KEY', env)) {
    return jsonResponse(request, env, { error: 'unauthorized' }, 401);
  }
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return jsonResponse(request, env, { error: 'invalid_json' }, 400);
  }
  if (!FUNNEL_EVENTS.has(input.event_name)) {
    return jsonResponse(request, env, { error: 'invalid_event_name' }, 400);
  }
  const eventId = safeText(input.event_id, 120);
  if (!eventId) return jsonResponse(request, env, { error: 'event_id_required' }, 400);
  const occurredAt = safeText(input.occurred_at, 40) || new Date().toISOString();
  if (!Number.isFinite(Date.parse(occurredAt))) {
    return jsonResponse(request, env, { error: 'invalid_occurred_at' }, 400);
  }
  const quantity = Number.isInteger(input.quantity) && input.quantity >= 0 ? input.quantity : null;
  const metadata = input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
    ? JSON.stringify(input.metadata).slice(0, 2000) : null;
  const visitor = input.visitor && typeof input.visitor === 'object' && !Array.isArray(input.visitor) ? input.visitor : {};
  const ipAddress = safeText(visitor.ip_address, 64);
  const country = safeText(visitor.country, 80);
  const city = safeText(visitor.city, 120);
  const region = safeText(visitor.region, 120);
  const timezone = safeText(visitor.timezone, 80);
  const userAgent = safeText(visitor.user_agent, 500);
  const ua = (userAgent || '').toLowerCase();
  const botMatch = ua.match(/googlebot|bingbot|yandexbot|baiduspider|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|crawler|spider|headlesschrome|phantomjs|selenium|playwright|puppeteer|curl\/|wget\/|python-requests|httpclient|go-http-client/);
  const botStatus = botMatch ? 'bot' : userAgent ? 'human_signal' : 'unknown';
  const botReason = botMatch ? 'User-agent cocok dengan pola crawler/automation: ' + botMatch[0]
    : userAgent ? 'Browser user-agent; belum ada sinyal bot eksplisit' : 'User-agent tidak tersedia';
  const deviceType = /mobile|android|iphone|ipod/i.test(userAgent || '') ? 'mobile'
    : /ipad|tablet/i.test(userAgent || '') ? 'tablet' : userAgent ? 'desktop' : 'unknown';
  const id = 'fe-' + eventId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
  try {
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO funnel_events
       (id,event_id,event_name,session_id,occurred_at,source,medium,campaign,content,term,
        gclid,gbraid,wbraid,landing_page,page_location,referrer,product,category,quantity,metadata_json,
        ip_address,country,city,region,timezone,user_agent,bot_status,bot_reason,device_type)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, eventId, input.event_name, safeText(input.session_id, 120), occurredAt,
      safeText(input.source, 200), safeText(input.medium, 200), safeText(input.campaign, 300),
      safeText(input.content, 300), safeText(input.term, 300), safeText(input.gclid, 500),
      safeText(input.gbraid, 500), safeText(input.wbraid, 500), safeText(input.landing_page, 1000),
      safeText(input.page_location, 1000), safeText(input.referrer, 1000),
      safeText(input.product, 300), safeText(input.category, 200), quantity, metadata,
      ipAddress, country, city, region, timezone, userAgent, botStatus, botReason, deviceType
    ).run();
    return jsonResponse(request, env, { accepted: true, duplicate: result.meta.changes === 0 }, result.meta.changes === 0 ? 200 : 201);
  } catch (err) {
    return jsonResponse(request, env, { error: 'server_error' }, 500);
  }
}

async function handleFunnelEvents(request, env, url) {
  if (request.method !== 'GET') return jsonResponse(request, env, { error: 'method_not_allowed' }, 405);
  const limitRaw = parseInt(url.searchParams.get('limit') || '500', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 500;
  const from = url.searchParams.get('from');
  let query = 'SELECT * FROM funnel_events';
  const params = [];
  if (from && Number.isFinite(Date.parse(from))) {
    query += ' WHERE occurred_at >= ?';
    params.push(from);
  }
  query += ' ORDER BY occurred_at DESC LIMIT ?';
  params.push(limit);
  try {
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return jsonResponse(request, env, { events: results });
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

    if (url.pathname === '/api/intake/funnel-events') {
      return handleFunnelIntake(request, env);
    }

    if (url.pathname === '/api/public/products') { return handlePublicProducts(request, env); }
    if (!url.pathname.startsWith('/api/prospects') && !url.pathname.startsWith('/api/quotations') && !url.pathname.startsWith('/api/funnel-events') && !url.pathname.startsWith('/api/product-master') && url.pathname !== '/api/orders' && url.pathname !== '/api/campaign-spend') {
      return jsonResponse(request, env, { error: 'not_found' }, 404);
    }

    if (!isAuthorized(request, env)) {
      return jsonResponse(request, env, { error: 'unauthorized' }, 401);
    }

    if (url.pathname === '/api/funnel-events') {
      return handleFunnelEvents(request, env, url);
    }

    if (url.pathname.startsWith('/api/product-master')) {
      return handleProductMaster(request, env, url);
    }

    if (url.pathname === '/api/orders') {
      return handleOrders(request, env, url);
    }

    if (url.pathname === '/api/campaign-spend') {
      return handleCampaignSpend(request, env, url);
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
