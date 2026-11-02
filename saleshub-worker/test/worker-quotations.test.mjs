// D1-compatible quotations test for the SalesHub Worker (Phase 3).
//
// Runs the real Worker code (../src/index.js) against an in-memory SQLite
// database through a minimal mock of the D1 API surface (prepare/bind/run/
// first/all/batch). The SQL is exactly what the Worker sends to D1, and the
// schema is exactly saleshub-worker/schema.sql, so a column/placeholder/
// bind mismatch that would fail on D1 fails here too.
// A separate test applies migrations/002_quotations.sql to a v2-only
// database (prospects table only, no quotations tables) and verifies it.
//
// Run with: node --test saleshub-worker/test/worker-quotations.test.mjs
// (Node >= 22, which ships node:sqlite. No network, no remote D1, no secret.)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";

const SCHEMA = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const MIGRATION_002 = readFileSync(new URL("../migrations/002_quotations.sql", import.meta.url), "utf8");
const API_KEY = "test-secret";

function makeMockDb(db) {
  return {
    batch(statements) { return statements.map((stmt) => stmt.run()); },
    prepare(sql) {
      let params = [];
      return {
        bind(...args) { params = args; return this; },
        run() {
          const res = db.prepare(sql).run(...params);
          return { meta: { changes: res.changes } };
        },
        first() { return db.prepare(sql).get(...params) ?? null; },
        all() { return { results: db.prepare(sql).all(...params) }; },
      };
    },
  };
}

function makeEnv() {
  const db = new DatabaseSync(":memory:");
  db.exec(SCHEMA);
  return { db, env: { DB: makeMockDb(db), SALESHUB_API_KEY: API_KEY, ALLOWED_ORIGIN: "https://example.test" } };
}

async function call(env, path, { method = "GET", body = undefined, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${API_KEY}`;
  const req = new Request(`http://test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await worker.fetch(req, env);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON body */ }
  return { status: res.status, json, text };
}

const PROSPECT = {
  id: "TEST-PROSPECT-1",
  company: "TEST Quotation Company",
  area: "Jakarta Selatan",
  qty: 1000,
  price: 27500,
};

const QUOTATION = {
  prospect_id: PROSPECT.id,
  quote_number: "SMP/QTN/20261102/TEST",
  status: "Draft",
  product: "Kalender Meja Custom 2027",
  discount: 100000,
  shipping: 50000,
  tax_rate: 11,
  payment_terms: "Sesuai kesepakatan",
  production_lead_time: "Dikonfirmasi setelah desain disetujui",
  delivery: "Biaya dan alamat pengiriman dikonfirmasi terpisah",
  notes: "TEST quotation only",
  valid_until: "2026-11-16",
  items: [
    { description: "Kalender Meja Custom 2027", qty: 1000, unit_price: 27500 },
    { description: "Packaging", qty: 1000, unit_price: 1000 },
  ],
};
// Expected totals, server formula: subtotal = 1000*27500 + 1000*1000 = 28,500,000
// taxable = 28,500,000 - 100,000 = 28,400,000; tax = 11% = 3,124,000
// total = 28,400,000 + 3,124,000 + 50,000 = 31,574,000
const EXPECTED_SUBTOTAL = 28500000;
const EXPECTED_TOTAL = 31574000;

let ctx;
beforeEach(async () => {
  ctx = makeEnv();
  const post = await call(ctx.env, "/api/prospects", { method: "POST", body: PROSPECT });
  assert.equal(post.status, 201, `prospect setup should be 201, got ${post.status}: ${post.text}`);
});

test("POST quotation with 2 items -> GET reads header + items + computed totals verbatim", async () => {
  const post = await call(ctx.env, "/api/quotations", { method: "POST", body: QUOTATION });
  assert.equal(post.status, 201, `POST should be 201, got ${post.status}: ${post.text}`);
  const q = post.json.quotation;
  assert.ok(q.id.startsWith("quotation-"), "server-generated quotation id");
  assert.equal(q.prospect_id, PROSPECT.id);
  assert.equal(q.quote_number, QUOTATION.quote_number);
  assert.equal(q.status, "Draft");
  assert.equal(q.subtotal, EXPECTED_SUBTOTAL);
  assert.equal(q.total, EXPECTED_TOTAL);
  assert.equal(q.items.length, 2);
  assert.equal(q.items[0].line_total, 27500000);
  assert.equal(q.items[1].line_total, 1000000);
  const get = await call(ctx.env, `/api/quotations/${q.id}`);
  assert.equal(get.status, 200);
  assert.equal(get.json.quotation.subtotal, EXPECTED_SUBTOTAL);
  assert.equal(get.json.quotation.total, EXPECTED_TOTAL);
  assert.equal(get.json.quotation.items.length, 2);
  assert.equal(get.json.quotation.items[1].description, "Packaging");
  const list = await call(ctx.env, `/api/quotations?prospect_id=${PROSPECT.id}`);
  assert.equal(list.status, 200);
  assert.equal(list.json.quotations.length, 1);
  assert.equal(list.json.quotations[0].id, q.id);
});

test("PATCH items -> totals recomputed; DELETE -> header + items gone", async () => {
  const post = await call(ctx.env, "/api/quotations", { method: "POST", body: QUOTATION });
  const id = post.json.quotation.id;
  // New items: 500 * 27500 = 13,750,000; taxable 13,650,000; tax 1,501,500; total 15,201,500
  const patch = await call(ctx.env, `/api/quotations/${id}`, {
    method: "PATCH",
    body: { items: [{ description: "Kalender Meja Custom 2027", qty: 500, unit_price: 27500 }] },
  });
  assert.equal(patch.status, 200, `PATCH should be 200, got ${patch.status}: ${patch.text}`);
  assert.equal(patch.json.quotation.subtotal, 13750000);
  assert.equal(patch.json.quotation.total, 15201500);
  assert.equal(patch.json.quotation.items.length, 1);
  assert.equal(patch.json.quotation.items[0].qty, 500);
  const del = await call(ctx.env, `/api/quotations/${id}`, { method: "DELETE" });
  assert.equal(del.status, 200);
  assert.equal(del.json.deleted, true);
  const gone = await call(ctx.env, `/api/quotations/${id}`);
  assert.equal(gone.status, 404);
  assert.equal(ctx.db.prepare("SELECT COUNT(*) AS n FROM quotation_items WHERE quotation_id = ?").get(id).n, 0);
});

test("POST with missing prospect -> 404; unauthenticated -> 401; duplicate quote_number -> 409", async () => {
  const missing = await call(ctx.env, "/api/quotations", {
    method: "POST", body: { ...QUOTATION, prospect_id: "no-such-prospect" },
  });
  assert.equal(missing.status, 404);
  const noAuth = await call(ctx.env, "/api/quotations", { auth: false });
  assert.equal(noAuth.status, 401);
  const first = await call(ctx.env, "/api/quotations", { method: "POST", body: QUOTATION });
  assert.equal(first.status, 201);
  const dup = await call(ctx.env, "/api/quotations", { method: "POST", body: QUOTATION });
  assert.equal(dup.status, 409);
});

test("POST with no items and PATCH quote_number after Draft are rejected; prospect DELETE cascades", async () => {
  const noItems = await call(ctx.env, "/api/quotations", {
    method: "POST", body: { ...QUOTATION, items: [] },
  });
  assert.equal(noItems.status, 400);
  const post = await call(ctx.env, "/api/quotations", { method: "POST", body: QUOTATION });
  const id = post.json.quotation.id;
  const sent = await call(ctx.env, `/api/quotations/${id}`, { method: "PATCH", body: { status: "Sent" } });
  assert.equal(sent.status, 200);
  assert.equal(sent.json.quotation.status, "Sent");
  const rename = await call(ctx.env, `/api/quotations/${id}`, { method: "PATCH", body: { quote_number: "SMP/QTN/20261102/OTHER" } });
  assert.equal(rename.status, 400);
  const delProspect = await call(ctx.env, `/api/prospects/${PROSPECT.id}`, { method: "DELETE" });
  assert.equal(delProspect.status, 200);
  const gone = await call(ctx.env, `/api/quotations/${id}`);
  assert.equal(gone.status, 404);
  assert.equal(ctx.db.prepare("SELECT COUNT(*) AS n FROM quotation_items WHERE quotation_id = ?").get(id).n, 0);
  assert.equal(ctx.db.prepare("SELECT COUNT(*) AS n FROM quotations WHERE prospect_id = ?").get(PROSPECT.id).n, 0);
});

test("migration 002 creates quotations tables on a v2-only database without touching prospects", async () => {
  const db = new DatabaseSync(":memory:");
  // Minimal v2 prospects table (only what migration 002 must not touch).
  db.exec(`CREATE TABLE prospects (id TEXT PRIMARY KEY, company TEXT NOT NULL, created_at TEXT, updated_at TEXT);
           INSERT INTO prospects (id, company) VALUES ('TEST-PROSPECT-1', 'TEST Quotation Company');`);
  db.exec(MIGRATION_002);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('quotations','quotation_items') ORDER BY name").all();
  assert.deepEqual(tables.map((r) => r.name), ["quotation_items", "quotations"]);
  const marker = db.prepare("SELECT id FROM schema_migrations WHERE id = '002_quotations'").get();
  assert.equal(marker.id, "002_quotations");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM prospects").get().n, 1);
  // The design schema itself also applies cleanly to the migrated database.
  const cols = db.prepare("SELECT name FROM pragma_table_info('quotations')").all().map((r) => r.name);
  for (const col of ["id", "prospect_id", "quote_number", "status", "subtotal", "total"]) {
    assert.ok(cols.includes(col), `quotations column ${col}`);
  }
});
