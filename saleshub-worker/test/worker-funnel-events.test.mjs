// Funnel intake tests: deduplication, allow-list validation, auth and read API.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";

const SCHEMA = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const API_KEY = "admin-test-secret";
const INTAKE_KEY = "intake-test-secret";

function makeEnv() {
  const db = new DatabaseSync(":memory:");
  db.exec(SCHEMA);
  const mockDb = {
    prepare(sql) {
      let params = [];
      return {
        bind(...args) { params = args; return this; },
        run() { const result = db.prepare(sql).run(...params); return { meta: { changes: result.changes } }; },
        first() { return db.prepare(sql).get(...params) ?? null; },
        all() { return { results: db.prepare(sql).all(...params) }; },
      };
    },
  };
  return { env: { DB: mockDb, SALESHUB_API_KEY: API_KEY, SALESHUB_INTAKE_API_KEY: INTAKE_KEY, ALLOWED_ORIGIN: "https://saleshub.example" } };
}

async function call(env, path, { method = "GET", body, key = API_KEY } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers.Authorization = "Bearer " + key;
  const response = await worker.fetch(new Request("https://worker.test" + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  }), env);
  return { status: response.status, json: await response.json() };
}

let ctx;
beforeEach(() => { ctx = makeEnv(); });

const event = {
  event_id: "event-unique-001",
  event_name: "whatsapp_click",
  session_id: "session-123",
  occurred_at: "2026-11-19T09:00:00.000Z",
  source: "google",
  medium: "organic",
  campaign: "printing-jakarta",
  landing_page: "/brosur-jakarta-timur",
  page_location: "https://www.suburmajuprinting.com/brosur-jakarta-timur",
  referrer: "https://google.com/",
};

test("intake stores allowed event and deduplicates repeated event_id", async () => {
  const first = await call(ctx.env, "/api/intake/funnel-events", { method: "POST", body: event, key: INTAKE_KEY });
  assert.equal(first.status, 201);
  assert.equal(first.json.accepted, true);
  assert.equal(first.json.duplicate, false);
  const duplicate = await call(ctx.env, "/api/intake/funnel-events", { method: "POST", body: event, key: INTAKE_KEY });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.json.duplicate, true);
  const list = await call(ctx.env, "/api/funnel-events");
  assert.equal(list.status, 200);
  assert.equal(list.json.events.length, 1);
  assert.equal(list.json.events[0].campaign, "printing-jakarta");
});

test("intake requires its separate secret and rejects unknown event names", async () => {
  const unauthorized = await call(ctx.env, "/api/intake/funnel-events", { method: "POST", body: event, key: API_KEY });
  assert.equal(unauthorized.status, 401);
  const invalid = await call(ctx.env, "/api/intake/funnel-events", { method: "POST", body: { ...event, event_name: "fake_conversion" }, key: INTAKE_KEY });
  assert.equal(invalid.status, 400);
});

test("admin event listing still requires the regular SalesHub API key", async () => {
  const unauthorized = await call(ctx.env, "/api/funnel-events", { key: INTAKE_KEY });
  assert.equal(unauthorized.status, 401);
});
