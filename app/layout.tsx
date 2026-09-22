import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Noto_Serif_Bengali } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const serif = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif-bn",
  display: "swap",
});

const sans = Hind_Siliguri({
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
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
