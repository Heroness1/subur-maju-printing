"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Box, CalendarDays, CheckCircle2,
  ChevronDown, Clock3, FileText, Menu, MessageCircle, PackageCheck,
  Printer, Search, ShieldCheck, Sparkles, Truck, X
} from "lucide-react";

const WA_NUMBER = "6282246926544";

const products = [
  { id: 1, name: "Banner & Spanduk", category: "Promosi", desc: "Media promosi untuk toko, event, pameran, dan kebutuhan outdoor.", image: "photo-1509223197845-458d87318791", tag: "Promosi" },
  { id: 2, name: "Stiker & Label", category: "Stiker & Label", desc: "Stiker logo, label produk, dan kebutuhan identitas kemasan.", image: "photo-1634942536790-2531a9b7c3b4", tag: "Branding produk" },
  { id: 3, name: "Kartu Nama", category: "Bisnis", desc: "Kartu nama untuk identitas profesional dan networking bisnis.", image: "photo-1544816155-12df9643f363", tag: "Kebutuhan kantor" },
  { id: 4, name: "Brosur & Flyer", category: "Promosi", desc: "Materi cetak untuk memperkenalkan produk, layanan, dan promo.", image: "photo-1586953208448-b95a79798f07", tag: "Promosi" },
  { id: 5, name: "Poster", category: "Promosi", desc: "Materi visual untuk informasi, promosi, dan kebutuhan event.", image: "photo-1541701494587-cb585028abf4", tag: "Promosi" },
  { id: 6, name: "Undangan", category: "Dokumen", desc: "Cetak undangan untuk acara perusahaan maupun kebutuhan personal.", image: "photo-1519741497674-611481863552", tag: "Acara" },
  { id: 7, name: "Kemasan & Packaging", category: "Kemasan", desc: "Kemasan custom untuk mendukung tampilan dan identitas produk.", image: "photo-1607082349566-187342175e2f", tag: "Produk bisnis" },
  { id: 8, name: "Dokumen & Buku", category: "Dokumen", desc: "Kebutuhan cetak dokumen, booklet, buku, dan materi presentasi.", image: "photo-1455390582262-044c732e152e", tag: "Kebutuhan kantor" },
  { id: 9, name: "Kalender Meja", category: "Kalender", desc: "Kalender custom untuk kebutuhan promosi dan merchandise perusahaan.", image: "photo-1506784983877-45594", tag: "Corporate" },
  { id: 10, name: "Kalender Dinding", category: "Kalender", desc: "Kalender custom untuk branding, hadiah, dan kebutuhan kantor.", image: "photo-1506784983877-45594", tag: "Corporate" },
  { id: 11, name: "Nota & Formulir", category: "Bisnis", desc: "Cetak nota, formulir, dan kebutuhan administrasi usaha.", image: "photo-1586282391129-76a6df230234", tag: "Operasional bisnis" },
  { id: 12, name: "Merchandise Custom", category: "Merchandise", desc: "Produk promosi dan merchandise untuk event maupun perusahaan.", image: "photo-1513506003901-1e6a229e2d15", tag: "Corporate gift" }
];

const categories = ["Semua", "Promosi", "Stiker & Label", "Bisnis", "Kalender", "Kemasan", "Dokumen", "Merchandise"];
const photo = (id) => "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=1000&q=85";

function orderLink(name, purpose) {
  const message = "Halo Subur Maju Printing, saya ingin konsultasi/ meminta penawaran untuk " + name + ". " +
    (purpose || "Mohon info pilihan ukuran, bahan, minimum order, harga, dan estimasi pengerjaan.") +
    " Terima kasih.";
  return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(message);
}

function WhatsAppLink({ children, product, purpose, className, onClick, ...props }) {
  return (
    <a
      href={orderLink(product || "layanan percetakan", purpose)}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={(event) => {
        if (typeof window !== "undefined" && typeof window.gtag === "function") {
          window.gtag("event", "whatsapp_click", { product_name: product || "general_inquiry" });
        }
        if (onClick) onClick(event);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

export default function Home() {
  const [category, setCategory] = useState("Semua");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === "Semua" || product.category === category;
    const matchesQuery = (product.name + " " + product.desc + " " + product.tag)
      .toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  }), [category, query]);

  const chooseCategory = (item) => {
    setCategory(item);
    setQuery("");
    document.getElementById("katalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main id="home">
      <div className="announcement-bar">
        <span><PackageCheck size={14} /> Solusi cetak untuk bisnis, kantor, event, dan kebutuhan personal</span>
        <WhatsAppLink product="konsultasi percetakan" className="announcement-link">Konsultasi WhatsApp <ArrowUpRight size={13} /></WhatsAppLink>
      </div>

      <header className="site-header">
        <a href="#home" className="brand" aria-label="Subur Maju Printing beranda">
          <span className="brand-icon"><Printer size={21} /></span>
          <span className="brand-copy"><strong>SUBUR MAJU</strong><small>PRINTING · JAKARTA TIMUR</small></span>
        </a>
        <button className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={menuOpen ? "main-nav nav-visible" : "main-nav"} aria-label="Navigasi utama">
          <a href="#katalog" onClick={() => setMenuOpen(false)}>Katalog</a>
          <a href="#keunggulan" onClick={() => setMenuOpen(false)}>Layanan</a>
          <a href="#cara-pesan" onClick={() => setMenuOpen(false)}>Cara pesan</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
          <WhatsAppLink product="kebutuhan cetak saya" className="header-order" onClick={() => setMenuOpen(false)}>Minta penawaran <ArrowUpRight size={16} /></WhatsAppLink>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> PUSAT KEBUTUHAN PERCETAKAN</div>
          <h1>Semua kebutuhan cetak, <em>lebih mudah.</em></h1>
          <p className="hero-description">Dari materi promosi sampai kebutuhan cetak perusahaan. Temukan produk yang kamu butuhkan, konsultasikan spesifikasinya, lalu minta penawaran langsung.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#katalog">Jelajahi katalog <ArrowRight size={17} /></a>
            <WhatsAppLink product="konsultasi kebutuhan cetak" className="secondary-button">Konsultasi dulu <MessageCircle size={17} /></WhatsAppLink>
          </div>
          <div className="hero-benefits">
            <span><CheckCircle2 size={15} /> Konsultasi spesifikasi</span>
            <span><CheckCircle2 size={15} /> Penawaran sesuai kebutuhan</span>
            <span><CheckCircle2 size={15} /> Untuk satuan & partai besar*</span>
          </div>
          <small className="hero-footnote">*Minimum order mengikuti jenis produk dan spesifikasi.</small>
        </div>
        <div className="hero-visual" aria-label="Contoh kebutuhan produk percetakan">
          <div className="hero-image-main" style={{ backgroundImage: "url('" + photo("photo-1581091226825-a6a2a5aee158") + "')" }}>
            <span className="image-caption">IDE CETAK UNTUK BISNIS</span>
          </div>
          <div className="hero-image-card hero-image-card-top" style={{ backgroundImage: "url('" + photo("photo-1544816155-12df9643f363") + "')" }}>
            <span>Kartu nama & stationery</span>
          </div>
          <div className="hero-image-card hero-image-card-bottom" style={{ backgroundImage: "url('" + photo("photo-1607082349566-187342175e2f") + "')" }}>
            <span>Packaging & label</span>
          </div>
          <div className="hero-sticker"><Sparkles size={16} /><span>Custom sesuai<br />kebutuhanmu</span></div>
        </div>
      </section>

      <section className="quick-discovery" aria-label="Pencarian produk">
        <div className="quick-search-heading">
          <div><span className="section-kicker">MAU CETAK APA?</span><h2>Mulai dari kebutuhanmu.</h2></div>
          <p>Pilih kategori atau cari nama produk untuk menemukan layanan yang sesuai.</p>
        </div>
        <div className="quick-search-row">
          <label className="global-search">
            <Search size={19} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setCategory("Semua"); }} placeholder="Cari stiker, banner, kalender, packaging..." aria-label="Cari produk percetakan" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian"><X size={16} /></button>}
          </label>
          <a className="search-submit" href="#katalog">Cari produk <ArrowRight size={16} /></a>
        </div>
        <div className="popular-searches"><strong>Sering dicari:</strong>{["Banner", "Stiker", "Kalender", "Packaging", "Brosur"].map((term) => <button key={term} onClick={() => { setQuery(term); setCategory("Semua"); document.getElementById("katalog")?.scrollIntoView({ behavior: "smooth" }); }}>{term}</button>)}</div>
      </section>

      <section className="category-section" aria-label="Kategori produk">
        <div className="section-heading-row">
          <div><span className="section-kicker">TEMUKAN PRODUK</span><h2>Kategori <em>percetakan.</em></h2></div>
          <a href="#katalog" className="text-link">Lihat semua produk <ArrowUpRight size={15} /></a>
        </div>
        <div className="category-tiles">
          <button className="category-tile category-tile-large" onClick={() => chooseCategory("Promosi")} style={{ backgroundImage: "linear-gradient(0deg,rgba(25,29,25,.76),rgba(25,29,25,.04)),url('" + photo("photo-1509223197845-458d87318791") + "')" }}><span>01</span><strong>Banner &<br />materi promosi</strong><small>Lihat produk <ArrowUpRight size={13} /></small></button>
          <button className="category-tile" onClick={() => chooseCategory("Stiker & Label")} style={{ backgroundImage: "linear-gradient(0deg,rgba(25,29,25,.76),rgba(25,29,25,.04)),url('" + photo("photo-1634942536790-2531a9b7c3b4") + "')" }}><span>02</span><strong>Stiker & label</strong><small>Lihat produk <ArrowUpRight size={13} /></small></button>
          <button className="category-tile" onClick={() => chooseCategory("Kemasan")} style={{ backgroundImage: "linear-gradient(0deg,rgba(25,29,25,.76),rgba(25,29,25,.04)),url('" + photo("photo-1607082349566-187342175e2f") + "')" }}><span>03</span><strong>Kemasan</strong><small>Lihat produk <ArrowUpRight size={13} /></small></button>
          <button className="category-tile" onClick={() => chooseCategory("Bisnis")} style={{ backgroundImage: "linear-gradient(0deg,rgba(25,29,25,.76),rgba(25,29,25,.04)),url('" + photo("photo-1544816155-12df9643f363") + "')" }}><span>04</span><strong>Bisnis & kantor</strong><small>Lihat produk <ArrowUpRight size={13} /></small></button>
          <button className="category-tile" onClick={() => chooseCategory("Kalender")} style={{ backgroundImage: "linear-gradient(0deg,rgba(25,29,25,.76),rgba(25,29,25,.04)),url('" + photo("photo-1506784983877-45594") + "')" }}><span>05</span><strong>Kalender</strong><small>Lihat produk <ArrowUpRight size={13} /></small></button>
        </div>
      </section>

      <section className="catalog-section" id="katalog">
        <div className="section-heading-row catalog-heading">
          <div><span className="section-kicker">KATALOG SUBUR MAJU</span><h2>Produk untuk berbagai <em>kebutuhan.</em></h2><p>Pilih produk untuk melihat detail awal dan konsultasikan spesifikasi serta harga melalui WhatsApp.</p></div>
          <div className="catalog-count"><strong>{visibleProducts.length.toString().padStart(2, "0")}</strong><span>produk ditampilkan</span></div>
        </div>
        <div className="catalog-toolbar">
          <div className="category-filters" aria-label="Filter kategori">
            {categories.map((item) => <button key={item} className={category === item ? "filter-chip active" : "filter-chip"} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <label className="catalog-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari di katalog..." aria-label="Cari di katalog" /></label>
        </div>
        {visibleProducts.length ? (
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-photo" style={{ backgroundImage: "url('" + photo(product.image) + "')" }}>
                  <span className="product-tag">{product.tag}</span>
                  <span className="product-photo-icon"><Printer size={16} /></span>
                </div>
                <div className="product-info">
                  <div className="product-title-row"><h3>{product.name}</h3><span className="product-custom">Custom</span></div>
                  <p>{product.desc}</p>
                  <div className="product-card-bottom">
                    <span className="price-label">Harga sesuai spesifikasi</span>
                    <WhatsAppLink product={product.name} className="product-cta">Tanya harga <ArrowUpRight size={15} /></WhatsAppLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state"><Search size={24} /><strong>Produk belum ditemukan</strong><p>Coba kata kunci lain atau pilih kategori yang berbeda.</p><button onClick={() => { setCategory("Semua"); setQuery(""); }}>Tampilkan semua produk</button></div>
        )}
        <div className="catalog-more"><span>Belum menemukan produk yang dicari?</span><WhatsAppLink product="produk custom di luar katalog" className="text-link">Tanyakan kebutuhan custom <ArrowRight size={15} /></WhatsAppLink></div>
      </section>

      <section className="b2b-section" id="keunggulan">
        <div className="b2b-visual">
          <div className="b2b-photo" style={{ backgroundImage: "url('" + photo("photo-1581092160562-40aa08e78837") + "')" }} />
          <div className="b2b-note"><Box size={20} /><div><strong>Pesanan partai besar?</strong><span>Diskusikan kebutuhan dan spesifikasinya bersama tim kami.</span></div></div>
        </div>
        <div className="b2b-copy">
          <span className="section-kicker">UNTUK BISNIS & KORPORAT</span>
          <h2>Kebutuhan cetak perusahaan? <em>Kami siap diskusi.</em></h2>
          <p>Untuk pengadaan kantor, kebutuhan promosi, event, maupun pesanan dalam jumlah besar, sampaikan detail kebutuhanmu agar kami dapat membantu menyiapkan penawaran yang sesuai.</p>
          <ul className="b2b-checklist">
            <li><CheckCircle2 size={17} /> Konsultasi jenis produk dan spesifikasi</li>
            <li><CheckCircle2 size={17} /> Penawaran berdasarkan kuantitas dan kebutuhan</li>
            <li><CheckCircle2 size={17} /> Diskusi timeline dan pengiriman</li>
          </ul>
          <WhatsAppLink product="permintaan penawaran B2B / korporat" purpose="Saya ingin meminta penawaran untuk kebutuhan perusahaan. Mohon pandu saya untuk mengirim jenis produk, jumlah, ukuran, bahan, dan deadline." className="primary-button">Diskusikan kebutuhan B2B <ArrowUpRight size={17} /></WhatsAppLink>
        </div>
      </section>

      <section className="service-strip">
        <div><ShieldCheck size={22} /><span><strong>Spesifikasi dibahas di awal</strong><small>Ukuran, bahan, dan jumlah dikonfirmasi sebelum produksi.</small></span></div>
        <div><BadgeCheck size={22} /><span><strong>Penawaran lebih terarah</strong><small>Harga disesuaikan dengan detail pesanan.</small></span></div>
        <div><Truck size={22} /><span><strong>Diskusi pengiriman</strong><small>Alamat dan kebutuhan pengiriman dibahas saat pemesanan.</small></span></div>
        <div><MessageCircle size={22} /><span><strong>Komunikasi langsung</strong><small>Konsultasikan kebutuhan melalui WhatsApp.</small></span></div>
      </section>

      <section className="how-section" id="cara-pesan">
        <div className="how-heading"><span className="section-kicker">CARA PEMESANAN</span><h2>Dari kebutuhan sampai <em>siap dicetak.</em></h2><p>Alur sederhana supaya detail pesanan jelas sebelum masuk proses produksi.</p></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">01</span><div className="step-icon"><Search size={22} /></div><h3>Pilih produk</h3><p>Temukan jenis produk yang sesuai dengan kebutuhanmu di katalog.</p></article>
          <article className="step-card"><span className="step-number">02</span><div className="step-icon"><MessageCircle size={22} /></div><h3>Konsultasi & penawaran</h3><p>Kirim detail ukuran, bahan, jumlah, desain, dan deadline untuk dibahas.</p></article>
          <article className="step-card"><span className="step-number">03</span><div className="step-icon"><FileText size={22} /></div><h3>Konfirmasi pesanan</h3><p>Pastikan spesifikasi, harga, dan estimasi pengerjaan sudah disepakati.</p></article>
          <article className="step-card"><span className="step-number">04</span><div className="step-icon"><PackageCheck size={22} /></div><h3>Produksi & pengiriman</h3><p>Pesanan diproses sesuai detail yang telah dikonfirmasi bersama.</p></article>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-intro"><span className="section-kicker">BUTUH INFORMASI?</span><h2>Pertanyaan yang <em>sering muncul.</em></h2><p>Belum menemukan jawaban? Tim kami bisa membantu lewat WhatsApp.</p><WhatsAppLink product="pertanyaan seputar percetakan" className="text-link">Hubungi tim kami <ArrowUpRight size={15} /></WhatsAppLink></div>
        <div className="faq-list">
          <details><summary>Bagaimana cara mendapatkan harga cetak? <ChevronDown size={18} /></summary><p>Kirim jenis produk, ukuran, bahan, jumlah pesanan, dan deadline melalui WhatsApp. Tim kami akan membantu membahas spesifikasi dan penawarannya.</p></details>
          <details><summary>Apakah bisa pesan dengan desain custom? <ChevronDown size={18} /></summary><p>Konsultasikan kebutuhan desain dan spesifikasi produk kepada tim kami. Sertakan contoh atau referensi jika sudah tersedia.</p></details>
          <details><summary>Apakah menerima pesanan perusahaan atau partai besar? <ChevronDown size={18} /></summary><p>Silakan hubungi kami dengan informasi jenis produk dan estimasi kuantitas. Kami akan membantu membahas kebutuhan pengadaan dan penawarannya.</p></details>
          <details><summary>Berapa minimum order dan lama pengerjaan? <ChevronDown size={18} /></summary><p>Minimum order dan estimasi pengerjaan berbeda untuk setiap jenis produk, bahan, serta jumlah. Hubungi kami untuk mendapatkan informasi sesuai kebutuhan pesananmu.</p></details>
          <details><summary>Informasi apa yang perlu disiapkan sebelum konsultasi? <ChevronDown size={18} /></summary><p>Siapkan jenis produk, ukuran, bahan jika sudah diketahui, jumlah, file desain atau referensi, deadline, dan lokasi pengiriman.</p></details>
        </div>
      </section>

      <section className="final-cta">
        <div><span className="section-kicker">ADA YANG INGIN DICETAK?</span><h2>Yuk, mulai dari <em>konsultasi.</em></h2><p>Ceritakan kebutuhan cetakmu. Kami bantu diskusikan langkah berikutnya.</p></div>
        <WhatsAppLink product="konsultasi kebutuhan cetak" className="final-cta-button">Chat Subur Maju <MessageCircle size={18} /></WhatsAppLink>
      </section>

      <footer className="site-footer">
        <a href="#home" className="brand" aria-label="Subur Maju Printing beranda">
          <span className="brand-icon"><Printer size={20} /></span>
          <span className="brand-copy"><strong>SUBUR MAJU</strong><small>PRINTING · JAKARTA TIMUR</small></span>
        </a>
        <div className="footer-links"><a href="#katalog">Katalog</a><a href="#keunggulan">Layanan</a><a href="#cara-pesan">Cara pesan</a><a href="#faq">FAQ</a></div>
        <div className="footer-contact"><span>Butuh bantuan memilih produk?</span><WhatsAppLink product="bantuan memilih produk" className="footer-wa">Hubungi WhatsApp <ArrowUpRight size={14} /></WhatsAppLink></div>
        <div className="copyright">© {new Date().getFullYear()} Subur Maju Printing. Seluruh hak cipta dilindungi.</div>
      </footer>

      <WhatsAppLink product="konsultasi kebutuhan cetak" className="floating-whatsapp" aria-label="Chat WhatsApp Subur Maju Printing"><MessageCircle size={21} /><span>Chat kami</span></WhatsAppLink>
    </main>
  );
}
