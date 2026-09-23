import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import PhoneActions from "@/components/admin/PhoneActions";

type Props = { searchParams: Promise<{ q?: string }> };

interface Customer {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  orders: number;
  spent: number;      // total of orders that weren't cancelled
  lastOrder: string | null;
  lastOrderId: string | null;
  hasAccount: boolean;
}

const dateFmt = new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeZone: "Asia/Dhaka" });
const bn = (n: number) => n.toLocaleString("bn-BD");

// Everyone who has ordered (grouped by phone number) plus account holders
// who haven't ordered yet.
export default async function CustomersAdmin({ searchParams }: Props) {
  const { sb } = await requireAdmin();
  const { q = "" } = await searchParams;

  const [{ data: orders }, { data: profiles }, { data: optouts }] = await Promise.all([
    sb.from("orders").select("id, customer_id, customer_name, customer_phone, customer_email, customer_address, total, status, created_at")
      .order("created_at", { ascending: false }).limit(5000),
    sb.from("profiles").select("id, full_name, phone, email, address, created_at").limit(5000),
    sb.from("email_optouts").select("email"),
  ]);
  const unsubscribed = new Set((optouts ?? []).map((o) => o.email));

  const byKey = new Map<string, Customer>();
  const accountIds = new Set<string>();
  for (const o of orders ?? []) {
    const key = o.customer_phone;
    let c = byKey.get(key);
    if (!c) {
      // Orders are newest first, so the first one seen has the latest details.
      c = { key, name: o.customer_name, phone: o.customer_phone, email: o.customer_email, address: o.customer_address,
            orders: 0, spent: 0, lastOrder: o.created_at, lastOrderId: o.id, hasAccount: false };
      byKey.set(key, c);
    }
    c.orders++;
    if (o.status !== "cancelled") c.spent += o.total ?? 0;
    c.email ||= o.customer_email;
    if (o.customer_id) { c.hasAccount = true; accountIds.add(o.customer_id); }
  }
  for (const p of profiles ?? []) {
    if (accountIds.has(p.id)) continue;
    const match = p.phone ? byKey.get(p.phone) : undefined;
    if (match) { match.hasAccount = true; match.email ||= p.email; continue; }
    byKey.set(`acct:${p.id}`, {
      key: `acct:${p.id}`, name: p.full_name || "—", phone: p.phone, email: p.email, address: p.address,
      orders: 0, spent: 0, lastOrder: null, lastOrderId: null, hasAccount: true,
    });
  }

  let customers = [...byKey.values()].sort((a, b) => (b.lastOrder ?? "").localeCompare(a.lastOrder ?? ""));
  const total = customers.length;
  const withEmail = customers.filter((c) => c.email && !unsubscribed.has(c.email.toLowerCase())).length;
  const needle = q.trim().toLowerCase();
  if (needle) {
    customers = customers.filter((c) =>
      [c.name, c.phone, c.email].some((v) => v?.toLowerCase().includes(needle)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl">গ্রাহক</h1>
        <form>
          <input name="q" defaultValue={q} placeholder="নাম, ফোন বা ইমেইল খুঁজুন"
            className="border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-ink" />
        </form>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        মোট {bn(total)} জন · ইমেইলে খবর পাঠানো যায় {bn(withEmail)} জনকে
      </p>

      {customers.length === 0 ? (
        <p className="mt-10 border-t border-line pt-10 text-center text-ink-soft">{q ? "কাউকে পাওয়া যায়নি।" : "এখনও কোনো গ্রাহক নেই।"}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {customers.map((c) => (
            <li key={c.key} className="grid gap-3 py-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="font-medium">
                  {c.name}
                  {c.hasAccount && <span className="ml-2 border border-line px-1.5 py-0.5 text-[11px] text-ink-soft">অ্যাকাউন্ট</span>}
                </p>
                {c.phone ? <PhoneActions phone={c.phone} /> : <p className="text-sm text-ink-soft">ফোন নেই</p>}
                {c.email && (
                  <p className="mt-1 truncate text-sm text-ink-soft">
                    <a href={`mailto:${c.email}`} className="hover:text-ink">{c.email}</a>
                    {unsubscribed.has(c.email.toLowerCase()) && <span className="ml-2 text-xs text-sindoor">(নতুন পণ্যের ইমেইল বন্ধ)</span>}
                  </p>
                )}
              </div>
              <p className="whitespace-pre-line text-sm text-ink-soft">{c.address ?? ""}</p>
              <div className="text-sm md:text-right">
                <p><span className="font-medium">{bn(c.orders)}</span> অর্ডার · {formatPrice(c.spent)}</p>
                {c.lastOrder && c.lastOrderId && (
                  <Link href={`/admin/orders/${c.lastOrderId}`} className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink">
                    শেষ অর্ডার {dateFmt.format(new Date(c.lastOrder))}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
