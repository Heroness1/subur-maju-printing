"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpRight, Bell, Building2, CalendarClock,
  Check, ChevronDown, CircleDollarSign, ClipboardList, Copy, Download,
  FileText, Filter, LayoutDashboard, Mail, MapPin, Menu, MessageSquare,
  Plus, Printer, Search, Send, Settings2, ShieldCheck, Target, Trash2,
  TrendingUp, Users, X
} from "lucide-react";
import "./sales-hub.css";

const STORAGE_KEY = "smp-sales-hub-v1";
const PRICE_DEFAULT = 68000;
const STATUSES = ["New", "Qualified", "Draft ready", "Contacted", "Interested", "Negotiation", "Won", "Lost", "Opt-out"];
const NAV = [
  ["Overview", LayoutDashboard], ["Prospects", Building2], ["Pipeline", Target],
  ["Email studio", Mail], ["Follow-ups", CalendarClock], ["Quotation", FileText]
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
  return {
    subject: "Penawaran Kalender Meja Custom 2027 untuk " + company,
    body: contact + ",\n\nPerkenalkan, kami dari Subur Maju Printing.\n\nKami ingin menawarkan kalender meja custom 2027 untuk kebutuhan branding, merchandise, maupun corporate gift " + company + ". Kami menangani produksi sendiri dan dapat mendiskusikan desain serta spesifikasi sesuai kebutuhan perusahaan.\n\nSebagai gambaran awal, harga acuan untuk pemesanan 1.000 pcs adalah Rp68.000/pcs. Harga final mengikuti spesifikasi, desain, finishing, dan detail pengiriman yang disepakati.\n\nKami menghubungi " + company + " karena " + reason + ". Apakah Bapak/Ibu berkenan menerima katalog dan penawaran resmi untuk ditinjau? Jika bukan bagian yang tepat, mohon arahkan kami ke PIC terkait.\n\nTerima kasih atas waktunya. Jika email ini tidak relevan, silakan balas agar kami tidak menghubungi kembali.\n\nSalam,\n" + (sender || "Tim Subur Maju Printing") + "\nSubur Maju Printing\n" + (phone || "[Nomor WhatsApp bisnis]")
  };
}

export default function SalesHubPage() {
  const [leads, setLeads] = useState(starter);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState("Overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [emailDraft, setEmailDraft] = useState({ subject: "", body: "" });
  const [sender, setSender] = useState("Tim Subur Maju Printing");
  const [phone, setPhone] = useState("");
  const [quote, setQuote] = useState({ company: "", contact: "", qty: 1000, price: PRICE_DEFAULT, notes: "Kalender meja custom 2027; desain dan spesifikasi mengikuti persetujuan final." });
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setLeads(Array.isArray(data.leads) ? data.leads : []);
        setSender(data.sender || "Tim Subur Maju Printing");
        setPhone(data.phone || "");
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ leads, sender, phone }));
  }, [leads, sender, phone, ready]);

  const selected = leads.find((lead) => lead.id === selectedId) || null;
  const filtered = useMemo(() => leads.filter((lead) => {
    const haystack = [lead.company, lead.industry, lead.area, lead.contact, lead.email].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (statusFilter === "All statuses" || lead.status === statusFilter);
  }), [leads, query, statusFilter]);

  const totalPipeline = leads.filter((x) => !["Won", "Lost", "Opt-out"].includes(x.status)).reduce((sum, x) => sum + (Number(x.qty) || 0) * (Number(x.price) || PRICE_DEFAULT), 0);
  const wonRevenue = leads.filter((x) => x.status === "Won").reduce((sum, x) => sum + (Number(x.qty) || 0) * (Number(x.price) || PRICE_DEFAULT), 0);
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
    setActive("Email studio");
  }
  function updateStatus(id, status) {
    setLeads((current) => current.map((x) => x.id === id ? { ...x, status, updated: today() } : x));
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
    const columns = ["id","company","industry","area","website","contact","role","email","source","reason","qty","price","status","lastContact","followup","notes"];
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
    setQuote({ company: lead.company, contact: lead.contact || "", qty: Number(lead.qty || 1000), price: Number(lead.price || PRICE_DEFAULT), notes: "Kalender meja custom 2027; desain dan spesifikasi mengikuti persetujuan final." });
    setActive("Quotation");
  }

  const revenueQuote = Number(quote.qty || 0) * Number(quote.price || 0);
  const commissionQuote = revenueQuote * 0.25;

  return (
    <main className="hub-shell">
      <aside className={"hub-sidebar " + (mobileNav ? "hub-sidebar-open" : "")}>
        <a className="hub-brand" href="/"><span className="hub-brand-mark"><Printer size={19}/></span><span><b>SUBUR MAJU</b><small>SALES HUB</small></span></a>
        <div className="hub-workspace"><span className="workspace-dot"/> INTERNAL WORKSPACE <ChevronDown size={13}/></div>
        <div className="hub-nav-label">WORKSPACE</div>
        <nav className="hub-nav">
          {NAV.map(([label, Icon]) => <button key={label} className={active === label ? "hub-nav-item active" : "hub-nav-item"} onClick={() => { setActive(label); setMobileNav(false); }}><Icon size={17}/><span>{label}</span>{label === "Follow-ups" && followups.length > 0 && <i>{followups.length}</i>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><ShieldCheck size={16}/><span>Data tersimpan lokal di browser ini.</span></div>
          <button className="hub-nav-item" onClick={() => setActive("Settings")}><Settings2 size={17}/> <span>Settings</span></button>
          <div className="hub-user"><span className="hub-avatar">SM</span><span><b>Subur Maju</b><small>Sales workspace</small></span><MoreDots/></div>
        </div>
      </aside>

      <section className="hub-main">
        <header className="hub-topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu"><Menu size={20}/></button>
          <div className="breadcrumb">Subur Maju <span>/</span> <b>{active}</b></div>
          <div className="topbar-actions"><span className="top-date"><CalendarClock size={14}/> {new Date().toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}</span><button className="icon-button" title="Follow-up jatuh tempo" onClick={() => setActive("Follow-ups")}><Bell size={17}/>{followups.length > 0 && <i/>}</button><span className="top-avatar">SM</span></div>
        </header>

        <div className="hub-content">
          {active === "Overview" && <Overview leads={leads} totalPipeline={totalPipeline} wonRevenue={wonRevenue} interested={interested} followups={followups} onAdd={() => {setEditing(null);setShowForm(true);}} onNavigate={setActive} onEmail={openEmail} />}
          {active === "Prospects" && <section className="hub-page">
            <PageHeading eyebrow="DATABASE PERUSAHAAN" title="Prospects" description="Simpan perusahaan target, PIC, sumber kontak, dan kebutuhan kalender." action={<button className="btn-primary" onClick={() => {setEditing(null);setShowForm(true);}}><Plus size={16}/> Add prospect</button>}/>
            <div className="toolbar"><label className="search-field"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari perusahaan, industri, PIC..."/></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><button className="btn-secondary" onClick={exportCsv}><Download size={15}/> Export CSV</button><label className="btn-secondary file-import"><ArrowDownToLine size={15}/> Import CSV<input type="file" accept=".csv,text/csv" onChange={importCsv}/></label></div>
            <div className="table-wrap"><table className="prospect-table"><thead><tr><th>Company</th><th>Contact</th><th>Industry / area</th><th>Order estimate</th><th>Status</th><th>Next follow-up</th><th/></tr></thead><tbody>
              {filtered.map((lead) => <tr key={lead.id}><td><button className="company-cell" onClick={() => {setSelectedId(lead.id);setEditing(lead);setShowForm(true);}}><b>{lead.company}</b><small>{lead.website || lead.id}</small></button></td><td><b>{lead.contact || "—"}</b><small>{lead.email || "No email"}</small></td><td>{lead.industry || "—"}<small>{lead.area || "Jakarta"}</small></td><td><b>{Number(lead.qty || 0).toLocaleString("id-ID")} pcs</b><small>{money(Number(lead.qty || 0)*Number(lead.price || PRICE_DEFAULT))}</small></td><td><StatusPill status={lead.status}/></td><td>{lead.followup || "—"}</td><td><div className="row-actions"><button title="Generate email" onClick={() => openEmail(lead)}><Mail size={15}/></button><button title="Buat penawaran" onClick={() => setQuoteFromLead(lead)}><FileText size={15}/></button><button title="Hapus" onClick={() => removeLead(lead.id)}><Trash2 size={15}/></button></div></td></tr>)}
              {!filtered.length && <tr><td colSpan="7"><EmptyState title="Belum ada prospek" text="Tambahkan perusahaan pertama atau impor daftar CSV untuk mulai membangun pipeline." action={<button className="btn-primary" onClick={() => {setEditing(null);setShowForm(true);}}><Plus size={15}/> Add first prospect</button>}/></td></tr>}
            </tbody></table></div>
            <div className="table-foot">{filtered.length} prospek ditampilkan <span>Data disimpan pada browser/perangkat ini</span></div>
          </section>}
          {active === "Pipeline" && <section className="hub-page">
            <PageHeading eyebrow="DEAL MANAGEMENT" title="Sales pipeline" description="Pantau setiap peluang dari prospek baru sampai purchase order." action={<button className="btn-primary" onClick={() => {setEditing(null);setShowForm(true);}}><Plus size={16}/> Add prospect</button>}/>
            <div className="pipeline-grid">{["New","Qualified","Draft ready","Contacted","Interested","Negotiation","Won"].map((status) => <div className="pipeline-column" key={status}><div className="pipeline-col-head"><span>{status}</span><b>{leads.filter((x) => x.status === status).length}</b></div>{leads.filter((x) => x.status === status).map((lead) => <article className="pipeline-card" key={lead.id}><b>{lead.company}</b><small>{lead.industry || "Industry not set"} · {Number(lead.qty || 0).toLocaleString("id-ID")} pcs</small><strong>{money(Number(lead.qty || 0)*Number(lead.price || PRICE_DEFAULT))}</strong><select value={lead.status} onChange={(e) => updateStatus(lead.id,e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><button className="text-action" onClick={() => openEmail(lead)}>Open email <ArrowUpRight size={13}/></button></article>)}</div>)}</div>
            <p className="muted-help">Lost dan Opt-out tetap tercatat di database, tetapi tidak ditampilkan sebagai kolom peluang aktif.</p>
          </section>}
          {active === "Email studio" && <section className="hub-page">
            <PageHeading eyebrow="SEMI-AUTOMATIC OUTREACH" title="Email studio" description="Buat draft personal, periksa semua detail, lalu buka Gmail untuk mengirim secara manual."/>
            <div className="email-layout"><div className="panel email-config"><div className="panel-head"><div><b>Recipient & context</b><small>Pilih prospek dari database</small></div><Mail size={18}/></div><label className="field-label">Select prospect<select value={selectedId} onChange={(e) => {setSelectedId(e.target.value);const item=leads.find((x)=>x.id===e.target.value);if(item)setEmailDraft(makeEmail(item,sender,phone));}}><option value="">Choose a company...</option>{leads.filter((x) => x.status !== "Opt-out").map((x) => <option value={x.id} key={x.id}>{x.company} — {x.contact || "No PIC"}</option>)}</select></label>{selected ? <div className="recipient-card"><span className="recipient-icon"><Building2 size={18}/></span><span><b>{selected.company}</b><small>{selected.email || "Email belum diisi"} · {selected.industry || "Industry not set"}</small></span><StatusPill status={selected.status}/></div> : <div className="inline-empty">Pilih prospek untuk mulai membuat draft email.</div>}<div className="field-note"><ShieldCheck size={15}/> Tidak ada email yang dikirim otomatis. Kamu tetap melakukan review dan klik Send di Gmail.</div></div>
              <div className="panel email-editor"><div className="panel-head"><div><b>Message composer</b><small>Review sebelum mengirim</small></div><span className="draft-tag">DRAFT</span></div><label className="field-label">Subject<input value={emailDraft.subject} onChange={(e) => setEmailDraft({...emailDraft,subject:e.target.value})} placeholder="Subject email"/></label><label className="field-label">Email body<textarea rows="15" value={emailDraft.body} onChange={(e) => setEmailDraft({...emailDraft,body:e.target.value})} placeholder="Pilih prospek untuk generate draft..."/></label><div className="editor-actions"><button className="btn-secondary" disabled={!emailDraft.body} onClick={() => copyText("Subject: "+emailDraft.subject+"\n\n"+emailDraft.body,"Email draft")}><Copy size={15}/> Copy draft</button><button className="btn-primary" disabled={!selected || !selected.email || !emailDraft.body} onClick={gmailDraft}><Mail size={15}/> Open Gmail draft <ArrowUpRight size={14}/></button><button className="btn-quiet" disabled={!selected} onClick={() => markSent(selected)}><Check size={15}/> Mark as sent</button></div></div></div>
          </section>}
          {active === "Follow-ups" && <section className="hub-page"><PageHeading eyebrow="NEXT ACTIONS" title="Follow-up center" description="Jaga ritme komunikasi. Hentikan kontak saat prospek menolak atau meminta opt-out."/><div className="followup-list">{leads.filter((x) => x.followup && !["Won","Lost","Opt-out"].includes(x.status)).sort((a,b)=>a.followup.localeCompare(b.followup)).map((lead) => <div className="followup-row" key={lead.id}><div className="followup-date"><b>{new Date(lead.followup+"T00:00:00").getDate()}</b><small>{new Date(lead.followup+"T00:00:00").toLocaleDateString("id-ID",{month:"short"})}</small></div><div className="followup-info"><b>{lead.company}</b><small>{lead.contact || "PIC belum diisi"} · {lead.email || "Email belum diisi"}</small></div><StatusPill status={lead.status}/><span className={lead.followup <= today() ? "due-label overdue" : "due-label"}>{lead.followup <= today() ? "Due" : "Upcoming"} · {lead.followup}</span><button className="btn-secondary" onClick={() => openEmail(lead)}><Mail size={14}/> Draft</button></div>)}{!leads.some((x)=>x.followup && !["Won","Lost","Opt-out"].includes(x.status)) && <EmptyState title="Belum ada follow-up terjadwal" text="Set tanggal follow-up saat mengedit prospek atau setelah mengirim email pertama."/>}</div></section>}
          {active === "Quotation" && <section className="hub-page"><PageHeading eyebrow="COMMERCIAL PROPOSAL" title="Quotation builder" description="Buat estimasi penawaran kalender meja custom 2027. Cetak atau simpan sebagai PDF dari browser."/><div className="quote-layout"><div className="panel quote-form"><div className="panel-head"><div><b>Quote details</b><small>Harga indikatif; final setelah spesifikasi disepakati</small></div><FileText size={18}/></div><label className="field-label">Company<input value={quote.company} onChange={(e)=>setQuote({...quote,company:e.target.value})} placeholder="Nama perusahaan"/></label><label className="field-label">PIC / attention<input value={quote.contact} onChange={(e)=>setQuote({...quote,contact:e.target.value})} placeholder="Nama PIC"/></label><div className="field-row"><label className="field-label">Quantity (pcs)<input type="number" min="1" value={quote.qty} onChange={(e)=>setQuote({...quote,qty:e.target.value})}/></label><label className="field-label">Price per pcs (Rp)<input type="number" min="1" value={quote.price} onChange={(e)=>setQuote({...quote,price:e.target.value})}/></label></div><label className="field-label">Scope & notes<textarea rows="4" value={quote.notes} onChange={(e)=>setQuote({...quote,notes:e.target.value})}/></label><div className="quote-tip"><ShieldCheck size={15}/> Harga Rp68.000/pcs adalah acuan awal dari brief, bukan quotation final yang mengikat.</div><button className="btn-primary full-button" onClick={()=>window.print()}><Printer size={16}/> Print / Save PDF</button></div><div className="quote-preview"><div className="quote-paper"><div className="quote-paper-head"><div className="quote-logo"><Printer size={17}/><b>SUBUR MAJU</b></div><span>SALES PROPOSAL · 2027</span></div><div className="quote-title"><small>ESTIMASI PENAWARAN</small><h2>Kalender Meja<br/><em>Custom 2027</em></h2><p>Penawaran kebutuhan corporate merchandise & brand presence.</p></div><div className="quote-meta"><div><small>DISIAPKAN UNTUK</small><b>{quote.company || "Nama Perusahaan"}</b><span>{quote.contact || "Attn. Procurement / Marketing"}</span></div><div><small>TANGGAL</small><b>{new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</b><span>Ref: SMP-2027-EST</span></div></div><div className="quote-line"><span>PRODUK</span><span>QTY</span><span>HARGA/PCS</span><span>JUMLAH</span></div><div className="quote-product"><b>Kalender Meja Custom 2027</b><span>{Number(quote.qty||0).toLocaleString("id-ID")} pcs</span><span>{money(quote.price)}</span><strong>{money(revenueQuote)}</strong></div><div className="quote-total"><span>ESTIMASI TOTAL</span><b>{money(revenueQuote)}</b></div><div className="quote-notes"><small>CATATAN PENAWARAN</small><p>{quote.notes}</p><p>Harga dan jadwal produksi akan dikonfirmasi setelah spesifikasi, desain, finishing, kemasan, pajak, dan pengiriman disepakati.</p></div><div className="quote-paper-foot"><b>Subur Maju Printing</b><span>Terima kasih atas kesempatan yang diberikan.</span></div></div><div className="commission-card"><span>SIMULASI KOMISI INTERNAL · 25%</span><b>{money(commissionQuote)}</b><small>Dihitung dari estimasi omzet; bukan bagian dari penawaran kepada klien.</small></div></div></div></section>}
          {active === "Settings" && <section className="hub-page"><PageHeading eyebrow="WORKSPACE PREFERENCES" title="Settings" description="Identitas pengirim untuk draft email dan pengelolaan data lokal."/><div className="panel settings-panel"><label className="field-label">Nama pengirim<input value={sender} onChange={(e)=>setSender(e.target.value)}/></label><label className="field-label">WhatsApp bisnis<input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+62..."/></label><div className="field-note"><ShieldCheck size={15}/> Data prospek hanya tersimpan di local storage browser ini. Belum ada login server, sinkronisasi tim, atau backup cloud.</div><div className="settings-actions"><button className="btn-secondary" onClick={exportCsv}><Download size={15}/> Backup prospek CSV</button><button className="btn-quiet danger" onClick={()=>{if(window.confirm("Hapus seluruh data lokal di browser ini?")){setLeads([]);setSelectedId("");notify("Data lokal dihapus");}}}><Trash2 size={15}/> Hapus semua data lokal</button></div></div></section>}
        </div>
        <footer className="hub-footer"><span>SUBUR MAJU PRINTING · INTERNAL SALES WORKSPACE</span><span>Calendar 2027 campaign</span></footer>
      </section>

      {showForm && <div className="modal-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget){setShowForm(false);setEditing(null);}}}><form className="lead-modal" onSubmit={saveLead}><div className="modal-head"><div><small>PROSPECT RECORD</small><h2>{editing ? "Edit prospect" : "Add new prospect"}</h2></div><button type="button" className="icon-button" onClick={()=>{setShowForm(false);setEditing(null);}}><X size={18}/></button></div><div className="form-grid">
        <label className="field-label span-two">Company name *<input name="company" required defaultValue={editing?.company || ""} placeholder="Nama perusahaan"/></label>
        <label className="field-label">Industry<input name="industry" defaultValue={editing?.industry || ""} placeholder="Manufacturing, property..."/></label><label className="field-label">Area<input name="area" defaultValue={editing?.area || "Jakarta"} placeholder="Jakarta Timur"/></label>
        <label className="field-label">PIC name<input name="contact" defaultValue={editing?.contact || ""} placeholder="Nama kontak"/></label><label className="field-label">PIC role<input name="role" defaultValue={editing?.role || ""} placeholder="Procurement / Marketing"/></label>
        <label className="field-label span-two">Business email<input type="email" name="email" defaultValue={editing?.email || ""} placeholder="nama@perusahaan.co.id"/></label>
        <label className="field-label span-two">Website<input name="website" defaultValue={editing?.website || ""} placeholder="https://..."/></label>
        <label className="field-label">Lead source<input name="source" defaultValue={editing?.source || ""} placeholder="Website, referral, LinkedIn..."/></label><label className="field-label">Status<select name="status" defaultValue={editing?.status || "New"}>{STATUSES.map((s)=><option key={s}>{s}</option>)}</select></label>
        <label className="field-label">Estimated quantity<input type="number" min="1" name="qty" defaultValue={editing?.qty || 1000}/></label><label className="field-label">Price / pcs (Rp)<input type="number" min="1" name="price" defaultValue={editing?.price || PRICE_DEFAULT}/></label>
        <label className="field-label">Last contact<input type="date" name="lastContact" defaultValue={editing?.lastContact || ""}/></label><label className="field-label">Next follow-up<input type="date" name="followup" defaultValue={editing?.followup || ""}/></label>
        <label className="field-label span-two">Why this company is relevant?<textarea name="reason" rows="2" defaultValue={editing?.reason || ""} placeholder="Tuliskan alasan yang benar-benar sudah diverifikasi."/></label>
        <label className="field-label span-two">Notes<textarea name="notes" rows="2" defaultValue={editing?.notes || ""} placeholder="Kebutuhan, respons, catatan riset..."/></label>
      </div><div className="modal-actions"><button type="button" className="btn-secondary" onClick={()=>{setShowForm(false);setEditing(null);}}>Cancel</button><button className="btn-primary" type="submit"><Check size={15}/> Save prospect</button></div></form></div>}
      {notice && <div className="toast"><Check size={16}/>{notice}</div>}
    </main>
  );
}

function MoreDots() { return <span className="more-dots">•••</span>; }
function PageHeading({eyebrow,title,description,action}) { return <div className="page-heading"><div><span className="page-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function StatusPill({status}) { const cls = String(status||"New").toLowerCase().replaceAll(" ","-"); return <span className={"status-pill status-"+cls}>{status || "New"}</span>; }
function EmptyState({title,text,action}) { return <div className="empty-state"><span className="empty-icon"><ClipboardList size={20}/></span><b>{title}</b><p>{text}</p>{action}</div>; }

function Overview({leads,totalPipeline,wonRevenue,interested,followups,onAdd,onNavigate,onEmail}) {
  const active = leads.filter((x)=>!["Won","Lost","Opt-out"].includes(x.status));
  const sent = leads.filter((x)=>["Contacted","Interested","Negotiation","Won"].includes(x.status)).length;
  const cards = [
    ["Active prospects",active.length,Building2,"Across your target accounts"],
    ["Pipeline value",money(totalPipeline),CircleDollarSign,"Open opportunity estimate"],
    ["Interested",interested,MessageSquare,"Interested + negotiation"],
    ["Won revenue",money(wonRevenue),TrendingUp,"Closed-won estimated value"]
  ];
  return <section className="hub-page">
    <div className="welcome-row"><div><span className="page-eyebrow">SALES COMMAND CENTER · 2027 CAMPAIGN</span><h1>Good work starts<br/><em>with a conversation.</em></h1><p>Kelola prospek corporate, kirim penawaran yang relevan, dan ubah percakapan menjadi purchase order.</p></div><button className="btn-primary" onClick={onAdd}><Plus size={16}/> Add prospect</button></div>
    <div className="metric-grid">{cards.map(([label,value,Icon,sub])=><article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><Icon size={17}/></div><b>{value}</b><small>{sub}</small></article>)}</div>
    <div className="overview-grid"><div className="panel"><div className="panel-head"><div><b>Pipeline snapshot</b><small>Prospect distribution by stage</small></div><button className="text-action" onClick={()=>onNavigate("Pipeline")}>View pipeline <ArrowUpRight size={14}/></button></div><div className="stage-list">{["New","Qualified","Draft ready","Contacted","Interested","Negotiation","Won"].map((status)=>{const count=leads.filter((x)=>x.status===status).length;const percent=leads.length?Math.round(count/leads.length*100):0;return <div className="stage-row" key={status}><span>{status}</span><div className="stage-track"><i style={{width:percent+"%"}}/></div><b>{count}</b></div>;})}</div><div className="panel-bottom-note"><span><Activity size={14}/> {sent} contacted or beyond</span><span>{leads.length} total prospects</span></div></div>
      <div className="panel priority-panel"><div className="panel-head"><div><b>Next actions</b><small>Keep deals moving</small></div><CalendarClock size={18}/></div><div className="priority-highlight"><span className="priority-icon"><CalendarClock size={17}/></span><div><b>{followups.length} follow-ups due</b><small>Review your next conversations</small></div></div>{followups.slice(0,4).map((lead)=><div className="mini-follow" key={lead.id}><span><b>{lead.company}</b><small>{lead.followup} · {lead.contact || "PIC not set"}</small></span><button onClick={()=>onEmail(lead)}><Mail size={14}/></button></div>)}{!followups.length && <div className="empty-inline">No follow-ups due. Add a date after each outreach.</div>}<button className="btn-secondary full-button" onClick={()=>onNavigate("Follow-ups")}>Open follow-up center <ArrowUpRight size={14}/></button></div></div>
    <div className="campaign-banner"><div><span>FEATURED CAMPAIGN</span><h2>Calendar meja custom 2027</h2><p>Harga acuan Rp68.000/pcs · MOQ target 1.000 pcs · Produksi sesuai spesifikasi final.</p></div><div className="campaign-target"><small>1.000 PCS ESTIMATED ORDER</small><b>{money(68000000)}</b><span>Indicative gross order value</span></div></div>
    <div className="overview-bottom"><div><b>Start with qualified accounts</b><p>Prioritaskan perusahaan dengan kebutuhan merchandise, hadiah pelanggan, atau distribusi multi-cabang yang bisa diverifikasi.</p></div><button className="btn-secondary" onClick={()=>onNavigate("Prospects")}><Users size={15}/> Manage prospects</button></div>
  </section>;
}
