// Single-quotation proxy — see app/api/quotations/route.js for key handling.
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

async function getId(context) {
  const params = await context.params;
  return encodeURIComponent(params.id);
}

export async function GET(request, context) {
  return forward("/api/quotations/" + (await getId(context)), { method: "GET" });
}

export async function PATCH(request, context) {
  const body = await request.text();
  return forward("/api/quotations/" + (await getId(context)), { method: "PATCH", body });
}

export async function DELETE(request, context) {
  return forward("/api/quotations/" + (await getId(context)), { method: "DELETE" });
}
