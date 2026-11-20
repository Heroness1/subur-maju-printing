"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, PlusCircle, TrendingUp, ShoppingBag, Wallet } from "lucide-react";

const money = value => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value)||0);
const initial = { order_number:"", prospect_id:"", quotation_id:"", revenue:"", cogs:"", shipping_cost:"0", other_cost:"0", source:"", medium:"", campaign:"", gclid:"", notes:"" };

export default function OrdersRevenue() {
  const [orders,setOrders] = useState([]);
  const [prospects,setProspects] = useState([]);
  const [form,setForm] = useState(initial);
  const [showForm,setShowForm] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [orderRes,prospectRes] = await Promise.all([fetch("/api/orders?limit=1000",{cache:"no-store"}),fetch("/api/prospects?limit=500",{cache:"no-store"})]);
      if(!orderRes.ok) throw new Error("Data order belum tersedia. Pastikan migration 005 dan Worker terbaru sudah aktif.");
      const orderData = await orderRes.json();
      const prospectData = prospectRes.ok ? await prospectRes.json() : {prospects:[]};
      setOrders(Array.isArray(orderData.orders)?orderData.orders:[]);
      setProspects(Array.isArray(prospectData.prospects)?prospectData.prospects:[]);
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
      <div className="wf-actions"><button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button><button className="btn-primary" onClick={()=>setShowForm(v=>!v)}><PlusCircle size={15}/> Catat order</button></div>
    </div>
    {error && <div className="wf-error">{error}</div>}
    <div className="wf-metrics">
      <article><span><ShoppingBag size={15}/> Order aktif</span><b>{loading?"…":totals.count.toLocaleString("id-ID")}</b><small>Order tidak dibatalkan</small></article>
      <article><span><TrendingUp size={15}/> Revenue</span><b>{loading?"…":money(totals.revenue)}</b><small>Nilai order tercatat</small></article>
      <article><span><Wallet size={15}/> Biaya langsung</span><b>{loading?"…":money(totals.cost)}</b><small>HPP + ongkir + biaya lain</small></article>
      <article><span><TrendingUp size={15}/> Gross contribution</span><b>{loading?"…":money(profit)}</b><small>Belum dikurangi biaya iklan dan overhead</small></article>
    </div>
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
    <div className="panel wf-table-panel"><div className="panel-head"><div><b>Riwayat order</b><small>{orders.length} order tercatat</small></div></div>
      <div className="table-wrap"><table className="prospect-table"><thead><tr><th>Tanggal</th><th>Order</th><th>Prospek</th><th>Campaign</th><th>Revenue</th><th>Profit kotor</th><th>Status</th></tr></thead><tbody>
      {orders.map(o=><tr key={o.id}><td>{o.confirmed_at?new Date(o.confirmed_at).toLocaleDateString("id-ID"):"—"}</td><td><b>{o.order_number}</b></td><td>{prospects.find(p=>p.id===o.prospect_id)?.company||o.prospect_id}</td><td>{o.campaign||o.source||"—"}</td><td><b>{money(o.revenue)}</b></td><td>{money(o.gross_profit)}</td><td>{o.status}</td></tr>)}
      {!loading&&!orders.length&&<tr><td colSpan="7"><div className="wf-empty">Belum ada confirmed order. Order pertama akan muncul di sini.</div></td></tr>}
      </tbody></table></div>
    </div>
    <p className="wf-disclaimer">Profit kotor di sini = revenue − HPP − ongkir − biaya lain. Profit marketing bersih baru bisa dihitung setelah biaya campaign dan overhead dimasukkan serta atribusi order terhubung.</p>
  </section>;
}
