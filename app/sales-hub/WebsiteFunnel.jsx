"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownToLine, Globe, RefreshCw, Users, MousePointerClick, ShoppingCart, MessageCircle } from "lucide-react";
import "./website-funnel.css";

const LABELS = {
  whatsapp_click: "Klik WhatsApp",
  category_selected: "Pilih kategori",
  product_selected: "Pilih produk",
  add_to_cart: "Tambah ke keranjang",
  begin_checkout: "Mulai checkout",
  order_details_generated: "Detail order dibuat",
  order_request_prepared: "Permintaan order disiapkan",
};
const moneyDate = (value) => value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function WebsiteFunnel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const from = new Date(Date.now() - Number(period) * 86400000).toISOString();
      const response = await fetch("/api/funnel-events?limit=1000&from=" + encodeURIComponent(from), { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 503 ? "API SalesHub belum dikonfigurasi." : "Gagal mengambil data funnel.");
      const data = await response.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      setError(err.message || "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [period]);

  const metrics = useMemo(() => {
    const count = (name) => events.filter((event) => event.event_name === name).length;
    const sessions = new Set(events.map((event) => event.session_id).filter(Boolean)).size;
    const sources = new Map();
    for (const event of events) {
      const source = event.source || "Direct / tidak diketahui";
      sources.set(source, (sources.get(source) || 0) + 1);
    }
    const topSources = [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      total: events.length,
      sessions,
      whatsapp: count("whatsapp_click"),
      checkout: count("begin_checkout"),
      cart: count("add_to_cart"),
      requests: count("order_request_prepared"),
      topSources,
    };
  }, [events]);

  function exportCsv() {
    const columns = ["occurred_at", "event_name", "source", "medium", "campaign", "landing_page", "page_location", "product", "category", "quantity", "session_id"];
    const escape = (value) => '"' + String(value ?? "").replaceAll('"', '""') + '"';
    const csv = [columns.join(","), ...events.map((event) => columns.map((key) => escape(event[key])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "subur-maju-funnel-events.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="hub-page website-funnel">
      <div className="wf-heading">
        <div><span className="page-eyebrow">AKUISISI & KONVERSI WEBSITE</span><h1>Website funnel</h1><p>Pantau aktivitas pengunjung dari sumber traffic sampai intent pemesanan. Data ini terpisah dari lead penjualan yang sudah terkonfirmasi.</p></div>
        <div className="wf-actions"><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">7 hari</option><option value="30">30 hari</option><option value="90">90 hari</option></select><button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button><button className="btn-secondary" onClick={exportCsv} disabled={!events.length}><ArrowDownToLine size={15}/> CSV</button></div>
      </div>

      {error && <div className="wf-error">{error} Pastikan migration D1 dan environment variable sudah dipasang.</div>}
      <div className="wf-metrics">
        <article><span><Activity size={15}/> Total event</span><b>{loading ? "…" : metrics.total.toLocaleString("id-ID")}</b><small>Seluruh interaksi yang terekam</small></article>
        <article><span><Users size={15}/> Sesi teridentifikasi</span><b>{loading ? "…" : metrics.sessions.toLocaleString("id-ID")}</b><small>Session ID yang tersedia</small></article>
        <article><span><MessageCircle size={15}/> Klik WhatsApp</span><b>{loading ? "…" : metrics.whatsapp.toLocaleString("id-ID")}</b><small>Bukan bukti pesan terkirim</small></article>
        <article><span><ShoppingCart size={15}/> Add to cart</span><b>{loading ? "…" : metrics.cart.toLocaleString("id-ID")}</b><small>Interaksi pada website</small></article>
        <article><span><MousePointerClick size={15}/> Mulai checkout</span><b>{loading ? "…" : metrics.checkout.toLocaleString("id-ID")}</b><small>Intent pemesanan</small></article>
      </div>

      <div className="wf-grid">
        <div className="panel wf-panel"><div className="panel-head"><div><b>Event funnel</b><small>Jumlah event per tahap</small></div><Activity size={18}/></div>
          <div className="wf-event-list">{Object.entries(LABELS).map(([name, label]) => {
            const value = events.filter((event) => event.event_name === name).length;
            const max = Math.max(1, ...Object.keys(LABELS).map((key) => events.filter((event) => event.event_name === key).length));
            return <div className="wf-event-row" key={name}><div><span>{label}</span><b>{value.toLocaleString("id-ID")}</b></div><i><em style={{ width: (value / max * 100) + "%" }}/></i></div>;
          })}</div>
        </div>
        <div className="panel wf-panel"><div className="panel-head"><div><b>Sumber traffic teratas</b><small>Berdasarkan jumlah event</small></div><Globe size={18}/></div>
          {metrics.topSources.length ? <div className="wf-source-list">{metrics.topSources.map(([source, count]) => <div key={source}><span>{source}</span><b>{count.toLocaleString("id-ID")}</b></div>)}</div> : <p className="wf-empty">Belum ada data sumber traffic.</p>}
          <div className="wf-note">Permintaan order disiapkan: <b>{metrics.requests}</b>. Untuk mengetahui lead valid dan omzet, status pelanggan tetap perlu dicatat di pipeline CRM.</div>
        </div>
      </div>

      <div className="panel wf-table-panel"><div className="panel-head"><div><b>Aktivitas terbaru</b><small>{events.length} event ditampilkan, maksimal 1.000 event per periode</small></div></div>
        <div className="table-wrap"><table className="prospect-table"><thead><tr><th>Waktu</th><th>Aktivitas</th><th>Sumber / campaign</th><th>Landing page</th><th>Produk / kategori</th></tr></thead><tbody>
          {events.map((event) => <tr key={event.event_id}><td>{moneyDate(event.occurred_at)}</td><td><b>{LABELS[event.event_name] || event.event_name}</b></td><td>{event.source || "Direct / tidak diketahui"}<small>{[event.medium, event.campaign].filter(Boolean).join(" · ") || "—"}</small></td><td className="wf-path">{event.landing_page || "—"}</td><td>{event.product || event.category || "—"}{event.quantity ? <small>{Number(event.quantity).toLocaleString("id-ID")} pcs</small> : null}</td></tr>)}
          {!loading && !events.length && <tr><td colSpan="5"><div className="wf-empty">Belum ada event website yang masuk ke SalesHub. Setelah endpoint intake dan migration aktif, data akan muncul di sini.</div></td></tr>}
        </tbody></table></div>
      </div>
      <p className="wf-disclaimer">Catatan pengukuran: whatsapp_click = klik tombol WhatsApp, bukan pesan terkirim. Add to cart dan checkout adalah aktivitas website. Jangan menghitung event ini sebagai lead atau omzet tanpa verifikasi percakapan dan transaksi.</p>
    </section>
  );
}
