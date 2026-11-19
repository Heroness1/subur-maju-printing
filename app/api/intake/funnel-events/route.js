// Server-to-server intake proxy for the public marketing website.
// Configure SALESHUB_INTAKE_API_KEY in Vercel and as a Cloudflare Worker secret.
const WORKER_URL = (process.env.NEXT_PUBLIC_SALESHUB_API_URL || "").replace(/\/$/, "");
const INTAKE_KEY = process.env.SALESHUB_INTAKE_API_KEY || "";
const SITE_SHARED_KEY = process.env.SITE_FUNNEL_SHARED_SECRET || "";

export async function POST(request) {
  if (!WORKER_URL || !INTAKE_KEY || !SITE_SHARED_KEY) {
    return Response.json({ error: "funnel_intake_not_configured" }, { status: 503 });
  }
  const suppliedKey = request.headers.get("x-site-intake-token") || "";
  if (!suppliedKey || suppliedKey.length !== SITE_SHARED_KEY.length || suppliedKey !== SITE_SHARED_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.text();
  if (body.length > 12000) {
    return Response.json({ error: "payload_too_large" }, { status: 413 });
  }
  let parsed;
  try { parsed = JSON.parse(body); } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const res = await fetch(WORKER_URL + "/api/intake/funnel-events", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + INTAKE_KEY },
    body: JSON.stringify(parsed),
    cache: "no-store",
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
