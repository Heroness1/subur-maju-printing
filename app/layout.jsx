import "./globals.css";

export const metadata = {
  title: "Digital Printing Jakarta Timur | Subur Maju Printing",
  description:
    "Temukan kebutuhan digital printing Subur Maju Printing: banner, stiker, kalender, brosur, packaging, merchandise, dan cetak kebutuhan bisnis. Konsultasi dan minta penawaran melalui WhatsApp.",
  metadataBase: new URL("https://suburmajuprinting.com"),
  openGraph: {
    title: "Subur Maju Printing — Katalog Digital Printing",
    description:
      "Katalog percetakan untuk kebutuhan bisnis, promosi, kantor, event, dan personal. Konsultasikan spesifikasi dan minta penawaran.",
    type: "website",
    locale: "id_ID",
    siteName: "Subur Maju Printing"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ed6b2d"
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
