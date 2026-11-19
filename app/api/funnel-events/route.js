// Internal SalesHub funnel reporting proxy. Requires a separate dashboard read key.
const WORKER_URL = (process.env.NEXT_PUBLIC_SALESHUB_API_URL || "").replace(/\/$/, "");
const API_KEY = process.env.SALESHUB_API_KEY || "";
const READ_KEY = process.env.SALESHUB_FUNNEL_READ_KEY || "";

export async function GET(request) {
  if (!WORKER_URL || !API_KEY || !READ_KEY) return Response.json({ error: "saleshub_api_not_configured" }, { status: 503 });
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!supplied || supplied.length !== READ_KEY.length) return Response.json({ error: "unauthorized" }, { status: 401 });
  let diff = 0;
  for (let i = 0; i < READ_KEY.length; i++) diff |= supplied.charCodeAt(i) ^ READ_KEY.charCodeAt(i);
  if (diff !== 0) return Response.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const query = new URLSearchParams();
  for (const key of ["from", "limit"]) { const value = url.searchParams.get(key); if (value) query.set(key, value); }
  const suffix = query.size ? "?" + query.toString() : "";
  const res = await fetch(WORKER_URL + "/api/funnel-events" + suffix, { headers: { Authorization: "Bearer " + API_KEY }, cache: "no-store" });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
