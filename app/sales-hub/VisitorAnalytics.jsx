"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Globe2, Monitor, RefreshCw, Smartphone, Tablet, Users, Eye, MousePointer2 } from "lucide-react";
import "./visitor-analytics.css";

const KEY = "smp_saleshub_funnel_read_key";
const fmt = (value) => Number(value || 0).toLocaleString("id-ID");
const pct = (value) => Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%";

export default function VisitorAnalytics() {
  const [readKey, setReadKey] = useState("");
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setReadKey(window.sessionStorage.getItem(KEY) || "");
  }, []);

  async function load() {
    if (!readKey) return;
    setLoading(true);
    setError("");
    try {
      const from = new Date(Date.now() - Number(period) * 86400000).toISOString();
      const to = new Date().toISOString();
      const response = await fetch("/api/visitor-analytics?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to), {
        cache: "no-store",
        headers: { Authorization: "Bearer " + readKey },
      });
      if (!response.ok) throw new Error(response.status === 503 ? "API SalesHub belum dikonfigurasi." : "Gagal mengambil data visitor.");
      setData(await response.json());
    } catch (err) {
      setError(err.message || "Gagal memuat visitor analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (readKey) load(); }, [readKey, period]);

  const summary = data?.summary || {};
  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily || []).map((item) => Number(item.page_views || 0))), [data]);
  const deviceIcon = (name) => name === "mobile" ? <Smartphone size={15}/> : name === "tablet" ? <Tablet size={15}/> : <Monitor size={15}/>;

  return (
    <section className="visitor-analytics">
      <div className="va-heading">
        <div><span className="page-eyebrow">FIRST-PARTY WEBSITE ANALYTICS</span><h2>Visitor analytics</h2><p>Pengunjung yang hanya membuka halaman tetap dihitung, tanpa harus klik tombol atau mengirim pesan.</p></div>
        <div className="va-controls"><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">7 hari</option><option value="30">30 hari</option><option value="90">90 hari</option></select><button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
      </div>

      {error ? <div className="wf-error">{error}</div> : null}
      <div className="va-metrics">
        <article><span><Eye size={15}/> Page views</span><b>{loading ? "…" : fmt(summary.page_views)}</b><small>Halaman dibuka, bot dikecualikan</small></article>
        <article><span><Users size={15}/> Unique visitors</span><b>{loading ? "…" : fmt(summary.visitors)}</b><small>Visitor ID first-party</small></article>
        <article><span><Activity size={15}/> Sessions</span><b>{loading ? "…" : fmt(summary.sessions)}</b><small>Session ID per tab browser</small></article>
        <article><span><MousePointer2 size={15}/> Single-page sessions</span><b>{loading ? "…" : pct(summary.single_page_session_rate)}</b><small>{fmt(summary.single_page_sessions)} sesi hanya membuka satu halaman</small></article>
      </div>

      <div className="va-grid">
        <div className="panel va-panel">
          <div className="panel-head"><div><b>Page views per day</b><small>Traffic harian dari pengunjung non-bot</small></div><Activity size={18}/></div>
          {data?.daily?.length ? <div className="va-daily">{data.daily.map((item) => <div className="va-day" key={item.date}><span>{new Date(item.date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span><i><em style={{ width: (Number(item.page_views || 0) / maxDaily * 100) + "%" }}/></i><b>{fmt(item.page_views)}</b></div>)}</div> : <p className="wf-empty">{loading ? "Memuat data…" : "Belum ada page view. Buka website publik untuk menghasilkan data pertama."}</p>}
        </div>
        <div className="panel va-panel">
          <div className="panel-head"><div><b>Top pages</b><small>URL yang paling sering dibuka</small></div><Globe2 size={18}/></div>
          {data?.top_pages?.length ? <div className="va-list">{data.top_pages.map((item) => <div key={item.page_path}><span title={item.page_path}>{item.page_path}</span><b>{fmt(item.page_views)}</b><small>{fmt(item.visitors)} visitors</small></div>)}</div> : <p className="wf-empty">Belum ada halaman tercatat.</p>}
        </div>
        <div className="panel va-panel">
          <div className="panel-head"><div><b>Traffic sources</b><small>Asal kunjungan</small></div><Globe2 size={18}/></div>
          {data?.sources?.length ? <div className="va-list">{data.sources.map((item) => <div key={item.source + item.medium}><span>{item.source}<small>{item.medium}</small></span><b>{fmt(item.page_views)}</b><small>{fmt(item.visitors)} visitors</small></div>)}</div> : <p className="wf-empty">Belum ada sumber traffic.</p>}
        </div>
        <div className="panel va-panel">
          <div className="panel-head"><div><b>Devices & locations</b><small>Perkiraan dari request edge Cloudflare</small></div><Monitor size={18}/></div>
          {data?.devices?.length ? <div className="va-list">{data.devices.map((item) => <div key={item.device_type}><span>{deviceIcon(item.device_type)} {item.device_type}</span><b>{fmt(item.page_views)}</b><small>{fmt(item.visitors)} visitors</small></div>)}</div> : <p className="wf-empty">Belum ada data perangkat.</p>}
          <div className="va-sublist">{(data?.locations || []).slice(0, 5).map((item) => <div key={(item.country || "") + (item.city || "")}><span>{[item.city, item.country].filter(Boolean).join(", ")}</span><b>{fmt(item.visitors)}</b></div>)}</div>
        </div>
      </div>
      <p className="va-note">Bot page views terdeteksi: <b>{fmt(summary.bot_page_views)}</b>. Visitor ID disimpan di browser pengunjung; session ID berlaku selama tab browser terbuka. Sistem tidak menyimpan alamat IP mentah, nama, email, atau user-agent lengkap. Angka unique visitors bersifat estimasi first-party, bukan identitas orang.</p>
    </section>
  );
}
