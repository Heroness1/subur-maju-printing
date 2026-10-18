"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Menu, X, MessageCircle, Printer, Search, SlidersHorizontal } from "lucide-react";

const WA_NUMBER = "6282246926544";
const products = [
  { id: 1, name: "Banner & Spanduk", category: "Promosi", desc: "Untuk toko, acara, promosi, dan kebutuhan luar ruang.", image: "photo-1509223197845-458d87318791", tag: "Promosi" },
  { id: 2, name: "Stiker & Label", category: "Stiker", desc: "Label produk, stiker logo, kemasan, dan kebutuhan branding.", image: "photo-1634942536790-2531a9b7c3b4", tag: "Produk bisnis" },
  { id: 3, name: "Kartu Nama", category: "Bisnis", desc: "Identitas profesional untuk bisnis dan kebutuhan networking.", image: "photo- card-business", tag: "Bisnis" },
  { id: 4, name: "Brosur & Flyer", category: "Promosi", desc: "Materi promosi untuk dibagikan ke pelanggan.", image: "photo-1586953208448-b95a79798f07", tag: "Promosi" },
  { id: 5, name: "Poster", category: "Promosi", desc: "Materi visual untuk toko, acara, dan informasi produk.", image: "photo-1541701494587-cb58502866ab", tag: "Promosi" },
  { id: 6, name: "Undangan", category: "Kebutuhan khusus", desc: "Cetak undangan untuk acara dan momen spesial.", image: "photo-1519741497674-611481863552", tag: "Acara" },
  { id: 7, name: "Kemasan & Packaging", category: "Bisnis", desc: "Tanyakan opsi cetak untuk kebutuhan kemasan produk.", image: "photo-1607082349566-187342175e2f", tag: "Produk bisnis" },
  { id: 8, name: "Dokumen & Buku", category: "Kebutuhan khusus", desc: "Kebutuhan cetak dokumen, booklet, dan materi presentasi.", image: "photo-1455390582262-044c732e152e", tag: "Cetak dokumen" },
];
const categories = ["Semua", "Promosi", "Stiker", "Bisnis", "Kebutuhan khusus"];
const photo = (id) => id === "photo- card-business"
  ? "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80"
  : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const orderLink = (name) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo Kak, saya ingin tanya harga ${name} di Subur Maju Printing. Boleh info pilihan ukuran, bahan, minimum order, dan estimasi pengerjaannya?`) }`;

export default function Home() {
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleProducts = useMemo(() => products.filter((product) =>
    (category === "Semua" || product.category === category) &&
    (product.name + " " + product.desc).toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  return (
    <main>
      <header className="site-header">
        <a href="#home" className="brand" aria-label="Subur Maju Printing beranda">
          <span className="brand-icon"><Printer size={20} /></span>
          <span><strong>SUBUR MAJU</strong><small>PRINTING · JAKARTA TIMUR</small></span>
        </a>
        <button className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? "main-nav nav-visible" : "main-nav"}>
          <a href="#katalog" onClick={() => setMenuOpen(false)}>Katalog</a>
          <a href="#cara-pesan" onClick={() => setMenuOpen(false)}>Cara pesan</a>
          <a className="header-order" href={orderLink("layanan percetakan")} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>Tanya harga <ArrowUpRight size={16}/></a>
        </nav>
      </header>

      <section className="catalog-hero" id="home">
        <div className="hero-copy">
          <span className="eyebrow"><i /> KATALOG PRODUK PERCETAKAN</span>
          <h1>Mau cetak<br /><em>apa hari ini?</em></h1>
          <p>Temukan kebutuhan cetak untuk promosi, usaha, acara, dan lainnya. Pilih produk, lalu tanya harga langsung lewat WhatsApp.</p>
          <a className="primary-button" href="#katalog">Lihat katalog <ArrowUpRight size={17}/></a>
          <div className="hero-trust"><span>01</span> PILIH PRODUK <b>·</b> TANYA HARGA <b>·</b> SEPAKATI DETAIL</div>
        </div>
        <div className="hero-photo" role="img" aria-label="Contoh produk cetak untuk promosi dan bisnis">
          <span className="photo-label">IDE CETAK, JADI NYATA.</span>
        </div>
      </section>

      <section className="catalog-section" id="katalog">
        <div className="catalog-heading">
          <div><span className="section-label">PILIH SESUAI KEBUTUHAN</span><h2>Katalog <em>produk.</em></h2></div>
          <p>Belum tahu spesifikasinya? Santai, tanya dulu. Kami bantu diskusikan kebutuhan cetakmu.</p>
        </div>
        <div className="catalog-controls">
          <div className="category-list" aria-label="Filter kategori">
            {categories.map((item) => <button key={item} className={category === item ? "category-chip active" : "category-chip"} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <label className="search-box"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk..." aria-label="Cari produk"/></label>
        </div>
        <div className="result-line"><span><SlidersHorizontal size={14}/> {visibleProducts.length} produk</span><span>Gambar merupakan ilustrasi</span></div>
        {visibleProducts.length ? <div className="product-grid">
          {visibleProducts.map((product) => <article className="product-card" key={product.id}>
            <a className="product-photo" href={orderLink(product.name)} target="_blank" rel="noreferrer" aria-label={`Tanya harga ${product.name}`} style={{ backgroundImage: `url("${photo(product.image)}")` }}>
              <span className="product-tag">{product.tag}</span><span className="photo-arrow"><ArrowUpRight size={18}/></span>
            </a>
            <div className="product-info"><h3>{product.name}</h3><p>{product.desc}</p><div className="product-bottom"><span className="price-note">Harga sesuai spesifikasi</span><a href={orderLink(product.name)} target="_blank" rel="noreferrer">Tanya harga <ArrowUpRight size={15}/></a></div></div>
          </article>)}
        </div> : <div className="empty-state">Produk belum ditemukan. Coba kata kunci lain atau pilih kategori “Semua”.</div>}
        <div className="custom-order"><div><span className="section-label">PUNYA KEBUTUHAN LAIN?</span><h3>Belum ada di katalog?</h3><p>Hubungi kami untuk mendiskusikan jenis cetak, ukuran, jumlah, dan tenggat yang kamu butuhkan.</p></div><a className="primary-button" href={orderLink("produk di luar katalog")} target="_blank" rel="noreferrer">Tanya produk lain <MessageCircle size={17}/></a></div>
      </section>

      <section className="order-section" id="cara-pesan">
        <div className="order-intro"><span className="section-label light-label">CARA PESAN</span><h2>Gampang kok,<br /><em>mulai dari chat.</em></h2><p>Belum perlu tahu semua detail. Ceritakan dulu kebutuhanmu, nanti kita bahas bersama.</p><a href={orderLink("kebutuhan cetak")} target="_blank" rel="noreferrer" className="primary-button light-button">Chat Subur Maju <MessageCircle size={17}/></a></div>
        <ol className="order-steps"><li><span>01</span><div><strong>Pilih produk</strong><p>Cari produk yang sesuai di katalog.</p></div></li><li><span>02</span><div><strong>Tanya harga</strong><p>Kirim kebutuhan dan tanyakan pilihan bahan atau ukuran.</p></div></li><li><span>03</span><div><strong>Konfirmasi pesanan</strong><p>Sepakati harga, jumlah, dan estimasi sebelum produksi.</p></div></li></ol>
      </section>

      <footer className="site-footer"><a href="#home" className="brand"><span className="brand-icon"><Printer size={19}/></span><span><strong>SUBUR MAJU</strong><small>PRINTING · JAKARTA TIMUR</small></span></a><span className="footer-note">KATALOG PERCETAKAN</span><span className="copyright">© {new Date().getFullYear()} Subur Maju Printing</span></footer>
    </main>
  );
}
