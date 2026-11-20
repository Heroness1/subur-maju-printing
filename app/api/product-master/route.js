// Product master proxy. Admin password is checked server-side; Worker API key never reaches the browser.
const WORKER_URL = (process.env.NEXT_PUBLIC_SALESHUB_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.SALESHUB_API_KEY || "";
const ADMIN_KEY = process.env.SALESHUB_PRODUCT_ADMIN_KEY || "";

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function handle(request) {
  if (!WORKER_URL || !API_KEY || !ADMIN_KEY) return Response.json({ error: "product_master_not_configured" }, { status: 503 });
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(supplied, ADMIN_KEY)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const suffix = url.search;
  const init = { method: request.method, headers: { "Content-Type": "application/json", Authorization: "Bearer " + API_KEY }, cache: "no-store" };
  if (!["GET", "HEAD"].includes(request.method)) init.body = await request.text();
  const upstream = await fetch(WORKER_URL + "/api/product-master" + suffix, init);
  return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
export async function GET(request) { return handle(request); }
export async function POST(request) { return handle(request); }
export async function PATCH(request) { return handle(request); }
export async function DELETE(request) { return handle(request); }
