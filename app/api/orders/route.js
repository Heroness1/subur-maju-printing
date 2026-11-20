// SalesHub orders proxy — server-side only.
const WORKER_URL = (process.env.NEXT_PUBLIC_SALESHUB_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.SALESHUB_API_KEY || "";

async function forward(path, init) {
  if (!WORKER_URL || !API_KEY) return Response.json({ error: "saleshub_api_not_configured" }, { status: 503 });
  const res = await fetch(WORKER_URL + path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + API_KEY },
    cache: "no-store",
  });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export async function GET(request) {
  const url = new URL(request.url);
  return forward("/api/orders" + url.search, { method: "GET" });
}

export async function POST(request) {
  return forward("/api/orders", { method: "POST", body: await request.text() });
}
