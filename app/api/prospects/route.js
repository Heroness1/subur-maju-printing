// SalesHub prospects proxy — server-side only.
// The browser calls /api/prospects on this Vercel app; this route forwards
// to the Cloudflare Worker with SALESHUB_API_KEY, which is never exposed
// to the browser (it must NOT be a NEXT_PUBLIC_ variable).
const WORKER_URL = (process.env.NEXT_PUBLIC_SALESHUB_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.SALESHUB_API_KEY || "";

async function forward(path, init) {
  if (!WORKER_URL || !API_KEY) {
    return Response.json({ error: "saleshub_api_not_configured" }, { status: 503 });
  }
  const res = await fetch(WORKER_URL + path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + API_KEY },
  });
  const text = await res.text();
  return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export async function GET(request) {
  const url = new URL(request.url);
  return forward("/api/prospects" + url.search, { method: "GET" });
}

export async function POST(request) {
  const body = await request.text();
  return forward("/api/prospects", { method: "POST", body });
}
