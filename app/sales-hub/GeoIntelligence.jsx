"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, Download, Globe2, MapPin, MessageCircle, RefreshCw, ShieldCheck, Users } from "lucide-react";
import "./geo-intelligence.css";

const KEY = "smp_saleshub_funnel_read_key";
const fmt = (n) => Number(n || 0).toLocaleString("id-ID");
const pct = (n) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%";
const stamp = (v) => (v ? new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");
const statusLabel = (s) => (s === "bot" ? "Bot terdeteksi" : s === "human_signal" ? "Browser / indikasi manusia" : "Belum pasti");

const QUALITY = [
  { key: "humans", label: "Browser / indikasi manusia", hint: "Indikasi browser manusia", color: "var(--va-c)", Icon: ShieldCheck },
  { key: "bots", label: "Bot terdeteksi", hint: "User-agent cocok pola bot", color: "var(--va-m)", Icon: Bot },
  { key: "unknown", label: "Belum pasti", hint: "Informasi belum cukup", color: "var(--va-y)", Icon: Activity },
];

// Angka naik dari 0 saat data masuk; langsung final kalau reduced motion.
function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const target = Number(value || 0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(target);
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1100);
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return fmt(shown);
}

function Rank({ rows, empty }) {
  if (!rows.length) return <div className="geo-empty">{empty}</div>;
  const max = Math.max(1, rows[0][1]);
  return rows.map(([name, count], i) => (
    <div className="geo-rank" key={name}>
      <span className="geo-rank-no">{String(i + 1).padStart(2, "0")}</span>
      <div>
        <b title={name}>{name}</b>
        <i><em style={{ width: (count / max) * 100 + "%" }} /></i>
      </div>
      <strong>{fmt(count)}</strong>
    </div>
  ));
}

function QualityDonut({ stats, first }) {
  const total = stats.humans + stats.bots + stats.unknown;
  if (!total) return <div className="geo-empty">Belum ada sesi terpantau pada rentang ini.</div>;
  let acc = 0;
  const stops = QUALITY.map((q) => {
    const a = (acc / total) * 100;
    acc += stats[q.key];
    return q.color + " " + a + "% " + (acc / total) * 100 + "%";
  }).join(",");
  const num = (v) => (first ? "…" : <CountUp value={v} />);
  return (
    <div className="geo-donut-wrap">
      <div className="geo-donut" style={{ "--stops": stops }} role="img" aria-label={"Kualitas traffic dari " + fmt(total) + " sesi"}>
        <span><b>{num(total)}</b><small>sesi</small></span>
      </div>
      <ul className="geo-legend">
        {QUALITY.map(({ key, label, hint, color, Icon }) => (
          <li key={key} style={{ "--tone": color }}>
            <i aria-hidden="true" />
            <Icon size={15} aria-hidden="true" />
            <div><span>{label}</span><small>{hint}</small></div>
            <div className="geo-legend-num"><b>{num(stats[key])}</b><small>{pct((stats[key] / total) * 100)}</small></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GeoIntelligence({ onOpenFunnel }) {
  const [events, setEvents] = useState([]);
  const [key, setKey] = useState("");
  const [period, setPeriod] = useState("30");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setKey(window.sessionStorage.getItem(KEY) || "");
  }, []);

  async function load(signal) {
    if (!key) return;
    setLoading(true);
    setError("");
    try {
      const from = new Date(Date.now() - Number(period) * 86400000).toISOString();
      const r = await fetch("/api/funnel-events?limit=1000&from=" + encodeURIComponent(from), {
        cache: "no-store",
        headers: { Authorization: "Bearer " + key },
        signal,
      });
      if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "Kunci dashboard tidak valid." : "Gagal mengambil data Geo Intelligence.");
      const d = await r.json();
      setEvents(Array.isArray(d.events) ? d.events : []);
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message || "Gagal memuat data.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [key, period]);

  const visible = useMemo(
    () =>
      events.filter(
        (e) =>
          filter === "all" ||
          (filter === "human" && e.bot_status === "human_signal") ||
          (filter === "bot" && e.bot_status === "bot") ||
          (filter === "unknown" && (!e.bot_status || e.bot_status === "unknown"))
      ),
    [events, filter]
  );

  const stats = useMemo(() => {
    const sessions = new Map();
    let whatsapp = 0;
    for (const e of events) {
      const id = e.session_id || e.event_id;
      const v = sessions.get(id) || { bot_status: e.bot_status || "unknown", country: e.country || "Tidak diketahui", city: e.city || "Tidak diketahui" };
      if (e.bot_status === "bot") v.bot_status = "bot";
      else if (v.bot_status === "unknown" && e.bot_status === "human_signal") v.bot_status = "human_signal";
      sessions.set(id, v);
      if (e.event_name === "whatsapp_click") whatsapp++;
    }
    const countries = new Map();
    const cities = new Map();
    let bots = 0, humans = 0, unknown = 0;
    for (const v of sessions.values()) {
      if (v.bot_status === "bot") { bots++; continue; }
      if (v.bot_status === "human_signal") humans++;
      else unknown++;
      countries.set(v.country, (countries.get(v.country) || 0) + 1);
      const city = [v.city, v.country].filter(Boolean).join(", ");
      cities.set(city, (cities.get(city) || 0) + 1);
    }
    const rank = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { sessions: sessions.size, bots, humans, unknown, whatsapp, countries: rank(countries), cities: rank(cities) };
  }, [events]);

  function exportCsv() {
    const cols = ["occurred_at", "event_name", "ip_address", "country", "city", "region", "timezone", "bot_status", "bot_reason", "device_type", "user_agent", "source", "medium", "campaign", "gclid", "landing_page", "session_id"];
    const esc = (v) => '"' + String(v ?? "").replaceAll('"', '""') + '"';
    const csv = [cols.join(","), ...visible.map((e) => cols.map((k) => esc(e[k])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "subur-maju-geo-intelligence.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const first = loading && !events.length;
  const n = (v) => (first ? "…" : <CountUp value={v} />);

  return (
    <section
      className="hub-page geo-intelligence"
      aria-busy={loading}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", e.clientX - r.left + "px");
        e.currentTarget.style.setProperty("--my", e.clientY - r.top + "px");
      }}
    >
      <div className="geo-heading">
        <div>
          <span className="page-eyebrow">Kualitas traffic dan lokasi pengunjung</span>
          <h1>Geo Intelligence</h1>
          <p>Kenali asal pengunjung, kualitas traffic, dan kota yang menghasilkan intent pemesanan untuk membantu keputusan Google Ads.</p>
        </div>
        <div className="geo-controls">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Rentang waktu">
            <option value="7">7 hari</option>
            <option value="30">30 hari</option>
            <option value="90">90 hari</option>
          </select>
          <button type="button" className="btn-secondary" onClick={() => load()} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" /> Refresh
          </button>
          <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!visible.length}>
            <Download size={15} aria-hidden="true" /> CSV
          </button>
        </div>
      </div>

      {!key ? (
        <div className="panel geo-connect">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <b>Hubungkan akses data funnel</b>
            <p>Buka Website funnel dan masukkan kunci akses dashboard. Geo Intelligence memakai kunci sesi yang sama.</p>
            <button type="button" className="btn-primary" onClick={onOpenFunnel}>Buka Website funnel</button>
          </div>
        </div>
      ) : null}
      {error ? <div className="wf-error" role="alert">{error}</div> : null}

      {key ? (
        <>
          <div className="geo-top">
            <div className="panel geo-quality">
              <div className="panel-head">
                <div><b>Kualitas traffic</b><small>Sesi unik berdasarkan sinyal user-agent</small></div>
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
              <QualityDonut stats={stats} first={first} />
            </div>
            <div className="geo-side">
              <article>
                <span><Users size={15} aria-hidden="true" /> Sesi terpantau</span>
                <b>{n(stats.sessions)}</b>
                <small>Session ID unik</small>
              </article>
              <article>
                <span><MessageCircle size={15} aria-hidden="true" /> Klik WhatsApp</span>
                <b>{n(stats.whatsapp)}</b>
                <small>Intent, bukan pesan terkirim</small>
              </article>
            </div>
          </div>

          <div className="geo-columns">
            <div className="panel geo-panel">
              <div className="panel-head">
                <div><b>Negara asal pengunjung</b><small>Sesi unik, bot terdeteksi dikecualikan</small></div>
                <Globe2 size={18} aria-hidden="true" />
              </div>
              <Rank rows={stats.countries} empty="Belum ada data lokasi. Event baru akan mulai mengisi laporan setelah deployment aktif." />
            </div>
            <div className="panel geo-panel">
              <div className="panel-head">
                <div><b>Kota dengan traffic non-bot</b><small>Ranking berdasarkan sesi unik</small></div>
                <MapPin size={18} aria-hidden="true" />
              </div>
              <Rank rows={stats.cities} empty="Belum ada kota yang terdeteksi." />
            </div>
          </div>

          <div className="panel geo-log">
            <div className="panel-head">
              <div>
                <b>Visitor intelligence log</b>
                <small>{visible.length.toLocaleString("id-ID")} event dengan IP dan sinyal kualitas traffic</small>
              </div>
              <div className="geo-filter" role="group" aria-label="Filter kualitas traffic">
                {[["all", "Semua"], ["human", "Browser"], ["bot", "Bot"], ["unknown", "Unknown"]].map(([v, l]) => (
                  <button key={v} type="button" className={filter === v ? "active" : ""} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="table-wrap">
              <table className="prospect-table">
                <thead>
                  <tr>
                    <th>Waktu</th><th>IP address</th><th>Lokasi</th><th>Kualitas traffic</th><th>Device</th><th>Sumber / campaign</th><th>Aktivitas</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.event_id} className={e.bot_status === "bot" ? "is-bot" : ""}>
                      <td>{stamp(e.occurred_at)}</td>
                      <td className="geo-ip">{e.ip_address || "—"}</td>
                      <td>{[e.city, e.region, e.country].filter(Boolean).join(", ") || "—"}<small>{e.timezone || ""}</small></td>
                      <td>
                        <span className={"geo-status " + (e.bot_status || "unknown")}>{statusLabel(e.bot_status)}</span>
                        <small>{e.bot_reason || "Belum ada sinyal"}</small>
                      </td>
                      <td>{e.device_type || "—"}</td>
                      <td>{e.source || "Direct"}<small>{[e.medium, e.campaign].filter(Boolean).join(", ") || "—"}</small></td>
                      <td>{e.event_name === "whatsapp_click" ? "Klik WhatsApp" : (e.event_name || "—").replaceAll("_", " ")}</td>
                    </tr>
                  ))}
                  {!visible.length ? (
                    <tr><td colSpan="7"><div className="geo-empty">Belum ada data untuk filter ini.</div></td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <p className="geo-footnote">
            Klasifikasi bot berbasis user-agent dan bersifat indikatif: bot yang menyamar sebagai browser bisa lolos, sementara browser otomatis bisa salah ditandai. IP dan lokasi kota bersifat data teknis perkiraan, bukan alamat rumah. Klik WhatsApp bukan bukti pesan atau order; gunakan lead CRM terverifikasi untuk menghitung penjualan.
          </p>
        </>
      ) : null}
    </section>
  );
}
