import "./globals.css";

export const metadata = {
  title: "Subur Maju Printing | Digital Printing Jakarta Timur",
  description:
    "Solusi digital printing untuk kebutuhan bisnis, acara, dan personal. Cetak banner, stiker, kebutuhan promosi, dan lainnya bersama Subur Maju Printing.",
  metadataBase: new URL("https://www.suburmajuprinting.com"),
  openGraph: {
    title: "Subur Maju Printing — Hasil Cetak yang Berbicara",
    description: "Digital printing untuk ide yang ingin terlihat.",
    type: "website",
    locale: "id_ID"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f3ed"
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}