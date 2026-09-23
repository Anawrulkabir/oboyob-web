/**
 * The public address of the shop, used in the slip PDF, emails, sitemap and
 * link previews. NEXT_PUBLIC_SITE_URL wins (set it when you add your own
 * domain); on Vercel it otherwise falls back to the project's production
 * address (VERCEL_PROJECT_PRODUCTION_URL, e.g. oboyob.vercel.app).
 */
function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = explicit || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

export const site = {
  nameBn: "অবয়ব",
  nameEn: "Oboyob",
  tagline: "Wear your identity",
  description:
    "অবয়ব — দেশীয় তাঁতের শাড়ি, গহনা ও কম্বো। সারা বাংলাদেশে হোম ডেলিভারি।",
  url: siteUrl(),
  facebook: "https://www.facebook.com/share/1D87s4YsPs/",
  /** New-order alerts (lib/notify.ts); SELLER_EMAIL overrides it. */
  adminEmail: "oboyobfasion@gmail.com",
} as const;
