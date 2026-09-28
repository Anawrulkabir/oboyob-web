import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

type Props = { searchParams: Promise<{ range?: string }> };

interface Stats {
  visitors: number; views: number; visits: number; online: number; today: number;
  days: { day: string; visitors: number; views: number }[];
  cities: { city: string; country: string | null; visitors: number }[];
  countries: { country: string; visitors: number }[];
  sources: { source: string; visits: number }[];
  devices: { device: string; visitors: number }[];
  products: { slug: string; views: number; visitors: number }[];
  pages: { path: string; views: number }[];
}

const RANGES = [
  { key: "1", label: "আজ", days: 1 },
  { key: "7", label: "৭ দিন", days: 7 },
  { key: "30", label: "৩০ দিন", days: 30 },
  { key: "90", label: "৯০ দিন", days: 90 },
  { key: "all", label: "সব সময়", days: null },
] as const;

const bn = (n: number) => n.toLocaleString("bn-BD");
const countryName = (() => {
  const names = new Intl.DisplayNames(["bn"], { type: "region" });
  return (code: string | null) => {
    if (!code || code === "?") return "অজানা";
    try { return names.of(code) ?? code; } catch { return code; }
  };
})();
const SOURCE: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", google: "Google সার্চ", whatsapp: "WhatsApp",
  youtube: "YouTube", tiktok: "TikTok", bing: "Bing", direct: "সরাসরি / লিংক কপি করে",
};
const DEVICE: Record<string, string> = { mobile: "📱 মোবাইল", desktop: "💻 কম্পিউটার", tablet: "📲 ট্যাবলেট" };
const PAGE: Record<string, string> = {
  "/": "হোম", "/shop": "সব পণ্য", "/checkout": "চেকআউট", "/order": "অর্ডার কনফার্মেশন",
  "/account": "আমার অ্যাকাউন্ট", "/login": "লগইন", "/unsubscribe": "আনসাবস্ক্রাইব",
};
const dayFmt = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function VisitorsAdmin({ searchParams }: Props) {
  const { sb } = await requireAdmin();
  const { range: rangeKey = "30" } = await searchParams;
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[2];

  const { data, error } = await sb.rpc("visit_stats", { p_days: range.days });
  if (error || !data) {
    return (
      <div>
        <h1 className="text-2xl">ভিজিটর</h1>
        <p className="mt-6 border border-sindoor/40 p-4 text-sindoor">
          ভিজিটর তথ্য লোড হয়নি। Supabase-এ <code>0009_visits.sql</code> চালানো হয়েছে কি না দেখুন।
          {error && <span className="mt-1 block text-xs text-ink-soft">{error.message}</span>}
        </p>
      </div>
    );
  }
  const s = data as Stats;

  // Product names for the "most viewed" list.
  const slugs = s.products.map((p) => p.slug);
  const { data: prods } = slugs.length
    ? await sb.from("products").select("slug, name, product_code").in("slug", slugs)
    : { data: [] as { slug: string; name: string; product_code: string }[] };
  const productBy = new Map((prods ?? []).map((p) => [p.slug, p]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">ভিজিটর</h1>
          <p className="mt-1 text-sm text-ink-soft">কারা, কোথা থেকে, কোন পণ্য দেখছেন। তথ্য স্থায়ীভাবে জমা থাকে।</p>
        </div>
        <p className="flex items-center gap-2 border border-leaf/40 bg-leaf/5 px-3 py-1.5 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            {s.online > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-60" />}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-leaf" />
          </span>
          এখন সাইটে: <strong>{bn(s.online)} জন</strong>
        </p>
      </div>

      <nav className="-mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0" aria-label="সময়কাল">
        {RANGES.map((r) => (
          <Link key={r.key} href={`/admin/visitors?range=${r.key}`}
            className={`shrink-0 border px-3.5 py-2 text-sm ${r.key === range.key ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink"}`}>
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="ভিজিটর" value={s.visitors} hint="আলাদা মানুষ (ব্রাউজার)" />
        <Tile label="পেজ দেখা হয়েছে" value={s.views} hint="মোট পেজ ভিউ" />
        <Tile label="ভিজিট" value={s.visits} hint="সাইটে আসার সংখ্যা" />
        <Tile label="আজকের ভিজিটর" value={s.today} hint="বাংলাদেশ সময়" />
      </div>

      {range.days !== 1 && <DailyChart days={s.days} span={range.days} />}

      <div className="grid gap-8 lg:grid-cols-2">
        <Ranked title="কোন শহর / এলাকা থেকে" unit="জন"
          note="লোকেশন আনুমানিক — মোবাইল ডেটায় অনেক সময় অন্য জেলার মানুষকেও “Dhaka” দেখায়।"
          rows={s.cities.map((c) => ({ label: c.city, sub: c.country && c.country !== "BD" ? countryName(c.country) : undefined, value: c.visitors }))} />
        <Ranked title="কোথা থেকে এসেছেন" unit="বার"
          rows={s.sources.map((r) => ({ label: SOURCE[r.source] ?? r.source, value: r.visits }))} />
        <Ranked title="সবচেয়ে বেশি দেখা পণ্য" unit="বার"
          rows={s.products.map((p) => {
            const prod = productBy.get(p.slug);
            return {
              label: prod?.name ?? p.slug, sub: `${prod?.product_code ?? ""} · ${bn(p.visitors)} জন`.replace(/^ · /, ""),
              value: p.views, href: `/product/${p.slug}`,
            };
          })} />
        <div className="space-y-8">
          <Ranked title="দেশ" unit="জন" rows={s.countries.map((c) => ({ label: countryName(c.country), value: c.visitors }))} />
          <Ranked title="ডিভাইস" unit="জন" rows={s.devices.map((d) => ({ label: DEVICE[d.device] ?? d.device, value: d.visitors }))} />
          <Ranked title="অন্যান্য পেজ" unit="বার" rows={s.pages.map((p) => ({ label: PAGE[p.path] ?? p.path, value: p.views }))} />
        </div>
      </div>

      <p className="border-t border-line pt-4 text-xs text-ink-soft">
        আরও বিস্তারিত (গত ৩০ দিন) Vercel ড্যাশবোর্ডের Analytics ট্যাবেও দেখা যাবে। কারো IP ঠিকানা বা ব্যক্তিগত তথ্য এখানে রাখা হয় না।
      </p>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="border border-line px-4 py-3.5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums">{bn(value)}</p>
      <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>
    </div>
  );
}

/** Visitors per day. Every day of the range gets a slot so gaps read as zero. */
function DailyChart({ days, span }: { days: Stats["days"]; span: number | null }) {
  const byDay = new Map(days.map((d) => [d.day, d]));
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let count = span ?? 0;
  if (span === null) {
    const first = days[0]?.day;
    count = first ? Math.min(365, Math.round((today.getTime() - new Date(`${first}T00:00:00`).getTime()) / 864e5) + 1) : 1;
  }
  const slots = Array.from({ length: Math.max(count, 1) }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (count - 1 - i));
    const key = toKey(d);
    return { key, visitors: byDay.get(key)?.visitors ?? 0, views: byDay.get(key)?.views ?? 0 };
  });
  const max = Math.max(1, ...slots.map((d) => d.visitors));
  const label = (key: string) => dayFmt.format(new Date(`${key}T00:00:00Z`));
  const tickEvery = Math.ceil(slots.length / 6);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg">দিনে কতজন ভিজিটর</h2>
        <span className="text-xs text-ink-soft">সর্বোচ্চ {bn(max)} জন/দিন</span>
      </div>
      <div className="relative mt-3 border-b border-ink/30">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
        <ol className="flex h-44 items-end gap-[2px]" aria-label="প্রতিদিনের ভিজিটর">
          {slots.map((d) => (
            <li key={d.key} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none"
              aria-label={`${label(d.key)}: ${bn(d.visitors)} জন, ${bn(d.views)} পেজ ভিউ`}>
              <div className="w-full rounded-t-[4px] bg-ink/80 transition-colors group-hover:bg-haldi group-focus:bg-haldi"
                style={{ height: `${(d.visitors / max) * 100}%`, minHeight: d.visitors ? 3 : 0 }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap border border-line bg-paper px-2.5 py-1.5 text-xs shadow-sm group-hover:block group-focus:block">
                <p className="font-medium">{label(d.key)}</p>
                <p className="text-ink-soft">{bn(d.visitors)} জন · {bn(d.views)} পেজ</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[11px] text-ink-soft" aria-hidden>
        {slots.map((d, i) => (
          <span key={d.key} className="flex-1 overflow-visible whitespace-nowrap">
            {(slots.length - 1 - i) % tickEvery === 0 ? label(d.key) : ""}
          </span>
        ))}
      </div>
    </section>
  );
}

/** A ranked list with a proportional bar behind each value. */
function Ranked({ title, rows, unit, note }: {
  title: string; unit: string; note?: string;
  rows: { label: string; sub?: string; value: number; href?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section>
      <h2 className="text-lg">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-ink-soft">{note}</p>}
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">এখনও কোনো তথ্য নেই।</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {rows.map((r, i) => {
            const text = (
              <>
                <span className="min-w-0 truncate">{r.label}{r.sub && <span className="ml-1.5 text-xs text-ink-soft">{r.sub}</span>}</span>
                <span className="shrink-0 tabular-nums">{bn(r.value)} <span className="text-xs text-ink-soft">{unit}</span></span>
              </>
            );
            return (
              <li key={`${r.label}-${i}`} className="relative overflow-hidden border border-line">
                <div className="absolute inset-y-0 left-0 bg-haldi-soft/35" style={{ width: `${(r.value / max) * 100}%` }} aria-hidden />
                {r.href ? (
                  <a href={r.href} target="_blank" className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm hover:underline">{text}</a>
                ) : (
                  <div className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">{text}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
