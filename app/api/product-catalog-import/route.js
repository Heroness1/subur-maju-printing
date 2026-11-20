// Server-side read-only bridge to the public Subur Maju website catalog.
const CATALOG_URL = "https://suburmajuprinting.com/api/product-catalog";

export async function GET() {
  try {
    const response = await fetch(CATALOG_URL, { cache: "no-store" });
    if (!response.ok) return Response.json({ error: "catalog_source_unavailable" }, { status: 502 });
    const data = await response.json();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "catalog_source_unavailable" }, { status: 502 });
  }
}
