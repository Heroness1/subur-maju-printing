// Native visitor analytics tests: origin allowlist, page-view validation, dedupe and reporting.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";

const SCHEMA = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const API_KEY = "admin-test-secret";

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
  return { env: { DB: mockDb, SALESHUB_API_KEY: API_KEY, ALLOWED_ORIGIN: "https://saleshub.example", ALLOWED_ORIGINS: "https://www.suburmajuprinting.com" } };
}

async function call(env, path, { method = "GET", body, key = API_KEY, origin = "https://www.suburmajuprinting.com", userAgent = "Mozilla/5.0 Chrome/130.0" } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers.Authorization = "Bearer " + key;
  if (origin) headers.Origin = origin;
  if (userAgent) headers["User-Agent"] = userAgent;
  const response = await worker.fetch(new Request("https://worker.test" + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    cf: { country: "ID", city: "Jakarta", region: "DKI Jakarta", timezone: "Asia/Jakarta" },
  }), env);
  return { status: response.status, json: await response.json() };
}

let ctx;
beforeEach(() => { ctx = makeEnv(); });

const pageView = {
  event_id: "event-visitor-000001",
  visitor_id: "visitor-unique-000001",
  session_id: "session-unique-000001",
  page_path: "/",
  page_title: "Subur Maju Printing",
  referrer: "https://www.google.com/search?q=printing",
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "printing-jakarta",
  gclid: "test-gclid",
};

test("public page-view intake stores anonymous view and deduplicates event_id", async () => {
  const first = await call(ctx.env, "/api/intake/page-view", { method: "POST", body: pageView, key: null });
  assert.equal(first.status, 201);
  assert.equal(first.json.accepted, true);
  assert.equal(first.json.duplicate, false);
  const duplicate = await call(ctx.env, "/api/intake/page-view", { method: "POST", body: pageView, key: null });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.json.duplicate, true);
  const report = await call(ctx.env, "/api/visitor-analytics");
  assert.equal(report.status, 200);
  assert.equal(report.json.summary.page_views, 1);
  assert.equal(report.json.summary.visitors, 1);
  assert.equal(report.json.summary.sessions, 1);
  assert.equal(report.json.summary.single_page_sessions, 1);
  assert.equal(report.json.top_pages[0].page_path, "/");
  assert.equal(report.json.sources[0].source, "google");
  assert.equal(report.json.locations[0].city, "Jakarta");
});

test("visitor intake rejects unknown origins and malformed page paths", async () => {
  const origin = await call(ctx.env, "/api/intake/page-view", { method: "POST", body: pageView, key: null, origin: "https://attacker.example" });
  assert.equal(origin.status, 403);
  const path = await call(ctx.env, "/api/intake/page-view", { method: "POST", body: { ...pageView, event_id: "event-visitor-000002", page_path: "/?email=private" }, key: null });
  assert.equal(path.status, 400);
});

test("visitor analytics read endpoint requires the SalesHub API key", async () => {
  const unauthorized = await call(ctx.env, "/api/visitor-analytics", { key: "wrong-secret" });
  assert.equal(unauthorized.status, 401);
});

test("known bots are separated from visitor and page-view totals", async () => {
  await call(ctx.env, "/api/intake/page-view", { method: "POST", body: pageView, key: null });
  await call(ctx.env, "/api/intake/page-view", {
    method: "POST", key: null, userAgent: "Googlebot/2.1",
    body: { ...pageView, event_id: "event-visitor-bot-00001", visitor_id: "visitor-bot-0000001", session_id: "session-bot-00000001", page_path: "/robots" },
  });
  const report = await call(ctx.env, "/api/visitor-analytics");
  assert.equal(report.json.summary.page_views, 1);
  assert.equal(report.json.summary.visitors, 1);
  assert.equal(report.json.summary.bot_page_views, 1);
});
