"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Menu, X, MessageCircle, Sparkles, Clock3, Layers3, Printer } from "lucide-react";

const WA = "https://wa.me/6282246926544?text=" + encodeURIComponent("Halo Kak, saya ingin bertanya tentang layanan Subur Maju Printing.");
const services = [
  { no: "01", title: "Banner & Spanduk", desc: "Untuk promosi, acara, toko, dan kebutuhan ruang usaha.", image: "photo-1531058020387-3be344556be6", tag: "Promosi luar ruang" },
  { no: "02", title: "Stiker & Label", desc: "Bantu produk tampil lebih rapi, mudah dikenali, dan berkarakter.", image: "photo-1634942536790-2531a9b7c3b4", tag: "Identitas produk" },
  { no: "03", title: "Kebutuhan Bisnis", desc: "Materi cetak untuk mendukung komunikasi dan aktivitas brand.", image: "photo-1586953208448-b95a79798f07", tag: "Cetak kebutuhan usaha" },
];
const photo = (id, width = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <main>
      <header className="nav-shell">
        <a href="#home" className="brand" onClick={closeMenu} aria-label="Subur Maju Printing, beranda">
          <span className="brand-mark"><Printer size={19} strokeWidth={1.7} /></span>
          <span className="brand-copy"><strong>SUBUR MAJU</strong><small>PRINTING · JAKARTA</small></span>
        </a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
          <a href="#layanan" onClick={closeMenu}>Layanan</a>
          <a href="#tentang" onClick={closeMenu}>Tentang kami</a>
          <a href="#proses" onClick={closeMenu}>Cara pesan</a>
          <a className="nav-cta" href={WA} target="_blank" rel="noreferrer" onClick={closeMenu}>Konsultasi <ArrowUpRight size={15} /></a>
        </nav>
      </header>

      <section className="hero" id="home">
        <div className="hero-image" role="img" aria-label="Suasana produksi percetakan profesional" />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="eyebrow light"><span className="eyebrow-dot" /> DIGITAL PRINTING · JAKARTA TIMUR</div>
          <h1>Ide bagus<br />layak <em>terlihat.</em></h1>
          <p className="hero-lead">Kami membantu ide, bisnis, dan momen pentingmu hadir dalam bentuk cetakan yang nyata.</p>
          <div className="hero-actions">
            <a href="#layanan" className="button button-light">Jelajahi layanan <ArrowDownRight size={17} /></a>
            <a href={WA} target="_blank" rel="noreferrer" className="hero-text-link">Bicarakan kebutuhanmu <ArrowUpRight size={15} /></a>
          </div>
        </div>
        <div className="hero-caption"><span>01 / PRINT WITH PURPOSE</span><span>IDEA → FORM → IMPACT</span></div>
        <div className="hero-stamp"><Sparkles size={16} /><span>DETAIL<br />MATTERS</span></div>
      </section>

      <section className="intro section-pad" id="tentang">
        <div className="section-kicker"><span>01</span><span>LEBIH DARI SEKADAR CETAK</span></div>
        <div className="intro-grid">
          <h2>Dari sebuah ide,<br />menjadi <em>sesuatu</em><br />yang bisa disentuh.</h2>
          <div className="intro-copy"><p>Setiap materi cetak membawa pesan. Kami hadir untuk membantu pesan itu tampil dengan jelas—mulai dari kebutuhan promosi hingga detail yang membentuk identitas bisnismu.</p><a className="under-link" href={WA} target="_blank" rel="noreferrer">Ceritakan kebutuhanmu <ArrowUpRight size={16} /></a></div>
        </div>
        <div className="values-row">
          <div><span className="value-icon"><Check size={17}/></span><strong>Komunikasi jelas</strong><p>Kebutuhan dibahas sebelum produksi.</p></div>
          <div><span className="value-icon"><Layers3 size={17}/></span><strong>Beragam kebutuhan</strong><p>Pilihan cetak untuk banyak keperluan.</p></div>
          <div><span className="value-icon"><Clock3 size={17}/></span><strong>Respons cepat</strong><p>Hubungi tim untuk diskusi dan estimasi.</p></div>
        </div>
      </section>

      <section className="services section-pad" id="layanan">
        <div className="section-kicker"><span>02</span><span>APA YANG BISA KAMI CETAK</span></div>
        <div className="services-heading"><h2>Wujudkan ide.<br /><em>Cetak dampaknya.</em></h2><p>Mulai dari satu kebutuhan sederhana hingga materi untuk mendukung bisnismu. Temukan layanan yang sesuai, lalu konsultasikan detailnya dengan kami.</p></div>
        <div className="service-grid">{services.map((item) => <article className="service-card" key={item.no}>
          <a href={WA} target="_blank" rel="noreferrer" className="service-image" aria-label={`Tanyakan layanan ${item.title}`} style={{ backgroundImage: `url("${photo(item.image, 900)}")` }}>
            <span className="service-number">{item.no}</span><span className="service-arrow"><ArrowUpRight size={20}/></span>
          </a>
          <div className="service-meta">{item.tag}</div><h3>{item.title}</h3><p>{item.desc}</p>
          <a href={WA} target="_blank" rel="noreferrer" className="card-link">Tanya layanan <ArrowRight size={15}/></a>
        </article>)}</div>
        <div className="catalog-note"><span>Belum menemukan yang dicari?</span><a href={WA} target="_blank" rel="noreferrer">Tanyakan kebutuhan cetak lainnya <ArrowUpRight size={16}/></a></div>
      </section>

      <section className="process section-pad" id="proses">
        <div className="process-image" role="img" aria-label="Detail bahan dan proses produksi cetak" />
        <div className="process-content"><div className="section-kicker light"><span>03</span><span>SESEDERHANA ITU</span></div><h2>Dari ngobrol<br />sampai <em>jadi.</em></h2><p className="process-lead">Punya kebutuhan cetak? Kita mulai dari percakapan yang jelas.</p>
          <ol className="steps"><li><span>01</span><div><strong>Ceritakan kebutuhan</strong><p>Jenis produk, ukuran, jumlah, dan tenggat.</p></div></li><li><span>02</span><div><strong>Diskusikan detail</strong><p>Kami bantu membahas spesifikasi dan estimasi.</p></div></li><li><span>03</span><div><strong>Lanjutkan pesanan</strong><p>Sepakati detail sebelum proses produksi dimulai.</p></div></li></ol>
          <a href={WA} target="_blank" rel="noreferrer" className="button button-light">Mulai konsultasi <ArrowUpRight size={17}/></a>
        </div>
      </section>

      <section className="closing section-pad"><div className="closing-orbit">SM<span>✳</span></div><div className="section-kicker"><span>04</span><span>IDE KAMU, LANGKAH PERTAMA KITA</span></div><h2>Ada yang ingin<br /><em>kamu cetak?</em></h2><p>Ceritakan rencanamu. Kami bantu diskusikan kebutuhan dan pilihan cetaknya.</p><a href={WA} target="_blank" rel="noreferrer" className="button button-dark">Hubungi Subur Maju <MessageCircle size={17}/></a></section>

      <footer className="footer"><a href="#home" className="brand footer-brand"><span className="brand-mark"><Printer size={19}/></span><span className="brand-copy"><strong>SUBUR MAJU</strong><small>PRINTING · JAKARTA</small></span></a><span className="footer-note">CETAK DENGAN TUJUAN.</span><span className="footer-copy">© {new Date().getFullYear()} Subur Maju Printing</span></footer>
    </main>
  );
}