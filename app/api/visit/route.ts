import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Logs one page view for the admin visitor page. Location comes from Vercel's
// IP lookup headers; the IP address itself is never stored.

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|preview|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch/i;
const COOKIE = "zv";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function device(ua: string) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Where a visit came from: campaign tag / click id first, then the referring site. */
function source(referrer: string, search: string, ownHost: string): string | null {
  const q = new URLSearchParams(search);
  const utm = q.get("utm_source")?.toLowerCase().trim();
  if (utm) return /^(fb|facebook)/.test(utm) ? "facebook" : /^(ig|instagram)/.test(utm) ? "instagram" : utm.slice(0, 40);
  if (q.has("fbclid")) return "facebook";
  if (q.has("gclid")) return "google";
  let host = "";
  try { host = new URL(referrer).hostname.replace(/^www\./, ""); } catch { return null; }
  if (!host || host === ownHost) return null;
  if (/(^|\.)(facebook|fb)\.com$|messenger\.com$/.test(host)) return "facebook";
  if (/instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)google\./.test(host)) return "google";
  if (/whatsapp\.com$|wa\.me$/.test(host)) return "whatsapp";
  if (/youtube\.com$/.test(host)) return "youtube";
  if (/tiktok\.com$/.test(host)) return "tiktok";
  if (/bing\.com$/.test(host)) return "bing";
  return host.slice(0, 60);
}

const header = (req: NextRequest, name: string) => {
  const v = req.headers.get(name);
  if (!v) return null;
  try { return decodeURIComponent(v).slice(0, 80); } catch { return v.slice(0, 80); }
};

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const sb = getServiceClient();
  if (!sb || !ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });

  let body: { path?: unknown; search?: unknown; referrer?: unknown; entry?: unknown };
  try { body = await req.json(); } catch { return new NextResponse(null, { status: 204 }); }
  const raw = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : null;
  // Order pages carry the order id — keep only "/order".
  const path = raw?.replace(/^\/(order|unsubscribe)\/.*$/, "/$1") ?? null;
  if (!path || path.startsWith("/admin") || path.startsWith("/api")) return new NextResponse(null, { status: 204 });
  const entry = body.entry === true;

  const existing = req.cookies.get(COOKIE)?.value;
  const visitorId = existing && UUID.test(existing) ? existing : crypto.randomUUID();
  const product = path.match(/^\/product\/([^/?#]+)/)?.[1];

  await sb.from("visits").insert({
    visitor_id: visitorId,
    path,
    product_slug: product ? decodeURIComponent(product).slice(0, 120) : null,
    entry,
    source: entry
      ? source(String(body.referrer ?? ""), String(body.search ?? ""), req.nextUrl.hostname.replace(/^www\./, ""))
      : null,
    country: header(req, "x-vercel-ip-country"),
    region: header(req, "x-vercel-ip-country-region"),
    city: header(req, "x-vercel-ip-city"),
    device: device(ua),
  });

  const res = new NextResponse(null, { status: 204 });
  if (visitorId !== existing) {
    res.cookies.set(COOKIE, visitorId, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}
