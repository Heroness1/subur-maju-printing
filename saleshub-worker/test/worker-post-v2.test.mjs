// D1-compatible POST test for the SalesHub Worker v2 schema.
//
// Runs the real Worker code (../src/index.js) against an in-memory SQLite
// database through a minimal mock of the D1 API surface (prepare/bind/run/
// first/all). The SQL is exactly what the Worker sends to D1, and the
// schema is exactly saleshub-worker/schema.sql, so a column/placeholder/
// bind mismatch that would fail on D1 fails here too (SQLite reports
// "N values for M columns").
//
// Run with: node --test saleshub-worker/test/worker-post-v2.test.mjs
// (Node >= 22, which ships node:sqlite. No network, no remote D1, no secret.)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";

const SCHEMA = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const API_KEY = "test-secret";

function makeEnv() {
  const db = new DatabaseSync(":memory:");
  db.exec(SCHEMA);
  const mockDb = {
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
  return { db, env: { DB: mockDb, SALESHUB_API_KEY: API_KEY, ALLOWED_ORIGIN: "https://example.test" } };
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

const FULL_INPUT = {
  id: "SMP-POST-TEST",
  company: "PT Post Test Tbk",
  website: "https://post.test",
  jakarta_address: "Jakarta Selatan",
  city: "Jakarta",
  industry: "Banking",
  score: 90,
  stage: "Lost",
  pic_name: "Budi Test",
  pic_role: "Procurement",
  email: "budi@post.test",
  draft_email: "Draft untuk PT Post Test",
  follow_up_date: "2026-11-10",
  source_url: "https://post.test/about",
  notes: "Catatan v2",
  area: "Jakarta Selatan",
  qty: 500,
  price: 30000,
  po_value: 15000000,
  source: "Public web research",
  verification_status: "Terverifikasi",
  verified_at: "2026-11-01",
  reason: "Gift karyawan",
  sent_date: "2026-11-02",
  last_narahubung: "2026-10-01",
  company_source_url: "https://post.test/about",
  contact_source_url: "https://post.test/team",
  email_source_url: "https://post.test/contact",
};

let ctx;
beforeEach(() => { ctx = makeEnv(); });

test("POST stores all 28 columns, including every v2 field, and GET reads them back", async () => {
  const post = await call(ctx.env, "/api/prospects", { method: "POST", body: FULL_INPUT });
  assert.equal(post.status, 201, `POST should be 201, got ${post.status}: ${post.text}`);
  assert.equal(post.json.prospect.id, FULL_INPUT.id);
  // Every input field must come back verbatim from the database row.
  for (const [key, value] of Object.entries(FULL_INPUT)) {
    assert.deepEqual(post.json.prospect[key], value, `POST response field ${key}`);
  }
  const get = await call(ctx.env, `/api/prospects/${FULL_INPUT.id}`);
  assert.equal(get.status, 200, `GET should be 200, got ${get.status}: ${get.text}`);
  for (const [key, value] of Object.entries(FULL_INPUT)) {
    assert.deepEqual(get.json.prospect[key], value, `GET-back field ${key}`);
  }
  // v2 fields specifically (these were dropped by the old 15-column INSERT).
  assert.equal(get.json.prospect.area, "Jakarta Selatan");
  assert.equal(get.json.prospect.qty, 500);
  assert.equal(get.json.prospect.price, 30000);
  assert.equal(get.json.prospect.po_value, 15000000);
  assert.equal(get.json.prospect.source, "Public web research");
  assert.equal(get.json.prospect.verification_status, "Terverifikasi");
  assert.equal(get.json.prospect.stage, "Lost");
});

test("PATCH updates v2 fields and DELETE removes the row", async () => {
  await call(ctx.env, "/api/prospects", { method: "POST", body: FULL_INPUT });
  const patch = await call(ctx.env, `/api/prospects/${FULL_INPUT.id}`, {
    method: "PATCH",
    body: { qty: 1000, price: 27500, verification_status: "Perlu ditinjau" },
  });
  assert.equal(patch.status, 200, `PATCH should be 200, got ${patch.status}: ${patch.text}`);
  assert.equal(patch.json.prospect.qty, 1000);
  assert.equal(patch.json.prospect.price, 27500);
  assert.equal(patch.json.prospect.verification_status, "Perlu ditinjau");
  const del = await call(ctx.env, `/api/prospects/${FULL_INPUT.id}`, { method: "DELETE" });
  assert.equal(del.status, 200);
  const gone = await call(ctx.env, `/api/prospects/${FULL_INPUT.id}`);
  assert.equal(gone.status, 404);
});

test("POST without company is rejected and unauthenticated calls are rejected", async () => {
  const bad = await call(ctx.env, "/api/prospects", { method: "POST", body: { website: "https://x.test" } });
  assert.equal(bad.status, 400);
  const noAuth = await call(ctx.env, "/api/prospects", { auth: false });
  assert.equal(noAuth.status, 401);
});
