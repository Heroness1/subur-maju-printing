"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bell, Building2, CalendarClock,
  Check, ChevronDown, CircleDollarSign, ClipboardList, Copy, Download,
  FileText, Filter, LayoutDashboard, Mail, MapPin, Menu, MessageSquare, Linkedin, Globe,
  Plus, Printer, Search, Send, Settings2, ShieldCheck, Target, Trash2,
  TrendingUp, Users, X
} from "lucide-react";
import "./sales-hub.css";

const STORAGE_KEY = "smp-sales-hub-v1";
const PRICE_DEFAULT = 27500;
const PRICE_FLOOR = 24000;
const PRICE_PLUS = 34900;
const PRICE_PREMIUM_MIN = 49900;
const UNIT_COST_DEFAULT = 15000;
const SALES_COMMISSION_RATE = 0.25;
const STATUSES = ["New", "Qualified", "Draft ready", "Contacted", "Interested", "Negotiation", "Won", "Lost", "Opt-out"];
const NAV = [
  ["Overview", LayoutDashboard], ["Pencarian perusahaan", Search], ["Database prospek", Building2], ["Pipeline penjualan", Target],
  ["Studio email", Mail], ["Tindak lanjut", CalendarClock], ["Penawaran harga", FileText], ["Keuangan", CircleDollarSign]
];

const starter = [];

function money(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function makeId() {
  return "SMP-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}
function escCsv(value) {
  return '"' + String(value ?? "").replaceAll('"', '""') + '"';
}
function makeEmail(lead, sender, phone) {
  const contact = lead.contact ? "Yth. " + lead.contact : "Yth. Tim Procurement / Marketing";
  const company = lead.company || "Bapak/Ibu";
  const reason = lead.reason || "kebutuhan merchandise dan branding perusahaan";
  const unitPrice = Number(lead.price || PRICE_DEFAULT);
  return {
    subject: "Penawaran Kalender Meja Custom 2027 untuk " + company,
    body: contact + ",\n\nPerkenalkan, kami dari Subur Maju Printing.\n\nKami ingin menawarkan kalender meja custom 2027 untuk kebutuhan branding, merchandise, maupun corporate gift " + company + ". Kami menangani produksi sendiri dan dapat mendiskusikan desain serta spesifikasi sesuai kebutuhan perusahaan.\n\nSebagai gambaran awal, harga acuan untuk pemesanan 1.000 pcs adalah " + money(unitPrice) + "/pcs (estimasi " + money(unitPrice * 1000) + " untuk 1.000 pcs). Harga final mengikuti spesifikasi, desain, finishing, dan detail pengiriman yang disepakati.\n\nKami menghubungi " + company + " karena " + reason + ". Apakah Bapak/Ibu berkenan menerima katalog dan penawaran resmi untuk ditinjau? Jika bukan bagian yang tepat, mohon arahkan kami ke PIC terkait.\n\nTerima kasih atas waktunya. Jika email ini tidak relevan, silakan balas agar kami tidak menghubungi kembali.\n\nSalam,\n" + (sender || "Tim Subur Maju Printing") + "\nSubur Maju Printing\n" + (phone || "[Nomor WhatsApp bisnis]")
  };
}

export default function SalesHubPage() {
  const [leads, setLeads] = useState(starter);
  const [expenses, setExpenses] = useState([]);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua status");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [emailDraft, setEmailDraft] = useState({ subject: "", body: "" });
  const [sender, setSender] = useState("Tim Subur Maju Printing");
  const [phone, setPhone] = useState("");
  const [quote, setQuote] = useState(() => {
    const date = new Date();
    const dateKey = date.toISOString().slice(0, 10).replaceAll("-", "");
    const valid = new Date(date); valid.setDate(valid.getDate() + 14);
    return {
      number: "SMP/QTN/" + dateKey + "/" + Math.random().toString(36).slice(2, 6).toUpperCase(),
      date: date.toISOString().slice(0, 10),
      validUntil: valid.toISOString().slice(0, 10),
      company: "", contact: "", email: "", phone: "", address: "",
      qty: 1000, price: PRICE_DEFAULT, discount: 0, shipping: 0, taxRate: 0,
      paymentTerms: "Sesuai kesepakatan",
      productionLeadTime: "Dikonfirmasi setelah desain dan spesifikasi disetujui",
      delivery: "Biaya dan alamat pengiriman dikonfirmasi terpisah",
      notes: "Kalender meja custom 2027; desain, bahan, finishing, dan spesifikasi mengikuti persetujuan final."
    };
  });
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [finderIndustry, setFinderIndustry] = useState("manufacturing");
  const [finderArea, setFinderArea] = useState("DKI Jakarta");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setLeads(Array.isArray(data.leads) ? data.leads : []);
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setSender(data.sender || "Tim Subur Maju Printing");
        setPhone(data.phone || "");
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ leads, expenses, sender, phone }));
  }, [leads, expenses, sender, phone, ready]);

  const selected = leads.find((lead) => lead.id === selectedId) || null;
  const filtered = useMemo(() => leads.filter((lead) => {
    const haystack = [lead.company, lead.industry, lead.area, lead.contact, lead.email].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (statusFilter === "Semua status" || lead.status === statusFilter);
  }), [leads, query, statusFilter]);

  const totalPipeline = leads.filter((x) => !["Won", "Lost", "Opt-out"].includes(x.status)).reduce((sum, x) => sum + (Number(x.qty) || 0) * (Number(x.price) || PRICE_DEFAULT), 0);
  const wonRevenue = leads.filter((x) => x.status === "Won").reduce((sum, x) => sum + (Number(x.poValue ?? ((Number(x.qty) || 0) * (Number(x.price) || PRICE_DEFAULT))) || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const commissionPayable = wonRevenue * 0.25;
  const grossProfit = wonRevenue - totalExpenses;
  const netProfit = grossProfit - commissionPayable;
  const interested = leads.filter((x) => ["Interested", "Negotiation"].includes(x.status)).length;
  const followups = leads.filter((x) => x.followup && x.followup <= today() && !["Won", "Lost", "Opt-out"].includes(x.status));

  function notify(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }
  function saveLead(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(form.entries());
    const lead = {
      ...data,
      id: editing?.id || makeId(),
      qty: Number(data.qty || 1000),
      price: Number(data.price || PRICE_DEFAULT),
      poValue: data.poValue === "" ? undefined : Number(data.poValue),
      status: data.status || "New",
      created: editing?.created || today(),
      updated: today()
    };
    setLeads((current) => editing ? current.map((x) => x.id === editing.id ? lead : x) : [lead, ...current]);
    setSelectedId(lead.id);
    setShowForm(false);
    setEditing(null);
    notify(editing ? "Prospek diperbarui" : "Prospek ditambahkan");
  }
  function removeLead(id) {
    if (!window.confirm("Hapus prospek ini dari perangkat ini?")) return;
    setLeads((current) => current.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId("");
    notify("Prospek dihapus");
  }
  function openEmail(lead) {
    setSelectedId(lead.id);
    setEmailDraft(makeEmail(lead, sender, phone));
    setActive("Studio email");
  }
  function updateStatus(id, status) {
    setLeads((current) => current.map((x) => x.id === id ? { ...x, status, updated: today() } : x));
  }
  function updateDealValue(id, value) {
    const parsed = value === "" ? undefined : Math.max(0, Number(value) || 0);
    setLeads((current) => current.map((x) => x.id === id ? { ...x, poValue: parsed, updated: today() } : x));
  }
  function markSent(lead) {
    setLeads((current) => current.map((x) => x.id === lead.id ? { ...x, status: "Contacted", sentDate: today(), followup: x.followup || new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) } : x));
    notify("Status diperbarui. Pastikan email memang sudah dikirim.");
  }
  async function copyText(value, label) {
    try { await navigator.clipboard.writeText(value); notify(label + " disalin"); }
    catch { notify("Clipboard tidak tersedia di browser ini"); }
  }
  function exportCsv() {
    const columns = ["id","company","industry","area","website","contact","role","email","source","sourceUrl","companySourceUrl","contactSourceUrl","emailSourceUrl","verificationStatus","verifiedAt","reason","qty","price","status","lastNarahubung","followup","notes"];
    const rows = [columns.join(","), ...leads.map((lead) => columns.map((key) => escCsv(lead[key])).join(","))];
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "subur-maju-prospects.csv"; a.click(); URL.revokeObjectURL(url);
  }
  function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result).split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return notify("CSV kosong atau tidak valid");
      const headers = lines[0].split(",").map((x) => x.replaceAll('"', "").trim());
      const imported = lines.slice(1).map((line) => {
        const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
        const values = cells.map((cell) => cell.replace(/,$/, "").replace(/^"|"$/g, "").replaceAll('""', '"'));
        const item = Object.fromEntries(headers.map((h, i) => [h, values[i] || ""]));
        return { ...item, id: item.id || makeId(), qty: Number(item.qty || 1000), price: Number(item.price || PRICE_DEFAULT), status: item.status || "New" };
      }).filter((x) => x.company);
      setLeads((current) => [...imported, ...current]);
      notify(imported.length + " baris diimpor");
    };
    reader.readAsText(file);
    event.target.value = "";
  }
  function gmailDraft() {
    if (!selected?.email) return notify("Tambahkan alamat email bisnis pada prospek terlebih dahulu");
    const url = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(selected.email) + "&su=" + encodeURIComponent(emailDraft.subject) + "&body=" + encodeURIComponent(emailDraft.body);
    window.open(url, "_blank", "noopener,noreferrer");
  }
  function setQuoteFromLead(lead) {
    setQuote((current) => ({ ...current, company: lead.company, contact: lead.contact || "", email: lead.email || "", phone: lead.phone || "", qty: Number(lead.qty || 1000), price: Number(lead.price || PRICE_DEFAULT), product: "Kalender Meja Custom 2027", notes: lead.notes || "Kalender meja custom 2027; desain, bahan, finishing, dan spesifikasi mengikuti persetujuan final." }));
    setActive("Penawaran harga");
  }

  const revenueQuote = Math.max(0, Number(quote.qty) || 0) * Math.max(0, Number(quote.price) || 0);
  const discountQuote = Math.min(revenueQuote, Math.max(0, Number(quote.discount) || 0));
  const taxableQuote = Math.max(0, revenueQuote - discountQuote);
  const taxQuote = taxableQuote * Math.max(0, Number(quote.taxRate) || 0) / 100;
  const shippingQuote = Math.max(0, Number(quote.shipping) || 0);
  const totalQuote = taxableQuote + taxQuote + shippingQuote;
  const commissionQuote = totalQuote * SALES_COMMISSION_RATE;
  const pricingBase = Math.max(0, revenueQuote - discountQuote);
  const pricingHpp = Math.max(0, Number(quote.qty) || 0) * UNIT_COST_DEFAULT;
  const pricingCommission = pricingBase * SALES_COMMISSION_RATE;
  const ownerContributionQuote = pricingBase - pricingHpp - pricingCommission;

  return (
    <main className="hub-shell">
      {mobileNav && <button className="mobile-nav-backdrop" aria-label="Tutup menu navigasi" onClick={() => setMobileNav(false)} />}
      <aside className={"hub-sidebar " + (mobileNav ? "hub-sidebar-open" : "")}>
        <a className="hub-brand" href="/"><span className="hub-brand-mark"><Printer size={19}/></span><span><b>SUBUR MAJU</b><small>SALES HUB</small></span></a>
        <div className="hub-workspace"><span className="workspace-dot"/> RUANG KERJA INTERNAL <ChevronDown size={13}/></div>
        <div className="hub-nav-label">MENU UTAMA</div>
        <nav className="hub-nav">
          {NAV.map(([label, Icon]) => <button key={label} className={active === label ? "hub-nav-item active" : "hub-nav-item"} onClick={() => { setActive(label); setMobileNav(false); }}><Icon size={17}/><span>{label}</span>{label === "Tindak lanjut" && followups.length > 0 && <i>{followups.length}</i>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><ShieldCheck size={16}/><span>Data tersimpan secara lokal pada browser dan perangkat ini.</span></div>
          <button className="hub-nav-item" onClick={() => setActive("Settings")}><Settings2 size={17}/> <span>Settings</span></button>
          <div className="hub-user"><span className="hub-avatar">SM</span><span><b>Subur Maju</b><small>Ruang kerja penjualan</small></span><MoreDots/></div>
        </div>
      </aside>

      <section className="hub-main">
        <header className="hub-topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? "Tutup menu" : "Buka menu"} aria-expanded={mobileNav}><Menu size={20}/></button>
          <div className="breadcrumb">Subur Maju <span>/</span> <b>{active}</b></div>
          <div className="topbar-actions"><span className="top-date"><CalendarClock size={14}/> {new Date().toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</span><button className="icon-button" title="Follow-up jatuh tempo" onClick={() => setActive("Tindak lanjut")}><Bell size={17}/>{followups.length > 0 && <i/>}</button><span className="top-avatar">SM</span></div>
        </header>

        <div className="hub-content">
          {active === "Overview" && <Overview leads={leads} totalPipeline={totalPipeline} wonRevenue={wonRevenue} interested={interested} followups={followups} onAdd={() => {setEditing(null);setShowForm(true);}} onNavigate={setActive} onEmail={openEmail} />}
          {active === "Pencarian perusahaan" && <CompanyFinder industry={finderIndustry} setIndustry={setFinderIndustry} area={finderArea} setArea={setFinderArea} onAdd={(industry, area, research={}) => {setEditing({company:"",industry,area,qty:1000,price:PRICE_DEFAULT,status:"New",...research});setShowForm(true);}} />}
          {active === "Database prospek" && <section className="hub-page">
            <PageHeading eyebrow="DATABASE CALON PELANGGAN" title="Database prospek" description="Kelola data perusahaan target, narahubung, sumber informasi, dan potensi kebutuhan kalender meja." action={<button className="btn-primary" onClick={() => {setEditing(null);setShowForm(true);}}><Plus size={16}/> Tambah prospek</button>}/>
            <div className="toolbar"><label className="search-field"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama perusahaan, industri, atau narahubung..."/></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>Semua status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><button className="btn-secondary" onClick={exportCsv}><Download size={15}/> Ekspor CSV</button><label className="btn-secondary file-import"><ArrowDownToLine size={15}/> Impor CSV<input type="file" accept=".csv,text/csv" onChange={importCsv}/></label></div>
            <div className="table-wrap"><table className="prospect-table"><thead><tr><th>Perusahaan</th><th>Narahubung</th><th>Industri / wilayah</th><th>Estimasi nilai pesanan</th><th>Status</th><th>Jadwal tindak lanjut</th><th/></tr></thead><tbody>
              {filtered.map((lead) => <tr key={lead.id}><td><button className="company-cell" onClick={() => {setSelectedId(lead.id);setEditing(lead);setShowForm(true);}}><b>{lead.company}</b><small>{lead.website || lead.id}</small></button></td><td><b>{lead.contact || "—"}</b><small>{lead.email || "Email belum tersedia"} · {lead.verificationStatus || "Belum diverifikasi"}</small></td><td>{lead.industry || "—"}<small>{lead.area || "Jakarta"}</small></td><td><b>{Number(lead.qty || 0).toLocaleString("id-ID")} pcs</b><small>{money(Number(lead.qty || 0)*Number(lead.price || PRICE_DEFAULT))}</small></td><td><StatusPill status={lead.status}/></td><td>{lead.followup || "—"}</td><td><div className="row-actions"><button title="Buat draft email" onClick={() => openEmail(lead)}><Mail size={15}/></button><button title="Buat dokumen penawaran" onClick={() => setQuoteFromLead(lead)}><FileText size={15}/></button><button title="Hapus prospek" onClick={() => removeLead(lead.id)}><Trash2 size={15}/></button></div></td></tr>)}
              {!filtered.length && <tr><td colSpan="7"><EmptyState title="Belum ada data prospek" text="Tambahkan perusahaan atau impor daftar CSV untuk mulai mengelola peluang penjualan." action={<button className="btn-primary" onClick={() => {setEditing(null);setShowForm(true);}}><Plus size={15}/> Tambah prospek pertama</button>}/></td></tr>}
            </tbody></table></div>
            <div className="table-foot">{filtered.length} prospek ditampilkan <span>Data tersimpan pada browser dan perangkat ini</span></div>
          </section>}
          {active === "Pipeline penjualan" && <section className="hub-page">
            <PageHeading eyebrow="PENGELOLAAN PENJUALAN" title="Pipeline penjualan" description="Pantau estimasi nilai peluang dan nilai transaksi yang telah disepakati. Perbarui nilai aktual setelah penawaran final atau PO diterbitkan." action={<button className="btn-primary" onClick={() => {setEditing(null);setShowForm(true);}}><Plus size={16}/> Tambah prospek</button>}/>
            <div className="pipeline-value-summary">
              <article><span>Total estimasi peluang aktif</span><b>{money(leads.filter(x=>!["Won","Lost","Opt-out"].includes(x.status)).reduce((a,x)=>a+(Number(x.qty||0)*Number(x.price||PRICE_DEFAULT)),0))}</b></article>
              <article><span>Nilai aktual peluang aktif</span><b>{money(leads.filter(x=>!["Won","Lost","Opt-out"].includes(x.status)&&x.poValue!==undefined&&x.poValue!=="").reduce((a,x)=>a+(Number(x.poValue)||0),0))}</b></article>
              <article><span>Nilai PO dari deal berhasil</span><b>{money(wonRevenue)}</b></article>
            </div>
            <div className="pipeline-grid">{["New","Qualified","Draft ready","Contacted","Interested","Negotiation","Won"].map((status) => <div className="pipeline-column" key={status}><div className="pipeline-col-head"><span>{status}</span><b>{leads.filter((x) => x.status === status).length}</b></div>{leads.filter((x) => x.status === status).map((lead) => {const estimate=Number(lead.qty||0)*Number(lead.price||PRICE_DEFAULT);const hasActual=lead.poValue!==undefined&&lead.poValue!=="";return <article className="pipeline-card" key={lead.id}><b>{lead.company}</b><small>{lead.industry || "Industri belum ditentukan"} · {Number(lead.qty || 0).toLocaleString("id-ID")} pcs</small><div className="pipeline-estimate"><span>Estimasi nilai</span><strong>{money(estimate)}</strong></div><label className="pipeline-actual-field"><span>Nilai deal aktual (Rp)</span><input type="number" min="0" step="1000" value={hasActual?lead.poValue:""} placeholder="Belum diisi" onChange={e=>updateDealValue(lead.id,e.target.value)}/></label><span className={hasActual?"pipeline-value-status actual":"pipeline-value-status"}>{hasActual?"Nilai aktual tersimpan":"Masih menggunakan estimasi"}</span><select value={lead.status} onChange={(e) => updateStatus(lead.id,e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><button className="text-action" onClick={() => openEmail(lead)}>Buka draft email <ArrowUpRight size={13}/></button></article>})}</div>)}</div>
            <p className="muted-help">Isi nilai aktual saat harga final sudah disepakati. Untuk deal Won, nilai PO aktual menjadi dasar omzet dan komisi Keuangan. Kosongkan jika belum ada angka final. Lost dan Opt-out tidak ditampilkan sebagai kolom peluang aktif.</p>
          </section>}
          {active === "Studio email" && <section className="hub-page">
            <PageHeading eyebrow="PENDEKATAN PROSPEK" title="Studio email" description="Susun pesan yang relevan untuk setiap perusahaan, tinjau kembali detailnya, lalu kirim secara manual melalui Gmail."/>
            <div className="email-layout"><div className="panel email-config"><div className="panel-head"><div><b>Penerima dan konteks</b><small>Pilih prospek dari database</small></div><Mail size={18}/></div><label className="field-label">Pilih prospek<select value={selectedId} onChange={(e) => {setSelectedId(e.target.value);const item=leads.find((x)=>x.id===e.target.value);if(item)setEmailDraft(makeEmail(item,sender,phone));}}><option value="">Pilih perusahaan...</option>{leads.filter((x) => x.status !== "Opt-out").map((x) => <option value={x.id} key={x.id}>{x.company} — {x.contact || "Narahubung belum diisi"}</option>)}</select></label>{selected ? <div className="recipient-card"><span className="recipient-icon"><Building2 size={18}/></span><span><b>{selected.company}</b><small>{selected.email || "Email belum diisi"} · {selected.industry || "Industri belum ditentukan"}</small></span><StatusPill status={selected.status}/></div> : <div className="inline-empty">Pilih prospek untuk membuat draft email.</div>}<div className="field-note"><ShieldCheck size={15}/> Email tidak dikirim secara otomatis. Tinjau kembali isi draft, lalu kirim secara manual melalui Gmail.</div></div>
              <div className="panel email-editor"><div className="panel-head"><div><b>Editor pesan</b><small>Periksa kembali sebelum mengirim</small></div><span className="draft-tag">DRAFT</span></div><label className="field-label">Subjek<input value={emailDraft.subject} onChange={(e) => setEmailDraft({...emailDraft,subject:e.target.value})} placeholder="Subjek email"/></label><label className="field-label">Isi email<textarea rows="15" value={emailDraft.body} onChange={(e) => setEmailDraft({...emailDraft,body:e.target.value})} placeholder="Pilih prospek untuk membuat draft email..."/></label><div className="editor-actions"><button className="btn-secondary" disabled={!emailDraft.body} onClick={() => copyText("Subjek: "+emailDraft.subject+"\n\n"+emailDraft.body,"Draft email")}><Copy size={15}/> Salin draft</button><button className="btn-primary" disabled={!selected || !selected.email || !emailDraft.body} onClick={gmailDraft}><Mail size={15}/> Buka draft di Gmail <ArrowUpRight size={14}/></button><button className="btn-quiet" disabled={!selected} onClick={() => markSent(selected)}><Check size={15}/> Tandai telah dikirim</button></div></div></div>
          </section>}
          {active === "Tindak lanjut" && <section className="hub-page"><PageHeading eyebrow="AGENDA TINDAK LANJUT" title="Agenda tindak lanjut" description="Kelola jadwal komunikasi dengan konsisten. Hentikan tindak lanjut apabila perusahaan menolak penawaran atau meminta untuk tidak dihubungi kembali."/><div className="followup-list">{leads.filter((x) => x.followup && !["Won","Lost","Opt-out"].includes(x.status)).sort((a,b)=>a.followup.localeCompare(b.followup)).map((lead) => <div className="followup-row" key={lead.id}><div className="followup-date"><b>{new Date(lead.followup+"T00:00:00").getDate()}</b><small>{new Date(lead.followup+"T00:00:00").toLocaleDateString("id-ID",{month:"short"})}</small></div><div className="followup-info"><b>{lead.company}</b><small>{lead.contact || "Narahubung belum diisi"} · {lead.email || "Email belum diisi"}</small></div><StatusPill status={lead.status}/><span className={lead.followup <= today() ? "due-label overdue" : "due-label"}>{lead.followup <= today() ? "Jatuh tempo" : "Akan datang"} · {lead.followup}</span><button className="btn-secondary" onClick={() => openEmail(lead)}><Mail size={14}/> Draft</button></div>)}{!leads.some((x)=>x.followup && !["Won","Lost","Opt-out"].includes(x.status)) && <EmptyState title="Belum ada follow-up terjadwal" text="Set tanggal follow-up saat mengedit prospek atau setelah mengirim email pertama."/>}</div></section>}
          {active === "Keuangan" && <Keuangan leads={leads} expenses={expenses} setExpenses={setExpenses} wonRevenue={wonRevenue} totalExpenses={totalExpenses} commissionPayable={commissionPayable} grossProfit={grossProfit} netProfit={netProfit} notify={notify} />}
          {active === "Penawaran harga" && <section className="hub-page">
            <PageHeading eyebrow="DOKUMEN PENAWARAN" title="Penyusunan penawaran harga" description="Siapkan dokumen penawaran resmi, hitung diskon, pajak, dan biaya pengiriman, lalu cetak atau simpan dalam format PDF." action={<button className="btn-secondary" onClick={() => { const d = new Date(); const v = new Date(d); v.setDate(v.getDate()+14); setQuote({number:"SMP/QTN/"+d.toISOString().slice(0,10).replaceAll("-","")+"/"+Math.random().toString(36).slice(2,6).toUpperCase(),date:d.toISOString().slice(0,10),validUntil:v.toISOString().slice(0,10),company:"",contact:"",email:"",phone:"",address:"",qty:1000,price:PRICE_DEFAULT,discount:0,shipping:0,taxRate:0,paymentTerms:"Sesuai kesepakatan",productionLeadTime:"Dikonfirmasi setelah desain dan spesifikasi disetujui",delivery:"Biaya dan alamat pengiriman dikonfirmasi terpisah",notes:"Kalender meja custom 2027; desain, bahan, finishing, dan spesifikasi mengikuti persetujuan final."}); }}><Plus size={15}/> Buat penawaran baru</button>}/>
            <section className="pricing-playbook">
               <div className="pricing-playbook-head">
                 <div><span className="page-eyebrow">PANDUAN HARGA INTERNAL</span><h2>Harga B2B kalender meja 2027</h2><p>Harga indikatif untuk diskusi awal. Finalisasi tetap mengikuti spesifikasi dan persetujuan owner.</p></div>
                 <span className="pricing-assumption">Asumsi HPP Rp15.000/pcs · Komisi 25% omzet</span>
               </div>
               <div className="pricing-tier-grid">
                 <article className="pricing-tier featured"><span>DEFAULT · STANDARD CORPORATE</span><b>Rp27.500<small>/pcs</small></b><p>Paket pembuka untuk kebutuhan corporate dengan spesifikasi standar yang disepakati.</p><button type="button" onClick={() => setQuote({...quote,price:PRICE_DEFAULT,product:"Kalender Meja Custom 2027 — Standard Corporate"})}>Gunakan harga ini</button></article>
                 <article className="pricing-tier"><span>CORPORATE PLUS</span><b>Rp34.900<small>/pcs</small></b><p>Untuk kebutuhan material atau finishing dengan nilai tambah.</p><button type="button" onClick={() => setQuote({...quote,price:PRICE_PLUS,product:"Kalender Meja Custom 2027 — Corporate Plus"})}>Gunakan harga ini</button></article>
                 <article className="pricing-tier"><span>EXECUTIVE PREMIUM</span><b>Rp49.900–68.000</b><p>Untuk spesifikasi premium, material, finishing, dan packaging khusus.</p><button type="button" onClick={() => setQuote({...quote,price:PRICE_PREMIUM_MIN,product:"Kalender Meja Custom 2027 — Executive Premium"})}>Mulai Rp49.900</button></article>
                 <article className="pricing-tier floor"><span>BATAS NEGOSIASI</span><b>Rp24.000<small>/pcs</small></b><p>Target kontribusi owner Rp3 juta pada 1.000 pcs. Wajib persetujuan owner sebelum ditawarkan.</p><button type="button" onClick={() => setQuote({...quote,price:PRICE_FLOOR,product:"Kalender Meja Custom 2027 — Standard Corporate"})}>Set harga minimum</button></article>
               </div>
               <div className="pricing-margin">
                 <div><span>Omzet produk</span><b>{money(pricingBase)}</b></div>
                 <div><span>Estimasi HPP</span><b>− {money(pricingHpp)}</b></div>
                 <div><span>Komisi sales 25%</span><b>− {money(pricingCommission)}</b></div>
                 <div className={ownerContributionQuote < 0 ? "owner-contribution negative" : "owner-contribution"}><span>Sisa kontribusi owner*</span><b>{money(ownerContributionQuote)}</b></div>
               </div>
               <small className="pricing-footnote">*Simulasi sebelum overhead, pajak, ongkir, biaya desain, dan biaya lain. Berdasarkan HPP Rp15.000/pcs dan komisi 25% dari nilai produk setelah diskon; bukan persetujuan harga final.</small>
             </section>
             <div className="quote-layout">
              <div className="panel quote-form">
                <div className="panel-head"><div><b>Penawaran harga details</b><small>Lengkapi informasi sebelum penawaran dikirim kepada calon pelanggan.</small></div><FileText size={18}/></div>
                <div className="quote-form-section"><b>Dokumen</b><div className="field-row">
                  <label className="field-label">Penawaran harga number<input value={quote.number} onChange={e=>setQuote({...quote,number:e.target.value})}/></label>
                  <label className="field-label">Penawaran harga date<input type="date" value={quote.date} onChange={e=>setQuote({...quote,date:e.target.value})}/></label>
                  <label className="field-label">Berlaku hingga<input type="date" value={quote.validUntil} onChange={e=>setQuote({...quote,validUntil:e.target.value})}/></label>
                </div></div>
                <div className="quote-form-section"><b>Informasi pelanggan</b>
                  <label className="field-label">Perusahaan name<input value={quote.company} onChange={e=>setQuote({...quote,company:e.target.value})} placeholder="Nama perusahaan"/></label>
                  <label className="field-label">Narahubung (PIC)<input value={quote.contact} onChange={e=>setQuote({...quote,contact:e.target.value})} placeholder="Nama PIC"/></label>
                  <label className="field-label">Email perusahaan<input type="email" value={quote.email} onChange={e=>setQuote({...quote,email:e.target.value})} placeholder="procurement@perusahaan.co.id"/></label>
                  <label className="field-label">Telepon / WhatsApp<input value={quote.phone} onChange={e=>setQuote({...quote,phone:e.target.value})} placeholder="+62..."/></label>
                  <label className="field-label">Alamat perusahaan<textarea rows="2" value={quote.address} onChange={e=>setQuote({...quote,address:e.target.value})} placeholder="Alamat perusahaan"/></label>
                </div>
                <div className="quote-form-section"><b>Produk dan harga</b>
                  <label className="field-label">Deskripsi produk<input value={quote.product || "Kalender Meja Custom 2027"} onChange={e=>setQuote({...quote,product:e.target.value})}/></label>
                  <div className="field-row">
                    <label className="field-label">Jumlah (pcs)<input type="number" min="1" value={quote.qty} onChange={e=>setQuote({...quote,qty:e.target.value})}/></label>
                    <label className="field-label">Harga per pcs (Rp)<input type="number" min="0" value={quote.price} onChange={e=>setQuote({...quote,price:e.target.value})}/>{Number(quote.price) < PRICE_FLOOR && <small className="price-floor-warning">Di bawah batas negosiasi Rp24.000/pcs. Minta persetujuan owner sebelum penawaran.</small>}</label>
                    <label className="field-label">Diskon (Rp)<input type="number" min="0" value={quote.discount} onChange={e=>setQuote({...quote,discount:e.target.value})}/></label>
                    <label className="field-label">Tarif pajak (%)<input type="number" min="0" max="100" step="0.01" value={quote.taxRate} onChange={e=>setQuote({...quote,taxRate:e.target.value})}/></label>
                    <label className="field-label">Biaya pengiriman (Rp)<input type="number" min="0" value={quote.shipping} onChange={e=>setQuote({...quote,shipping:e.target.value})}/></label>
                  </div>
                  <div className="quote-calculation"><span>Subtotal</span><b>{money(revenueQuote)}</b><span>Diskon</span><b>− {money(discountQuote)}</b><span>Tax ({Number(quote.taxRate)||0}%)</span><b>{money(taxQuote)}</b><span>Pengiriman</span><b>{money(shippingQuote)}</b><strong>Total penawaran</strong><strong>{money(totalQuote)}</strong></div>
                </div>
                <div className="quote-form-section"><b>Produksi dan ketentuan</b>
                  <label className="field-label">Ketentuan pembayaran<input value={quote.paymentTerms} onChange={e=>setQuote({...quote,paymentTerms:e.target.value})} placeholder="Contoh: 50% DP, pelunasan sebelum pengiriman"/></label>
                  <label className="field-label">Estimasi waktu produksi<input value={quote.productionLeadTime} onChange={e=>setQuote({...quote,productionLeadTime:e.target.value})}/></label>
                  <label className="field-label">Ketentuan pengiriman<input value={quote.delivery} onChange={e=>setQuote({...quote,delivery:e.target.value})}/></label>
                  <label className="field-label">Spesifikasi produk dan catatan<textarea rows="4" value={quote.notes} onChange={e=>setQuote({...quote,notes:e.target.value})}/></label>
                </div>
                <div className="quote-tip"><ShieldCheck size={15}/> Tarif pajak, diskon, biaya kirim, termin pembayaran, dan waktu produksi harus diverifikasi sebelum penawaran diterbitkan. Default pajak dan diskon adalah 0.</div>
                <button className="btn-primary full-button" onClick={()=>window.print()}><Printer size={16}/> Cetak / Simpan PDF</button>
              </div>
              <div className="quote-preview">
                <div className="quote-paper">
                  <div className="quote-paper-head"><div className="quote-logo"><Printer size={17}/><b>SUBUR MAJU PRINTING</b></div><span>QUOTATION · 2027</span></div>
                  <div className="quote-doc-meta"><div><small>QUOTATION NO.</small><b>{quote.number}</b></div><div><small>ISSUED DATE</small><b>{quote.date ? new Date(quote.date+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}) : "—"}</b></div><div><small>VALID UNTIL</small><b>{quote.validUntil ? new Date(quote.validUntil+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}) : "—"}</b></div></div>
                  <div className="quote-title"><small>PENAWARAN HARGA RESMI</small><h2>Kalender Meja<br/><em>Custom 2027</em></h2><p>Penawaran kalender meja untuk kebutuhan merchandise dan identitas merek perusahaan.</p></div>
                  <div className="quote-customer"><div><small>DITUJUKAN KEPADA</small><b>{quote.company || "Nama Perusahaan"}</b><span>{quote.contact ? "Attn. "+quote.contact : "Attn. Procurement / Marketing"}</span>{quote.email && <span>{quote.email}</span>}{quote.phone && <span>{quote.phone}</span>}{quote.address && <span>{quote.address}</span>}</div><div><small>DISIAPKAN OLEH</small><b>Subur Maju Printing</b><span>Digital Printing & Custom Merchandise</span><span>Jakarta, Indonesia</span></div></div>
                  <div className="quote-table">
                    <div className="quote-table-head"><span>DESKRIPSI</span><span>JUMLAH</span><span>HARGA SATUAN</span><span>TOTAL</span></div>
                    <div className="quote-table-row"><b>{quote.product || "Kalender Meja Custom 2027"}</b><span>{Number(quote.qty||0).toLocaleString("id-ID")} pcs</span><span>{money(quote.price)}</span><strong>{money(revenueQuote)}</strong></div>
                  </div>
                  <div className="quote-totals"><div><span>Subtotal</span><b>{money(revenueQuote)}</b></div>{discountQuote>0 && <div><span>Diskon</span><b>− {money(discountQuote)}</b></div>}{taxQuote>0 && <div><span>Tax ({Number(quote.taxRate)||0}%)</span><b>{money(taxQuote)}</b></div>}{shippingQuote>0 && <div><span>Pengiriman</span><b>{money(shippingQuote)}</b></div>}<div className="grand-total"><span>TOTAL PENAWARAN</span><b>{money(totalQuote)}</b></div></div>
                  <div className="quote-terms"><div><small>KETENTUAN PEMBAYARAN</small><p>{quote.paymentTerms || "—"}</p></div><div><small>ESTIMASI WAKTU PRODUKSI</small><p>{quote.productionLeadTime || "—"}</p></div><div><small>PENGIRIMAN</small><p>{quote.delivery || "—"}</p></div></div>
                  <div className="quote-notes"><small>SPESIFIKASI PRODUK DAN CATATAN</small><p>{quote.notes || "—"}</p><p>Harga dan jadwal produksi mengikuti spesifikasi final yang disetujui kedua belah pihak. Perubahan jumlah, desain, bahan, finishing, kemasan, atau tujuan pengiriman dapat memengaruhi nilai penawaran.</p></div>
                  <div className="quote-signatures"><div><small>PERSETUJUAN PELANGGAN</small><span>Nama, jabatan, dan tanda tangan</span><i/></div><div><small>SUBUR MAJU PRINTING</small><span>Perwakilan yang berwenang</span><i/></div></div>
                  <div className="quote-paper-foot"><b>Subur Maju Printing</b><span>Terima kasih atas kepercayaan dan kesempatan yang diberikan kepada kami.</span></div>
                </div>
                <div className="commission-card"><span>SIMULASI KOMISI INTERNAL · 25%</span><b>{money(commissionQuote)}</b><small>Simulasi komisi sebesar 25% dari nilai PO atau total penawaran. Nilai komisi final mengikuti nilai PO yang disepakati. Informasi ini hanya untuk keperluan internal dan tidak ditampilkan pada dokumen penawaran pelanggan.</small></div>
              </div>
            </div>
          </section>}
          {active === "Settings" && <section className="hub-page"><PageHeading eyebrow="PREFERENSI WORKSPACE" title="Pengaturan" description="Atur identitas pengirim untuk draft email dan kelola penyimpanan data pada perangkat ini."/><div className="panel settings-panel"><label className="field-label">Nama pengirim<input value={sender} onChange={(e)=>setSender(e.target.value)}/></label><label className="field-label">WhatsApp bisnis<input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+62..."/></label><div className="field-note"><ShieldCheck size={15}/> Data prospek hanya tersimpan di local storage browser ini. Belum ada login server, sinkronisasi tim, atau backup cloud.</div><div className="settings-actions"><button className="btn-secondary" onClick={exportCsv}><Download size={15}/> Cadangkan data prospek (CSV)</button><button className="btn-quiet danger" onClick={()=>{if(window.confirm("Hapus seluruh data lokal di browser ini?")){setLeads([]);setSelectedId("");notify("Data lokal dihapus");}}}><Trash2 size={15}/> Hapus seluruh data lokal</button></div></div></section>}
        </div>
        <footer className="hub-footer"><span>SUBUR MAJU PRINTING · INTERNAL SALES MENU UTAMA</span><span>Kampanye Kalender Meja 2027</span></footer>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget){setShowForm(false);setEditing(null);}}}><form className="lead-modal" onSubmit={saveLead}><div className="modal-head"><div><small>DATA PROSPEK</small><h2>{editing ? "Edit prospect" : "Add new prospect"}</h2></div><button type="button" className="icon-button" onClick={()=>{setShowForm(false);setEditing(null);}}><X size={18}/></button></div><div className="form-grid">
        <label className="field-label span-two">Perusahaan name *<input name="company" required defaultValue={editing?.company || ""} placeholder="Nama perusahaan"/></label>
        <label className="field-label">Industry<input name="industry" defaultValue={editing?.industry || ""} placeholder="Manufacturing, property..."/></label><label className="field-label">Area<input name="area" defaultValue={editing?.area || "Jakarta"} placeholder="Jakarta Timur"/></label>
        <label className="field-label">PIC name<input name="contact" defaultValue={editing?.contact || ""} placeholder="Nama kontak"/></label><label className="field-label">PIC role<input name="role" defaultValue={editing?.role || ""} placeholder="Procurement / Marketing"/></label>
        <label className="field-label span-two">Email perusahaan<input type="email" name="email" defaultValue={editing?.email || ""} placeholder="nama@perusahaan.co.id"/></label>
        <label className="field-label span-two">Website<input name="website" defaultValue={editing?.website || ""} placeholder="https://..."/></label>
        <label className="field-label">Perusahaan LinkedIn<input name="companyLinkedin" defaultValue={editing?.companyLinkedin || ""} placeholder="https://linkedin.com/company/..."/></label><label className="field-label">LinkedIn narahubung<input name="contactLinkedin" defaultValue={editing?.contactLinkedin || ""} placeholder="https://linkedin.com/in/..."/></label>
        <label className="field-label">Nomor telepon narahubung<input name="contactPhone" defaultValue={editing?.contactPhone || ""} placeholder="Nomor bisnis publik"/></label><label className="field-label">Perusahaan size<input name="companySize" defaultValue={editing?.companySize || ""} placeholder="500–1.000 karyawan"/></label>
        <label className="field-label span-two">Lokasi cabang / kantor<input name="footprint" defaultValue={editing?.footprint || ""} placeholder="20 cabang di Indonesia"/></label>
        <label className="field-label span-two">Ringkasan riset<input name="researchSummary" defaultValue={editing?.researchSummary || ""} placeholder="Profil bisnis, aktivitas, indikasi kebutuhan kalender..."/></label>
        <label className="field-label span-two">Narahubung / company source URL<input name="sourceUrl" defaultValue={editing?.sourceUrl || ""} placeholder="URL halaman resmi / profil PIC / direktori publik"/></label>
        <label className="field-label">Perusahaan source URL<input name="companySourceUrl" defaultValue={editing?.companySourceUrl || ""} placeholder="Website / profil resmi"/></label><label className="field-label">Sumber informasi narahubung<input name="contactSourceUrl" defaultValue={editing?.contactSourceUrl || ""} placeholder="Profil / halaman tim"/></label>
        <label className="field-label span-two">Sumber informasi email<input name="emailSourceUrl" defaultValue={editing?.emailSourceUrl || ""} placeholder="Halaman resmi yang mempublikasikan email"/></label>
        <label className="field-label">Status verifikasi<select name="verificationStatus" defaultValue={editing?.verificationStatus || "Belum diverifikasi"}><option>Belum diverifikasi</option><option>Terverifikasi sebagian</option><option>Terverifikasi</option><option>Perlu ditinjau</option></select></label><label className="field-label">Tanggal verifikasi terakhir<input type="date" name="verifiedAt" defaultValue={editing?.verifiedAt || ""}/></label>
        <label className="field-label">Sumber prospek<input name="source" defaultValue={editing?.source || ""} placeholder="Website, referral, LinkedIn..."/></label><label className="field-label">Status<select name="status" defaultValue={editing?.status || "New"}>{STATUSES.map((s)=><option key={s}>{s}</option>)}</select></label>
        <label className="field-label">Estimasi jumlah pesanan<input type="number" min="1" name="qty" defaultValue={editing?.qty || 1000}/></label><label className="field-label">Harga per pcs (Rp)<input type="number" min="1" name="price" defaultValue={editing?.price || PRICE_DEFAULT}/></label>
        <label className="field-label span-two">Nilai PO final (Rp)<input type="number" min="0" name="poValue" defaultValue={editing?.poValue ?? ""} placeholder="Kosongkan untuk hitung qty × harga"/></label>
        <label className="field-label">Kontak terakhir<input type="date" name="lastNarahubung" defaultValue={editing?.lastNarahubung || ""}/></label><label className="field-label">Jadwal tindak lanjut<input type="date" name="followup" defaultValue={editing?.followup || ""}/></label>
        <label className="field-label span-two">Alasan perusahaan ini berpotensi menjadi pelanggan<textarea name="reason" rows="2" defaultValue={editing?.reason || ""} placeholder="Tuliskan alasan yang benar-benar sudah diverifikasi."/></label>
        <label className="field-label span-two">Catatan<textarea name="notes" rows="2" defaultValue={editing?.notes || ""} placeholder="Kebutuhan, respons, catatan riset..."/></label>
      </div><div className="modal-actions"><button type="button" className="btn-secondary" onClick={()=>{setShowForm(false);setEditing(null);}}>Batal</button><button className="btn-primary" type="submit"><Check size={15}/> Simpan prospek</button></div></form></div>}
      {notice && <div className="toast"><Check size={16}/>{notice}</div>}
    </main>
  );
}


function Keuangan({leads,expenses,setExpenses,wonRevenue,totalExpenses,commissionPayable,grossProfit,netProfit,notify}) {
  const [form,setForm] = useState({date:today(),company:"",category:"Produksi",description:"",amount:""});
  const won = leads.filter((x)=>x.status==="Won");
  function addExpense(e) {
    e.preventDefault();
    if (!form.description.trim() || Number(form.amount)<=0) return notify("Isi keterangan dan nominal biaya yang valid");
    setExpenses((items)=>[{...form,id:makeId(),amount:Number(form.amount)},...items]);
    setForm({...form,company:"",description:"",amount:""});
    notify("Pengeluaran berhasil dicatat");
  }
  function removeExpense(id) {
    if (!window.confirm("Hapus catatan biaya ini?")) return;
    setExpenses((items)=>items.filter((x)=>x.id!==id));
  }
  return <section className="hub-page">
    <PageHeading eyebrow="FINANCIAL CONTROL" title="Revenue, costs & profit" description="Omzet diakui dari nilai PO pada deal Won. Komisi dihitung 25% dari nilai PO, bukan dari pembayaran masuk."/>
    <div className="finance-metrics">
      <article className="metric-card"><span>Omzet · nilai PO</span><b>{money(wonRevenue)}</b><small>{won.length} deal Won</small></article>
      <article className="metric-card"><span>Total biaya tercatat</span><b>{money(totalExpenses)}</b><small>Produksi dan operasional</small></article>
      <article className="metric-card"><span>Laba kotor</span><b>{money(grossProfit)}</b><small>Omzet dikurangi biaya</small></article>
      <article className="metric-card"><span>Komisi · 25%</span><b>{money(commissionPayable)}</b><small>Dihitung berdasarkan total nilai PO</small></article>
      <article className="metric-card finance-net"><span>Laba setelah komisi</span><b>{money(netProfit)}</b><small>Laba kotor dikurangi komisi</small></article>
    </div>
    <div className="finance-layout">
      <div className="panel">
        <div className="panel-head"><div><b>Catat pengeluaran</b><small>Catat biaya yang benar-benar dikeluarkan, bukan perkiraan.</small></div><CircleDollarSign size={18}/></div>
        <form className="finance-form" onSubmit={addExpense}>
          <label className="field-label">Tanggal<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
          <label className="field-label">Kategori<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Produksi</option><option>Bahan baku</option><option>Finishing</option><option>Packaging</option><option>Pengiriman</option><option>Iklan / marketing</option><option>Operasional</option><option>Lainnya</option></select></label>
          <label className="field-label">Perusahaan / deal (opsional)<select value={form.company} onChange={e=>setForm({...form,company:e.target.value})}><option value="">Umum / tidak terkait deal</option>{won.map(x=><option key={x.id} value={x.company}>{x.company}</option>)}</select></label>
          <label className="field-label">Keterangan<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Contoh: cetak isi kalender 1.000 pcs"/></label>
          <label className="field-label">Nominal biaya (Rp)<input type="number" min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0"/></label>
          <button className="btn-primary full-button" type="submit"><Plus size={15}/> Simpan biaya</button>
        </form>
      </div>
      <div className="panel finance-breakdown">
        <div className="panel-head"><div><b>Ringkasan perhitungan</b><small>Berbasis nilai PO deal Won</small></div></div>
        <div><span>Revenue PO</span><b>{money(wonRevenue)}</b></div><div><span>Biaya tercatat</span><b>− {money(totalExpenses)}</b></div><div className="finance-subtotal"><span>Laba kotor</span><b>{money(grossProfit)}</b></div><div><span>Komisi 25% dari PO</span><b>− {money(commissionPayable)}</b></div><div className="finance-total"><span>Laba setelah komisi</span><b>{money(netProfit)}</b></div>
        <p className="muted-help">Profit ini masih berupa estimasi berdasarkan biaya yang sudah kamu input. Biaya yang belum dicatat akan membuat profit terlihat lebih tinggi dari kondisi sebenarnya.</p>
      </div>
    </div>
    <div className="panel finance-ledger"><div className="panel-head"><div><b>Deal yang sudah Won</b><small>Nilai PO menjadi dasar omzet dan komisi</small></div></div>
      <div className="table-wrap"><table className="prospect-table"><thead><tr><th>Perusahaan</th><th>Quantity</th><th>Nilai PO</th><th>Komisi 25%</th></tr></thead><tbody>{won.map(x=>{const po=Number(x.poValue ?? (Number(x.qty||0)*Number(x.price||PRICE_DEFAULT)))||0;return <tr key={x.id}><td><b>{x.company}</b></td><td>{Number(x.qty||0).toLocaleString("id-ID")} pcs</td><td><b>{money(po)}</b></td><td>{money(po*.25)}</td></tr>})}{!won.length&&<tr><td colSpan="4"><EmptyState title="Belum ada PO Won" text="Ubah status prospek menjadi Won setelah purchase order disepakati."/></td></tr>}</tbody></table></div>
    </div>
    <div className="panel finance-ledger"><div className="panel-head"><div><b>Expense ledger</b><small>{expenses.length} catatan biaya · tersimpan di browser ini</small></div><b>{money(totalExpenses)}</b></div>
      <div className="table-wrap"><table className="prospect-table"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Perusahaan</th><th>Keterangan</th><th>Nominal</th><th/></tr></thead><tbody>{expenses.map(x=><tr key={x.id}><td>{x.date}</td><td>{x.category}</td><td>{x.company||"Umum"}</td><td>{x.description}</td><td><b>{money(x.amount)}</b></td><td><button className="btn-quiet danger" onClick={()=>removeExpense(x.id)}><Trash2 size={14}/></button></td></tr>)}{!expenses.length&&<tr><td colSpan="6"><EmptyState title="Belum ada biaya" text="Catat pengeluaran produksi dan operasional untuk menghitung profit yang lebih akurat."/></td></tr>}</tbody></table></div>
    </div>
    <div className="quote-tip"><ShieldCheck size={15}/> Komisi dihitung dari nilai PO final (termasuk komponen yang tercantum dalam PO), 25%. Pencatatan pembayaran/DP belum dipisahkan sebagai cash flow pada versi ini.</div>
  </section>;
}

function MoreDots() { return <span className="more-dots">•••</span>; }
function PageHeading({eyebrow,title,description,action}) { return <div className="page-heading"><div><span className="page-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function StatusPill({status}) { const cls = String(status||"New").toLowerCase().replaceAll(" ","-"); return <span className={"status-pill status-"+cls}>{status || "New"}</span>; }
function EmptyState({title,text,action}) { return <div className="empty-state"><span className="empty-icon"><ClipboardList size={20}/></span><b>{title}</b><p>{text}</p>{action}</div>; }


function CompanyFinder({industry,setIndustry,area,setArea,onAdd}) {
  const [companyName,setPerusahaanName] = useState("");
  const [companyDomain,setPerusahaanDomain] = useState("");
  const [picName,setPicName] = useState("");
  const [picRole,setPicRole] = useState("");
  const [companySourceUrl,setPerusahaanSourceUrl] = useState("");
  const [contactSourceUrl,setNarahubungSourceUrl] = useState("");
  const [emailSourceUrl,setEmailSourceUrl] = useState("");
  const [researchCatatan,setResearchCatatan] = useState("");
  const labels = {
    manufacturing:"manufacturing companies and factories",
    property:"property developers and real estate companies",
    finance:"banks, insurance and financial services companies",
    hospitality:"hotels and hospitality groups",
    distribution:"large distributors and FMCG companies",
    corporate:"large companies and corporate headquarters"
  };
  const phrase = labels[industry] || labels.corporate;
  const jakartaDistricts = '"Jakarta Pusat" OR "Jakarta Selatan" OR "Jakarta Barat" OR "Jakarta Timur" OR "Jakarta Utara"';
  const locationQuery = area === "DKI Jakarta" ? "(" + jakartaDistricts + ")" : '"' + area + '" DKI Jakarta';
  const query = phrase + " in " + locationQuery + " procurement marketing corporate gifts -Tangerang -Bekasi -Depok -Bogor";
  const mapQuery = phrase + " in " + (area === "DKI Jakarta" ? "DKI Jakarta" : area + ", DKI Jakarta");
  const company = companyName.trim();
  const domain = companyDomain.trim().replace(/^https?:\/\//i,"").replace(/\/.*$/,"");
  const exact = company ? '"' + company + '"' : phrase;
  const searchUrl = (q) => "https://www.google.com/search?q="+encodeURIComponent(q);
  const searches = [
    {title:"Official company profile",desc:"Pastikan nama legal, website, industri, alamat kantor, dan kanal resmi.",q:exact+" official website company profile Indonesia"},
    {title:"Procurement & vendor registration",desc:"Cari unit purchasing, procurement, sourcing, vendor management, dan halaman pendaftaran vendor.",q:exact+' (procurement OR purchasing OR sourcing OR "vendor management" OR supplier)'},
    {title:"Marketing, brand & corporate affairs",desc:"Cari pemilik kebutuhan merchandise, brand activation, komunikasi, dan corporate gift.",q:exact+' (marketing OR "brand manager" OR "corporate communications" OR "public relations" OR "corporate affairs")'},
    {title:"HR, GA & office management",desc:"Cari jalur alternatif untuk employee gift, kalender karyawan, general affairs, dan kebutuhan kantor.",q:exact+' (HR OR "human resources" OR "people and culture" OR "general affairs" OR "office manager" OR "employee engagement")'},
    {title:"PIC on LinkedIn",desc:"Temukan profil orang, lalu cocokkan jabatan dan perusahaan saat ini sebelum mencatatnya.",q:exact+' (procurement OR purchasing OR marketing OR "general affairs" OR HR) site:linkedin.com/in'},
    {title:"Official contact & email source",desc:"Cari email berdomain perusahaan dan halaman kontak resmi; hindari menebak pola email.",q:(domain?"site:"+domain+" ":"")+exact+" (contact OR email OR directory OR vendor)"},
    {title:"Branch & business footprint",desc:"Nilai skala distribusi, jumlah cabang, lokasi kantor, pabrik, dan aktivitas perusahaan.",q:exact+" Indonesia branches offices factories locations annual report"}
  ];
  const readyToSave = company.length > 1;
  return <section className="hub-page">
    <PageHeading eyebrow="ACCOUNT DISCOVERY" title="Pencarian perusahaan" description="Cari calon klien yang berlokasi di DKI Jakarta, temukan decision-maker, lalu simpan bukti sumbernya ke CRM."/>
    <div className="finder-layout">
      <div className="panel finder-controls">
        <div className="panel-head"><div><b>Build a search</b><small>Tentukan segmen dan area target</small></div><Search size={18}/></div>
        <label className="field-label">Target industry<select value={industry} onChange={(e)=>setIndustry(e.target.value)}><option value="manufacturing">Manufacturing & factories</option><option value="property">Property & real estate</option><option value="finance">Banking & finance</option><option value="hospitality">Hotels & hospitality</option><option value="distribution">Distribution & FMCG</option><option value="corporate">Large corporate accounts</option></select></label>
        <label className="field-label">Wilayah target<select value={area} onChange={(e)=>setArea(e.target.value)}><option value="DKI Jakarta">Seluruh DKI Jakarta</option><option value="Jakarta Pusat">Jakarta Pusat</option><option value="Jakarta Selatan">Jakarta Selatan</option><option value="Jakarta Barat">Jakarta Barat</option><option value="Jakarta Timur">Jakarta Timur</option><option value="Jakarta Utara">Jakarta Utara</option></select></label>
        <div className="finder-query"><small>SEARCH INTENT</small><p>{query}</p></div>
        <div className="field-note"><ShieldCheck size={15}/> Fokus pencarian hanya DKI Jakarta (Jakarta Pusat, Selatan, Barat, Timur, dan Utara). Perusahaan boleh berkantor pusat di luar Jakarta jika memiliki kantor/cabang di Jakarta; verifikasi alamatnya sebelum disimpan. Tangerang, Bekasi, Depok, dan Bogor tidak termasuk.</div>
      </div>
      <div className="finder-results">
        <article className="finder-card"><span className="finder-number">01</span><div><b>Perusahaan discovery</b><p>Temukan perusahaan dengan banyak karyawan, cabang, pelanggan, atau aktivitas yang masuk akal untuk kalender corporate.</p><a href={searchUrl(query+" official company list")} target="_blank" rel="noreferrer">Find target companies <ArrowUpRight size={14}/></a></div></article>
        <article className="finder-card"><span className="finder-number">02</span><div><b>Google Maps & office footprint</b><p>Cocokkan kantor pusat, pabrik, cabang, dan area operasional. Catat lokasi yang relevan, bukan sekadar jumlah lokasi.</p><a href={"https://www.google.com/maps/search/"+encodeURIComponent(mapQuery)} target="_blank" rel="noreferrer">Open Maps <ArrowUpRight size={14}/></a></div></article>
        <article className="finder-card"><span className="finder-number">03</span><div><b>Account qualification</b><p>Prioritaskan akun dengan alasan pembelian yang nyata: employee gift, customer gift, event, atau distribusi multi-cabang.</p><a href={searchUrl(query+' ("annual report" OR "employee engagement" OR "customer appreciation" OR event)')} target="_blank" rel="noreferrer">Find buying signals <ArrowUpRight size={14}/></a></div></article>
      </div>
    </div>

    <section className="panel research-workbench">
      <div className="panel-head"><div><b>Perusahaan research & contact enrichment</b><small>Riset satu akun sampai ada PIC dan jejak sumber yang bisa diperiksa</small></div><Users size={18}/></div>
      <div className="research-inputs">
        <label className="field-label">Perusahaan name<input value={companyName} onChange={e=>setPerusahaanName(e.target.value)} placeholder="Contoh: PT Astra International Tbk"/></label>
        <label className="field-label">Official domain<input value={companyDomain} onChange={e=>setPerusahaanDomain(e.target.value)} placeholder="astra.co.id"/></label>
      </div>
      <div className="research-grid">
        {searches.map((item,i)=><article className="research-link-card" key={item.title}><span className="finder-number">{String(i+1).padStart(2,"0")}</span><div><b>{item.title}</b><p>{item.desc}</p><a href={searchUrl((company?exact+" ":"")+item.q.replace(exact,""))} target="_blank" rel="noreferrer">Open research <ArrowUpRight size={14}/></a></div></article>)}
      </div>
      <div className="research-inputs research-capture">
        <label className="field-label">PIC name (optional)<input value={picName} onChange={e=>setPicName(e.target.value)} placeholder="Nama orang yang ditemukan"/></label>
        <label className="field-label">PIC role / department<input value={picRole} onChange={e=>setPicRole(e.target.value)} placeholder="Procurement Manager / General Affairs"/></label>
        <label className="field-label">Official company source URL<input value={companySourceUrl} onChange={e=>setPerusahaanSourceUrl(e.target.value)} placeholder="https://company.com/about"/></label>
        <label className="field-label">PIC profile / role source URL<input value={contactSourceUrl} onChange={e=>setNarahubungSourceUrl(e.target.value)} placeholder="URL profil LinkedIn atau halaman tim resmi"/></label>
        <label className="field-label span-two">Email perusahaan source URL (if found)<input value={emailSourceUrl} onChange={e=>setEmailSourceUrl(e.target.value)} placeholder="URL halaman resmi tempat email dipublikasikan"/></label>
        <label className="field-label span-two">Research notes<textarea rows="3" value={researchCatatan} onChange={e=>setResearchCatatan(e.target.value)} placeholder="Contoh: 18 cabang; PIC mengelola procurement; kalender relevan untuk employee/customer gift. Pisahkan fakta dari dugaan."/></label>
      </div>
      <div className="research-save-row"><div><b>Save research to CRM</b><p>Data masuk sebagai prospek <strong>Belum diverifikasi</strong> sampai sumber dan PIC dicek manual.</p></div><button className="btn-primary" disabled={!readyToSave} onClick={()=>onAdd(industry,area,{company:companyName.trim(),website:domain? "https://"+domain:"",contact:picName,role:picRole,companySourceUrl,contactSourceUrl,emailSourceUrl,source:"Public web research",researchSummary:researchCatatan,verificationStatus:"Belum diverifikasi",sourceUrl:companySourceUrl||contactSourceUrl||emailSourceUrl})}><Plus size={15}/> Save company to CRM</button></div>
      <div className="field-note"><ShieldCheck size={15}/> Aturan verifikasi: cocokkan nama legal dan domain resmi; PIC harus masih bekerja di perusahaan dan jabatannya relevan; email harus berasal dari sumber publik yang jelas atau dikonfirmasi langsung. LinkedIn/search snippet saja bukan bukti email valid.</div>
    </section>
    <div className="finder-guide"><div><span className="page-eyebrow">PIC PRIORITY</span><h2>Who should we contact?</h2><p>Jangan terpaku pada satu jabatan. Kalender dapat dibeli oleh procurement, marketing, HR, general affairs, atau corporate communications tergantung tujuan penggunaannya.</p></div><div className="finder-checks"><span><Check size={14}/> Procurement / Purchasing / Sourcing</span><span><Check size={14}/> Marketing / Brand / Corporate Affairs</span><span><Check size={14}/> HR / People & Culture / General Affairs</span><span><Check size={14}/> Event / Office / Vendor Management</span></div></div>
    <div className="finder-segments"><div className="panel-head"><div><b>Priority segments</b><small>Mulai dari kelompok akun ini</small></div><Target size={18}/></div><div className="segment-grid">{[{id:"manufacturing",name:"Manufacturing",why:"Employee gifts, distributor network, vendor gifts."},{id:"property",name:"Property",why:"Informasi pelanggan handover, sales gallery, partner gifts."},{id:"finance",name:"Keuangan",why:"Informasi pelanggan appreciation and branch distribution."},{id:"hospitality",name:"Hospitality",why:"Guest relations, partner and staff merchandise."},{id:"distribution",name:"Distribution",why:"Sales teams, resellers and customer gifts."},{id:"corporate",name:"Corporate HQ",why:"Year-end gifts and multi-office procurement."}].map((x)=><button className={industry===x.id?"segment-card selected":"segment-card"} key={x.id} onClick={()=>setIndustry(x.id)}><b>{x.name}</b><small>{x.why}</small></button>)}</div></div>
  </section>;
}
function Overview({leads,totalPipeline,wonRevenue,interested,followups,onAdd,onNavigate,onEmail}) {
  const active = leads.filter((x)=>!["Won","Lost","Opt-out"].includes(x.status));
  const sent = leads.filter((x)=>["Contacted","Interested","Negotiation","Won"].includes(x.status)).length;
  const cards = [
    ["Active prospects",active.length,Building2,"Across your target accounts"],
    ["Pipeline penjualan value",money(totalPipeline),CircleDollarSign,"Open opportunity estimate"],
    ["Interested",interested,MessageSquare,"Interested + negotiation"],
    ["Won revenue",money(wonRevenue),TrendingUp,"Closed-won estimated value"]
  ];
  return <section className="hub-page">
    <div className="welcome-row"><div><span className="page-eyebrow">SALES COMMAND CENTER · 2027 CAMPAIGN</span><h1>Good work starts<br/><em>with a conversation.</em></h1><p>Kelola prospek corporate, kirim penawaran yang relevan, dan ubah percakapan menjadi purchase order.</p></div><button className="btn-primary" onClick={onAdd}><Plus size={16}/> Tambah prospek</button></div>
    <div className="metric-grid">{cards.map(([label,value,Icon,sub])=><article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><Icon size={17}/></div><b>{value}</b><small>{sub}</small></article>)}</div>
    <div className="overview-grid"><div className="panel"><div className="panel-head"><div><b>Pipeline penjualan snapshot</b><small>Prospect distribution by stage</small></div><button className="text-action" onClick={()=>onNavigate("Pipeline penjualan")}>View pipeline <ArrowUpRight size={14}/></button></div><div className="stage-list">{["New","Qualified","Draft ready","Contacted","Interested","Negotiation","Won"].map((status)=>{const count=leads.filter((x)=>x.status===status).length;const percent=leads.length?Math.round(count/leads.length*100):0;return <div className="stage-row" key={status}><span>{status}</span><div className="stage-track"><i style={{width:percent+"%"}}/></div><b>{count}</b></div>;})}</div><div className="panel-bottom-note"><span><Activity size={14}/> {sent} contacted or beyond</span><span>{leads.length} total prospects</span></div></div>
      <div className="panel priority-panel"><div className="panel-head"><div><b>Next actions</b><small>Keep deals moving</small></div><CalendarClock size={18}/></div><div className="priority-highlight"><span className="priority-icon"><CalendarClock size={17}/></span><div><b>{followups.length} follow-ups due</b><small>Review your next conversations</small></div></div>{followups.slice(0,4).map((lead)=><div className="mini-follow" key={lead.id}><span><b>{lead.company}</b><small>{lead.followup} · {lead.contact || "PIC not set"}</small></span><button onClick={()=>onEmail(lead)}><Mail size={14}/></button></div>)}{!followups.length && <div className="empty-inline">No follow-ups due. Add a date after each outreach.</div>}<button className="btn-secondary full-button" onClick={()=>onNavigate("Tindak lanjut")}>Open follow-up center <ArrowUpRight size={14}/></button></div></div>
    <div className="campaign-banner"><div><span>FEATURED CAMPAIGN</span><h2>Calendar meja custom 2027</h2><p>Mulai dari Rp27.500/pcs · MOQ target 1.000 pcs · Paket Standard Corporate.</p></div><div className="campaign-target"><small>1.000 PCS · STANDARD CORPORATE</small><b>{money(PRICE_DEFAULT * 1000)}</b><span>Harga acuan indikatif</span></div></div>
    <div className="overview-bottom"><div><b>Start with qualified accounts</b><p>Prioritaskan perusahaan dengan kebutuhan merchandise, hadiah pelanggan, atau distribusi multi-cabang yang bisa diverifikasi.</p></div><button className="btn-secondary" onClick={()=>onNavigate("Database prospek")}><Users size={15}/> Manage prospects</button></div>
  </section>;
}
