"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, PlusCircle, TrendingUp, ShoppingBag, Wallet } from "lucide-react";

const money = value => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value)||0);
const spendInitial = { spend_date:new Date().toISOString().slice(0,10), platform:"Google Ads", campaign:"", spend:"", clicks:"0", impressions:"0", notes:"" };
const initial = { order_number:"", prospect_id:"", quotation_id:"", revenue:"", cogs:"", shipping_cost:"0", other_cost:"0", source:"", medium:"", campaign:"", gclid:"", notes:"" };

export default function OrdersRevenue() {
  const [orders,setOrders] = useState([]);
  const [prospects,setProspects] = useState([]);
  const [spends,setSpends] = useState([]);
  const [spendForm,setSpendForm] = useState(spendInitial);
  const [showSpendForm,setShowSpendForm] = useState(false);
  const [form,setForm] = useState(initial);
  const [showForm,setShowForm] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [orderRes,prospectRes,spendRes] = await Promise.all([fetch("/api/orders?limit=1000",{cache:"no-store"}),fetch("/api/prospects?limit=500",{cache:"no-store"}),fetch("/api/campaign-spend",{cache:"no-store"})]);
      if(!orderRes.ok) throw new Error("Data order belum tersedia. Pastikan migration 005 dan Worker terbaru sudah aktif.");
      const orderData = await orderRes.json();
      const prospectData = prospectRes.ok ? await prospectRes.json() : {prospects:[]};
      setOrders(Array.isArray(orderData.orders)?orderData.orders:[]);
      setProspects(Array.isArray(prospectData.prospects)?prospectData.prospects:[]);
      if(spendRes.ok){const spendData=await spendRes.json();setSpends(Array.isArray(spendData.spends)?spendData.spends:[]);}
    } catch(e) { setError(e.message||"Gagal memuat data order."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{load();},[]);

  const totals = useMemo(()=>orders.filter(x=>x.status!=="cancelled").reduce((a,x)=>({
    revenue:a.revenue+Number(x.revenue||0),
    cost:a.cost+Number(x.cogs||0)+Number(x.shipping_cost||0)+Number(x.other_cost||0),
    count:a.count+1
  }),{revenue:0,cost:0,count:0}),[orders]);
  const profit=totals.revenue-totals.cost;
  const totalAdSpend=spends.reduce((sum,x)=>sum+Number(x.spend||0),0);
  const afterAds=profit-totalAdSpend;
  const campaignRows=useMemo(()=>{
    const names=new Set([...orders.filter(o=>o.status!=="cancelled").map(o=>o.campaign).filter(Boolean),...spends.map(s=>s.campaign)]);
    return [...names].map(name=>{const revenue=orders.filter(o=>o.status!=="cancelled"&&o.campaign===name).reduce((s,o)=>s+Number(o.revenue||0),0);const adSpend=spends.filter(s=>s.campaign===name).reduce((s,x)=>s+Number(x.spend||0),0);return {name,revenue,adSpend,roas:adSpend>0?revenue/adSpend:null};}).sort((a,b)=>b.revenue-a.revenue);
  },[orders,spends]);

  async function saveSpend(e) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const body={...spendForm,spend:Number(spendForm.spend),clicks:Number(spendForm.clicks||0),impressions:Number(spendForm.impressions||0)};
      const res=await fetch("/api/campaign-spend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.details?.join(", ")||"Biaya campaign gagal disimpan.");
      setSpendForm({...spendInitial,spend_date:spendForm.spend_date,platform:spendForm.platform});setShowSpendForm(false);await load();
    } catch(e) { setError(e.message||"Biaya campaign gagal disimpan."); }
    finally { setSaving(false); }
  }

  async function createOrder(e) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const body={...form,revenue:Number(form.revenue),cogs:Number(form.cogs||0),shipping_cost:Number(form.shipping_cost||0),other_cost:Number(form.other_cost||0)};
      if(!body.quotation_id) delete body.quotation_id;
      const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error==="quotation_not_accepted"?"Quotation harus berstatus Accepted sebelum dicatat sebagai order.":data.error==="duplicate_order_number"?"Nomor order sudah digunakan.":data.details?.join(", ")||"Order gagal disimpan.");
      setForm(initial); setShowForm(false); await load();
    } catch(e) { setError(e.message||"Order gagal disimpan."); }
    finally { setSaving(false); }
  }

  return <section className="hub-page">
    <div className="wf-heading">
      <div><span className="page-eyebrow">PENDAPATAN & PROFIT AKTUAL</span><h1>Orders & Revenue</h1><p>Catat hanya pesanan yang sudah dikonfirmasi. Klik WhatsApp dan quotation belum dihitung sebagai omzet.</p></div>
      <div className="wf-actions"><button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button><button className="btn-secondary" onClick={()=>setShowSpendForm(v=>!v)}>Catat biaya iklan</button><button className="btn-primary" onClick={()=>setShowForm(v=>!v)}><PlusCircle size={15}/> Catat order</button></div>
    </div>
    {error && <div className="wf-error">{error}</div>}
    <div className="wf-metrics">
      <article><span><ShoppingBag size={15}/> Order aktif</span><b>{loading?"…":totals.count.toLocaleString("id-ID")}</b><small>Order tidak dibatalkan</small></article>
      <article><span><TrendingUp size={15}/> Revenue</span><b>{loading?"…":money(totals.revenue)}</b><small>Nilai order tercatat</small></article>
      <article><span><Wallet size={15}/> Biaya langsung</span><b>{loading?"…":money(totals.cost)}</b><small>HPP + ongkir + biaya lain</small></article>
      <article><span><TrendingUp size={15}/> Gross contribution</span><b>{loading?"…":money(profit)}</b><small>Revenue dikurangi biaya langsung</small></article>
      <article><span><Wallet size={15}/> Biaya iklan</span><b>{loading?"…":money(totalAdSpend)}</b><small>Input biaya campaign</small></article>
      <article><span><TrendingUp size={15}/> Setelah iklan</span><b>{loading?"…":money(afterAds)}</b><small>Belum dikurangi overhead & pajak</small></article>
    </div>
    {showSpendForm && <form className="panel quote-form" onSubmit={saveSpend} style={{padding:20,marginBottom:20}}>
      <div className="panel-head"><div><b>Catat biaya campaign</b><small>Masukkan angka dari Google Ads atau platform lain. Kombinasi tanggal + platform + campaign akan diperbarui jika sudah ada.</small></div></div>
      <div className="field-row">
        <label className="field-label">Tanggal<input required type="date" value={spendForm.spend_date} onChange={e=>setSpendForm({...spendForm,spend_date:e.target.value})}/></label>
        <label className="field-label">Platform<select value={spendForm.platform} onChange={e=>setSpendForm({...spendForm,platform:e.target.value})}><option>Google Ads</option><option>Meta Ads</option><option>TikTok Ads</option><option>Other</option></select></label>
        <label className="field-label">Nama campaign<input required value={spendForm.campaign} onChange={e=>setSpendForm({...spendForm,campaign:e.target.value})} placeholder="Nama harus sama dengan campaign di order"/></label>
        <label className="field-label">Biaya (Rp)<input required type="number" min="0" step="1" value={spendForm.spend} onChange={e=>setSpendForm({...spendForm,spend:e.target.value})}/></label>
        <label className="field-label">Clicks<input type="number" min="0" step="1" value={spendForm.clicks} onChange={e=>setSpendForm({...spendForm,clicks:e.target.value})}/></label>
        <label className="field-label">Impressions<input type="number" min="0" step="1" value={spendForm.impressions} onChange={e=>setSpendForm({...spendForm,impressions:e.target.value})}/></label>
      </div>
      <div className="editor-actions"><button type="button" className="btn-secondary" onClick={()=>setShowSpendForm(false)}>Batal</button><button type="submit" className="btn-primary" disabled={saving}>{saving?"Menyimpan…":"Simpan biaya campaign"}</button></div>
    </form>}
    {showForm && <form className="panel quote-form" onSubmit={createOrder} style={{padding:20,marginBottom:20}}>
      <div className="panel-head"><div><b>Catat confirmed order</b><small>Order wajib terhubung ke prospek yang sudah ada.</small></div></div>
      <div className="field-row">
        <label className="field-label">Nomor order<input required value={form.order_number} onChange={e=>setForm({...form,order_number:e.target.value})} placeholder="SMP/ORD/2026/001"/></label>
        <label className="field-label">Prospek<select required value={form.prospect_id} onChange={e=>setForm({...form,prospect_id:e.target.value})}><option value="">Pilih prospek</option>{prospects.map(p=><option key={p.id} value={p.id}>{p.company}</option>)}</select></label>
        <label className="field-label">Quotation ID (opsional)<input value={form.quotation_id} onChange={e=>setForm({...form,quotation_id:e.target.value})} placeholder="Hanya quotation Accepted"/></label>
        <label className="field-label">Revenue / nilai order (Rp)<input required type="number" min="0" step="1" value={form.revenue} onChange={e=>setForm({...form,revenue:e.target.value})}/></label>
        <label className="field-label">HPP total (Rp)<input type="number" min="0" value={form.cogs} onChange={e=>setForm({...form,cogs:e.target.value})}/></label>
        <label className="field-label">Biaya pengiriman (Rp)<input type="number" min="0" value={form.shipping_cost} onChange={e=>setForm({...form,shipping_cost:e.target.value})}/></label>
        <label className="field-label">Biaya lain (Rp)<input type="number" min="0" value={form.other_cost} onChange={e=>setForm({...form,other_cost:e.target.value})}/></label>
        <label className="field-label">Sumber<input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} placeholder="google / organic / referral"/></label>
        <label className="field-label">Medium<input value={form.medium} onChange={e=>setForm({...form,medium:e.target.value})} placeholder="cpc / organic"/></label>
        <label className="field-label">Campaign<input value={form.campaign} onChange={e=>setForm({...form,campaign:e.target.value})}/></label>
        <label className="field-label">GCLID<input value={form.gclid} onChange={e=>setForm({...form,gclid:e.target.value})}/></label>
      </div>
      <label className="field-label">Catatan<textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      <div className="editor-actions"><button type="button" className="btn-secondary" onClick={()=>setShowForm(false)}>Batal</button><button type="submit" className="btn-primary" disabled={saving||!prospects.length}>{saving?"Menyimpan…":"Simpan confirmed order"}</button></div>
      {!prospects.length && <small className="muted-help">Belum ada prospek di database. Tambahkan prospek terlebih dahulu.</small>}
    </form>}
    <div className="panel wf-table-panel" style={{marginBottom:20}}><div className="panel-head"><div><b>Campaign performance</b><small>Revenue dari order yang nama campaign-nya cocok persis dengan data biaya iklan.</small></div></div>
      <div className="table-wrap"><table className="prospect-table"><thead><tr><th>Campaign</th><th>Biaya iklan</th><th>Revenue</th><th>ROAS</th></tr></thead><tbody>
      {campaignRows.map(row=><tr key={row.name}><td><b>{row.name}</b></td><td>{money(row.adSpend)}</td><td>{money(row.revenue)}</td><td>{row.roas===null?"—":row.roas.toFixed(2)+"x"}</td></tr>)}
      {!campaignRows.length&&<tr><td colSpan="4"><div className="wf-empty">Belum ada data campaign. Tambahkan biaya iklan dan hubungkan campaign yang sama pada order.</div></td></tr>}
      </tbody></table></div>
    </div>
    <div className="panel wf-table-panel"><div className="panel-head"><div><b>Riwayat order</b><small>{orders.length} order tercatat</small></div></div>
      <div className="table-wrap"><table className="prospect-table"><thead><tr><th>Tanggal</th><th>Order</th><th>Prospek</th><th>Campaign</th><th>Revenue</th><th>Profit kotor</th><th>Status</th></tr></thead><tbody>
      {orders.map(o=><tr key={o.id}><td>{o.confirmed_at?new Date(o.confirmed_at).toLocaleDateString("id-ID"):"—"}</td><td><b>{o.order_number}</b></td><td>{prospects.find(p=>p.id===o.prospect_id)?.company||o.prospect_id}</td><td>{o.campaign||o.source||"—"}</td><td><b>{money(o.revenue)}</b></td><td>{money(o.gross_profit)}</td><td>{o.status}</td></tr>)}
      {!loading&&!orders.length&&<tr><td colSpan="7"><div className="wf-empty">Belum ada confirmed order. Order pertama akan muncul di sini.</div></td></tr>}
      </tbody></table></div>
    </div>
    <p className="wf-disclaimer">Angka “setelah iklan” = revenue − biaya langsung − biaya iklan yang dicatat. Ini belum merupakan laba bersih perusahaan karena overhead, pajak, dan biaya lain belum dihitung. ROAS hanya akurat jika nama campaign pada order cocok dengan data biaya iklan.</p>
  </section>;
}
