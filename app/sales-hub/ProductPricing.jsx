"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, KeyRound, Package, Plus, RefreshCw, Save, X, History } from "lucide-react";
import "./product-pricing.css";

const EMPTY = {
  sku: "", product_name: "", category: "Outdoor & Banner", variant: "", unit: "pcs", moq: 1,
  material_cost: 0, print_cost: 0, finishing_cost: 0, labor_cost: 0, other_cost: 0,
  selling_price: 0, active: true, notes: "", price_change_note: ""
};
const money = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const numberFields = ["moq", "material_cost", "print_cost", "finishing_cost", "labor_cost", "other_cost", "selling_price"];

export default function ProductPricing() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState([]);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    const saved = window.sessionStorage.getItem("smp_product_admin_key") || "";
    if (saved) { setAdminKey(saved); verify(saved, false); }
  }, []);

  async function request(path = "", init = {}, key = adminKey) {
    return fetch("/api/product-master" + path, {
      ...init, cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key, ...(init.headers || {}) }
    });
  }

  async function verify(key, persist = true) {
    setLoading(true); setError("");
    try {
      const response = await request("", { method: "GET" }, key);
      if (response.status === 401) throw new Error("Password salah.");
      if (!response.ok) throw new Error(response.status === 503 ? "Admin password belum dipasang di Vercel." : "Gagal membuka Product & Pricing.");
      const data = await response.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
      setAdminKey(key); setUnlocked(true);
      if (persist) window.sessionStorage.setItem("smp_product_admin_key", key);
    } catch (err) { setError(err.message || "Tidak dapat memverifikasi password."); }
    finally { setLoading(false); }
  }

  async function loadProducts() {
    if (!adminKey) return;
    setLoading(true); setError("");
    try {
      const response = await request();
      if (!response.ok) throw new Error("Gagal memuat master produk.");
      const data = await response.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function logout() {
    window.sessionStorage.removeItem("smp_product_admin_key");
    setAdminKey(""); setKeyInput(""); setUnlocked(false); setProducts([]);
    setEditingId(""); setForm(EMPTY); setHistory([]); setHistoryProduct(null);
  }

  function editProduct(product) {
    setEditingId(product.id);
    setForm({ ...EMPTY, ...product, price_change_note: "" });
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const payload = { ...form };
    for (const key of numberFields) payload[key] = Number(payload[key] || 0);
    try {
      const response = await request(editingId ? "/" + encodeURIComponent(editingId) : "", {
        method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.details?.join(", ") || (data.error === "server_error" ? "SKU mungkin sudah digunakan atau server mengalami masalah." : "Gagal menyimpan produk."));
      setNotice(editingId ? "Perubahan produk berhasil disimpan." : "Produk berhasil ditambahkan.");
      setEditingId(""); setForm(EMPTY);
      await loadProducts();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function archiveProduct(product) {
    if (!window.confirm("Arsipkan " + product.product_name + "? Data dan riwayat harga tetap disimpan.")) return;
    setError(""); setNotice("");
    try {
      const response = await request("/" + encodeURIComponent(product.id), { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal mengarsipkan produk.");
      setNotice("Produk diarsipkan; data historis tetap aman.");
      await loadProducts();
    } catch (err) { setError(err.message); }
  }

  async function showHistory(product) {
    setHistoryProduct(product); setHistory([]);
    try {
      const response = await request("/" + encodeURIComponent(product.id) + "/history");
      const data = await response.json();
      if (!response.ok) throw new Error("Gagal mengambil riwayat.");
      setHistory(data.history || []);
    } catch (err) { setError(err.message); }
  }

  const visible = useMemo(() => products.filter(p => filter === "all" || (filter === "active" ? p.active : !p.active)), [products, filter]);
  const totals = useMemo(() => ({
    count: products.filter(p => p.active).length,
    value: products.filter(p => p.active).reduce((sum,p)=>sum+Number(p.selling_price||0),0),
    averageMargin: products.filter(p=>p.active && Number(p.selling_price)>0).length
      ? products.filter(p=>p.active && Number(p.selling_price)>0).reduce((sum,p)=>sum+Number(p.gross_margin_percent||0),0) / products.filter(p=>p.active && Number(p.selling_price)>0).length : 0
  }), [products]);

  const cost = numberFields.slice(1, 6).reduce((sum,key)=>sum+Number(form[key]||0),0);
  const profit = Number(form.selling_price||0)-cost;
  const margin = Number(form.selling_price||0)>0 ? profit/Number(form.selling_price)*100 : 0;

  if (!unlocked) return (
    <section className="hub-page product-pricing">
      <header className="pp-heading"><div><span className="page-eyebrow">INTERNAL CATALOG CONTROL</span><h1>Product & Pricing</h1><p>Master data produk, biaya produksi, harga jual, dan margin Subur Maju.</p></div></header>
      <form className="pp-lock panel" onSubmit={e=>{e.preventDefault();verify(keyInput);}}>
        <div className="pp-lock-icon"><KeyRound size={24}/></div>
        <h2>Admin access required</h2>
        <p>Masukkan password khusus Product & Pricing untuk membuka pengelolaan data.</p>
        <input type="password" autoComplete="current-password" value={keyInput} onChange={e=>setKeyInput(e.target.value)} placeholder="Password admin" required/>
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Memverifikasi…" : "Buka Product & Pricing"}</button>
        {error && <div className="pp-alert">{error}</div>}
      </form>
    </section>
  );

  return (
    <section className="hub-page product-pricing">
      <header className="pp-heading">
        <div><span className="page-eyebrow">INTERNAL CATALOG CONTROL</span><h1>Product & Pricing</h1><p>Satu sumber data untuk biaya, harga jual, MOQ, dan margin setiap produk.</p></div>
        <div className="pp-actions"><button className="btn-secondary" onClick={loadProducts} disabled={loading}><RefreshCw size={15}/> Refresh</button><button className="btn-secondary" onClick={logout}><KeyRound size={15}/> Lock</button></div>
      </header>

      <div className="pp-metrics">
        <article><span>Produk aktif</span><b>{totals.count}</b></article>
        <article><span>Rata-rata gross margin</span><b>{totals.averageMargin.toFixed(1)}%</b></article>
        <article><span>Jumlah varian / SKU aktif</span><b>{totals.count}</b></article>
      </div>

      <div className="pp-layout">
        <form className="panel pp-form" onSubmit={saveProduct}>
          <div className="panel-head"><div><b>{editingId ? "Edit product / variant" : "Tambah product / variant"}</b><small>Setiap SKU mewakili satu kombinasi produk dan spesifikasi</small></div><Package size={18}/></div>
          <div className="pp-fields">
            <label>SKU<input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="BANNER-FLEXI-280" required/></label>
            <label>Nama produk<input value={form.product_name} onChange={e=>setForm({...form,product_name:e.target.value})} placeholder="Spanduk Flexi" required/></label>
            <label>Kategori<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["Outdoor & Banner","Atribut & Kantor","Merchandise & Event","Packaging & Buku","Lainnya"].map(v=><option key={v}>{v}</option>)}</select></label>
            <label>Varian / spesifikasi<input value={form.variant||""} onChange={e=>setForm({...form,variant:e.target.value})} placeholder="Flexi 280 gsm"/></label>
            <div className="pp-two"><label>Satuan<input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} placeholder="m² / pcs / rim"/></label><label>MOQ<input type="number" min="0" step="1" value={form.moq} onChange={e=>setForm({...form,moq:e.target.value})}/></label></div>
            <div className="pp-cost-title">Biaya produksi per satuan</div>
            <div className="pp-two"><label>Bahan baku (Rp)<input type="number" min="0" value={form.material_cost} onChange={e=>setForm({...form,material_cost:e.target.value})}/></label><label>Biaya cetak (Rp)<input type="number" min="0" value={form.print_cost} onChange={e=>setForm({...form,print_cost:e.target.value})}/></label></div>
            <div className="pp-two"><label>Finishing (Rp)<input type="number" min="0" value={form.finishing_cost} onChange={e=>setForm({...form,finishing_cost:e.target.value})}/></label><label>Tenaga kerja (Rp)<input type="number" min="0" value={form.labor_cost} onChange={e=>setForm({...form,labor_cost:e.target.value})}/></label></div>
            <label>Biaya lain-lain (Rp)<input type="number" min="0" value={form.other_cost} onChange={e=>setForm({...form,other_cost:e.target.value})}/></label>
            <label>Harga jual per satuan (Rp)<input type="number" min="0" value={form.selling_price} onChange={e=>setForm({...form,selling_price:e.target.value})} required/></label>
            {editingId && <label>Catatan perubahan harga<input value={form.price_change_note||""} onChange={e=>setForm({...form,price_change_note:e.target.value})} placeholder="Contoh: kenaikan harga bahan"/></label>}
            <label>Catatan internal<textarea rows="2" value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Spesifikasi / catatan workshop"/></label>
          </div>
          <div className="pp-profit"><div><span>Total biaya / unit</span><b>{money(cost)}</b></div><div><span>Laba kotor / unit</span><b className={profit>=0?"positive":"negative"}>{money(profit)}</b></div><div><span>Gross margin</span><b>{margin.toFixed(1)}%</b></div></div>
          <div className="pp-form-actions"><button className="btn-primary" type="submit" disabled={saving}><Save size={15}/>{saving ? "Menyimpan…" : editingId ? "Simpan perubahan" : "Tambah produk"}</button>{editingId && <button className="btn-secondary" type="button" onClick={()=>{setEditingId("");setForm(EMPTY);}}><X size={15}/> Batal</button>}</div>
        </form>

        <div className="panel pp-list">
          <div className="panel-head"><div><b>Master produk</b><small>{visible.length} SKU ditampilkan</small></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="active">Aktif</option><option value="all">Semua</option><option value="archived">Diarsipkan</option></select></div>
          {error && <div className="pp-alert">{error}</div>}{notice && <div className="pp-notice">{notice}</div>}
          <div className="pp-table-wrap"><table><thead><tr><th>Produk / SKU</th><th>Biaya</th><th>Harga jual</th><th>Profit / margin</th><th>Aksi</th></tr></thead><tbody>
            {visible.map(p=><tr key={p.id}><td><b>{p.product_name}</b><small>{p.sku} · {p.category}</small><small>{p.variant || "Standard"} · MOQ {p.moq} {p.unit}</small></td><td>{money(p.unit_cost)}</td><td>{money(p.selling_price)}</td><td><b className={p.gross_profit>=0?"positive":"negative"}>{money(p.gross_profit)}</b><small>{Number(p.gross_margin_percent||0).toFixed(1)}% margin</small></td><td><div className="pp-row-actions"><button type="button" onClick={()=>editProduct(p)}>Edit</button><button type="button" onClick={()=>showHistory(p)} title="Riwayat harga"><History size={14}/></button>{p.active && <button type="button" onClick={()=>archiveProduct(p)} title="Arsipkan"><Archive size={14}/></button>}</div></td></tr>)}
            {!visible.length && <tr><td colSpan="5"><div className="pp-empty">{loading ? "Memuat data…" : "Belum ada SKU. Tambahkan produk pertama dari formulir."}</div></td></tr>}
          </tbody></table></div>
          {historyProduct && <div className="pp-history"><div className="panel-head"><div><b>Riwayat harga · {historyProduct.product_name}</b><small>Perubahan biaya dan harga jual</small></div><button className="btn-secondary" onClick={()=>setHistoryProduct(null)}>Tutup</button></div>{history.length ? history.map(h=><div className="pp-history-row" key={h.id}><span>{new Date(h.changed_at).toLocaleString("id-ID")}</span><b>{money(h.old_selling_price)} → {money(h.new_selling_price)}</b><small>{h.note || "Tidak ada catatan"}</small></div>) : <p className="pp-empty">Belum ada riwayat perubahan.</p>}</div>}
        </div>
      </div>
      <p className="pp-footnote">Catatan: harga dan biaya disimpan di SalesHub. Gross margin dihitung dari harga jual dikurangi biaya produksi langsung; overhead, pajak, dan biaya operasional belum termasuk.</p>
    </section>
  );
}
