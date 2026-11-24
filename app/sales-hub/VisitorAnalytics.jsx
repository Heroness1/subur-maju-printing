"use client";

import { useEffect, useMemo, useState } from "react";
import { Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import "./visitor-analytics.css";

const KEY = "smp_saleshub_funnel_read_key";
const PERIODS = ["7", "30", "90"];
const W = 600;
const H = 220;
const PAD = 14;

const fmt = (value) => Number(value || 0).toLocaleString("id-ID");
const pct = (value) => Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%";
const shortDate = (key) => new Date(key + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });

// Isi hari tanpa traffic dengan 0 supaya tren di grafik jujur.
function fillDays(daily) {
  if (!daily?.length) return [];
  const map = new Map(daily.map((d) => [String(d.date).slice(0, 10), Number(d.page_views || 0)]));
  const keys = [...map.keys()].sort();
  const cur = new Date(keys[0] + "T00:00:00Z");
  const end = new Date(keys[keys.length - 1] + "T00:00:00Z");
  const out = [];
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    out.push({ date: key, views: map.get(key) || 0 });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function curve(pts) {
  if (!pts.length) return "";
  let d = "M" + pts[0][0] + " " + pts[0][1];
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += " Q" + x + " " + y + " " + ((x + nx) / 2).toFixed(1) + " " + ((y + ny) / 2).toFixed(1);
  }
  const last = pts[pts.length - 1];
  return d + " L" + last[0] + " " + last[1];
}

function Bars({ rows, tone, empty }) {
  if (!rows.length) return <p className="va-empty">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={"va-bars " + tone}>
      {rows.map((r) => (
        <li key={r.key} style={{ "--w": (r.value / max) * 100 + "%" }}>
          <span className="va-bars-label" title={r.title || r.label}>
            {r.icon}
            {r.label}
            {r.hint ? <em>{r.hint}</em> : null}
          </span>
          <b>{fmt(r.value)}</b>
          {r.sub ? <small>{r.sub}</small> : null}
        </li>
      ))}
    </ul>
  );
}

function Card({ tone, title, sub, children }) {
  return (
    <div className={"va-card " + tone}>
      <div className="va-card-head">
        <i aria-hidden="true" />
        <div>
          <h3>{title}</h3>
          <small>{sub}</small>
        </div>
      </div>
      {children}
    </div>
  );
}

const INKS = ["#1fc8f2", "#f2368a", "#ffd23f", "#edeaf2", "rgba(31,200,242,.4)", "rgba(242,54,138,.4)", "rgba(255,210,63,.4)", "rgba(237,234,242,.4)"];

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

function Donut({ rows, empty }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return <p className="va-empty">{empty}</p>;
  const colors = ["var(--va-c)", "var(--va-m)", "var(--va-y)"];
  let acc = 0;
  const stops = rows
    .map((r, i) => {
      const a = (acc / total) * 100;
      acc += r.value;
      return colors[i % 3] + " " + a + "% " + (acc / total) * 100 + "%";
    })
    .join(",");
  return (
    <div className="va-donut-wrap">
      <div className="va-donut" style={{ "--stops": stops }} role="img" aria-label={"Pembagian perangkat dari " + fmt(total) + " page views"}>
        <span><b>{fmt(total)}</b><small>views</small></span>
      </div>
      <ul className="va-legend">
        {rows.map((r, i) => (
          <li key={r.key}>
            <i style={{ background: colors[i % 3] }} />
            {r.icon}
            <span>{r.label}</span>
            <b>{pct((r.value / total) * 100)}</b>
            <small>{r.sub}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VisitorAnalytics() {
  const [readKey, setReadKey] = useState("");
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(null);

  useEffect(() => {
    setReadKey(window.sessionStorage.getItem(KEY) || "");
  }, []);

  async function load(signal) {
    if (!readKey) return;
    setLoading(true);
    setError("");
    try {
      const from = new Date(Date.now() - Number(period) * 86400000).toISOString();
      const to = new Date().toISOString();
      const response = await fetch("/api/visitor-analytics?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to), {
        cache: "no-store",
        headers: { Authorization: "Bearer " + readKey },
        signal,
      });
      if (!response.ok) {
        throw new Error(
          response.status === 503
            ? "API SalesHub belum dikonfigurasi."
            : response.status === 401 || response.status === 403
            ? "Read key ditolak. Periksa key di sesi ini."
            : "Gagal mengambil data visitor."
        );
      }
      setData(await response.json());
    } catch (err) {
      if (err.name === "AbortError") return;
      setData(null);
      setError(err.message || "Gagal memuat visitor analytics.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (!readKey) return;
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [readKey, period]);

  const summary = data?.summary || {};
  const series = useMemo(() => fillDays(data?.daily), [data]);
  const chart = useMemo(() => {
    if (!series.length) return null;
    const max = Math.max(1, ...series.map((d) => d.views));
    const n = series.length;
    const pts = series.map((d, i) => [
      Number((n > 1 ? PAD + (i * (W - 2 * PAD)) / (n - 1) : W / 2).toFixed(1)),
      Number((H - PAD - (d.views / max) * (H - 2 * PAD - 16)).toFixed(1)),
    ]);
    const line = curve(pts);
    const area = line + " L" + pts[n - 1][0] + " " + H + " L" + pts[0][0] + " " + H + " Z";
    return { pts, line, area };
  }, [series]);

  function onMove(e) {
    if (series.length < 2) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(ratio * (series.length - 1)));
  }

  const first = !data && loading;
  const n = (v) => (first ? "…" : <CountUp value={v} />);
  const peak = useMemo(() => series.reduce((b, d, i) => (d.views > series[b].views ? i : b), 0), [series]);
  const idx = hover ?? peak;
  const point = chart ? chart.pts[idx] : null;
  const deviceIcon = (name) => {
    const Icon = name === "mobile" ? Smartphone : name === "tablet" ? Tablet : Monitor;
    return <Icon size={15} aria-hidden="true" />;
  };

  return (
    <section className="visitor-analytics" aria-busy={loading}>
      <div className="va-strip" aria-hidden="true">{INKS.map((c) => <i key={c} style={{ background: c }} />)}</div>
      <header
        className="va-hero"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", e.clientX - r.left + "px");
          e.currentTarget.style.setProperty("--my", e.clientY - r.top + "px");
        }}
      >
        <div className="va-hero-top">
          <div>
            <h2>Visitor analytics</h2>
            <p>Pengunjung yang hanya membuka halaman tetap dihitung, tanpa harus klik tombol atau mengirim pesan.</p>
          </div>
          <div className="va-controls">
            <div className="va-seg" role="group" aria-label="Rentang waktu">
              {PERIODS.map((p) => (
                <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
                  {p} hari
                </button>
              ))}
            </div>
            <button type="button" className="va-refresh" onClick={() => load()} disabled={loading || !readKey}>
              <RefreshCw size={15} aria-hidden="true" /> Refresh
            </button>
          </div>
        </div>

        {error ? <div className="va-error" role="alert">{error}</div> : null}
        {!readKey ? <div className="va-error">Read key belum tersimpan di sesi ini, jadi data belum bisa diambil.</div> : null}

        <div className={"va-figure" + (loading ? " is-loading" : "")}>
          <div className="va-big">
            <b>{n(summary.page_views)}</b>
            <span>page views dalam {period} hari, bot dikecualikan</span>
          </div>
          <dl className="va-stats">
            <div><dt>Unique visitors</dt><dd>{n(summary.visitors)}</dd></div>
            <div><dt>Sessions</dt><dd>{n(summary.sessions)}</dd></div>
            <div>
              <dt>Sesi satu halaman</dt>
              <dd>{first ? "…" : pct(summary.single_page_session_rate)}</dd>
              <small>{fmt(summary.single_page_sessions)} sesi</small>
            </div>
          </dl>
        </div>

        <div className="va-chart" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {chart ? (
            <>
              <svg key={period + ":" + series.length + ":" + series[0].date} viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" role="img" aria-label={"Grafik page views harian, total " + fmt(summary.page_views)}>
                <defs>
                  <linearGradient id="va-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#1fc8f2" stopOpacity=".34" />
                    <stop offset="1" stopColor="#1fc8f2" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((t) => <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} className="va-gridline" />)}
                <path d={chart.area} fill="url(#va-area)" />
                <path d={chart.line} className="va-line va-l-y" />
                <path d={chart.line} className="va-line va-l-c" />
                <path d={chart.line} className="va-line va-l-m" />
              </svg>
              {point ? (
                <>
                  <span className={"va-cursor" + (hover == null ? " idle" : "")} style={{ left: (point[0] / W) * 100 + "%" }} />
                  <span className={"va-dot" + (hover == null ? " idle" : "")} style={{ left: (point[0] / W) * 100 + "%", top: (point[1] / H) * 100 + "%" }} />
                  <span className="va-tip" style={{ "--x": (point[0] / W) * 100 + "%" }}>
                    {hover == null ? "Puncak: " : ""}<b>{fmt(series[idx].views)}</b> views, {shortDate(series[idx].date)}
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <p className="va-empty va-chart-empty">{loading ? "Memuat data…" : "Belum ada page view. Buka website publik untuk menghasilkan data pertama."}</p>
          )}
        </div>
        {series.length > 1 ? (
          <div className="va-axis">
            <span>{shortDate(series[0].date)}</span>
            <span>{shortDate(series[Math.floor(series.length / 2)].date)}</span>
            <span>{shortDate(series[series.length - 1].date)}</span>
          </div>
        ) : null}
      </header>

      <div className="va-grid">
        <Card tone="c" title="Halaman terpopuler" sub="URL yang paling sering dibuka">
          <Bars
            tone="c"
            empty="Belum ada halaman tercatat."
            rows={(data?.top_pages || []).map((i) => ({ key: i.page_path, label: i.page_path, value: Number(i.page_views || 0), sub: fmt(i.visitors) + " visitors" }))}
          />
        </Card>
        <Card tone="m" title="Sumber traffic" sub="Asal kunjungan">
          <Bars
            tone="m"
            empty="Belum ada sumber traffic."
            rows={(data?.sources || []).map((i) => ({ key: i.source + "|" + i.medium, label: i.source, hint: i.medium, value: Number(i.page_views || 0), sub: fmt(i.visitors) + " visitors" }))}
          />
        </Card>
        <Card tone="y" title="Perangkat" sub="Perkiraan dari request edge Cloudflare">
          <Donut
            empty="Belum ada data perangkat."
            rows={(data?.devices || []).map((i) => ({ key: i.device_type, label: i.device_type, icon: deviceIcon(i.device_type), value: Number(i.page_views || 0), sub: fmt(i.visitors) + " visitors" }))}
          />
        </Card>
        <Card tone="k" title="Lokasi" sub="Kota dan negara pengunjung">
          <Bars
            tone="k"
            empty="Belum ada data lokasi."
            rows={(data?.locations || []).slice(0, 6).map((i) => {
              const label = [i.city, i.country].filter(Boolean).join(", ") || "Tidak diketahui";
              return { key: (i.country || "") + "|" + (i.city || ""), label, value: Number(i.visitors || 0), sub: "visitors" };
            })}
          />
        </Card>
      </div>

      <p className="va-note">
        Bot page views terdeteksi: <b>{fmt(summary.bot_page_views)}</b>. Visitor ID disimpan di browser pengunjung; session ID berlaku selama tab browser terbuka. Sistem tidak menyimpan alamat IP mentah, nama, email, atau user-agent lengkap. Angka unique visitors bersifat estimasi first-party, bukan identitas orang.
      </p>
    </section>
  );
}
