import type { Metadata, Viewport } from "next";
import { Noto_Sans_Bengali, Tiro_Bangla } from "next/font/google";
import { site } from "@/lib/site";
import NavProgress from "@/components/NavProgress";
import "./globals.css";

// Tiro Bangla: a calligraphic Bangla serif for headings (single weight — never faux-bold it).
const serif = Tiro_Bangla({
  subsets: ["bengali", "latin"],
  weight: "400",
  variable: "--font-serif-bn",
  display: "swap",
});

// Noto Sans Bengali: clean, even strokes at small sizes on phone screens.
const sans = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans-bn",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.nameBn} — ${site.nameEn}`, template: `%s | ${site.nameBn} — ${site.nameEn}` },
  description: site.description,
  icons: { icon: "/images/logo.png" },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    siteName: `${site.nameBn} — ${site.nameEn}`,
    title: `${site.nameBn} — ${site.nameEn}`,
    description: site.description,
    images: [{ url: "/images/logo-large.png", width: 1254, height: 1254, alt: "অবয়ব লোগো" }],
  },
};

export const viewport: Viewport = { themeColor: "#fbf8f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
