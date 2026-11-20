// Public read-only product prices for the website catalog. No costs or internal notes are exposed.
const WORKER_URL = (process.env.NEXT_PUBLIC_SALESHUB_API_URL || "").replace(/\/$/, "");
export async function GET() {
  if (!WORKER_URL) return Response.json({ error: "saleshub_api_not_configured" }, { status: 503 });
  const upstream = await fetch(WORKER_URL + "/api/public/products", { cache: "no-store" });
  return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
