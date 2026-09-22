import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { signOutCustomer } from "@/app/actions/auth";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { formatPrice } from "@/lib/format";
import ProfileForm from "@/components/ProfileForm";

export const metadata: Metadata = { title: "আমার অ্যাকাউন্ট", robots: { index: false } };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeZone: "Asia/Dhaka" });

// Progress shown to customers (cancelled is shown separately).
const STEPS: OrderStatus[] = ["new", "confirmed", "shipped", "delivered"];

export default async function AccountPage() {
  if (!isSupabaseConfigured) redirect("/login");
  const sb = await createSessionClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [{ data: profile }, { data: orders }] = await Promise.all([
    sb.from("profiles").select("full_name, phone, email, address").eq("id", user.id).maybeSingle(),
    sb.from("orders")
      .select("id, product_name, product_code, quantity, unit_price, status, created_at, product:products(slug)")
      .eq("customer_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 sm:px-8 md:pt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl">{profile?.full_name ? `স্বাগতম, ${profile.full_name}` : "আমার অ্যাকাউন্ট"}</h1>
        <form action={signOutCustomer}>
          <button className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">লগআউট</button>
        </form>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{user.email || profile?.phone}</p>

      <section className="mt-10" aria-labelledby="orders-title">
        <h2 id="orders-title" className="text-xl">আমার অর্ডার</h2>
        {!orders?.length ? (
          <p className="mt-4 border-t border-line pt-6 text-ink-soft">
            এখনও কোনো অর্ডার নেই। <Link href="/shop" className="text-ink underline underline-offset-4">সংগ্রহ দেখুন</Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {orders.map((o) => {
              const status = (ORDER_STATUSES as readonly string[]).includes(o.status) ? (o.status as OrderStatus) : "new";
              const step = STEPS.indexOf(status);
              const slug = (o.product as unknown as { slug: string } | null)?.slug;
              return (
                <li key={o.id} className="py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p>
                      {slug ? <Link href={`/product/${slug}`} className="hover:text-haldi">{o.product_name}</Link> : o.product_name}
                      <span className="text-ink-soft"> × {o.quantity}</span>
                    </p>
                    <p className="text-sm text-ink-soft">
                      {o.unit_price != null && <>{formatPrice(o.unit_price * o.quantity)} / </>}
                      {dateFmt.format(new Date(o.created_at))}
                    </p>
                  </div>
                  <p className="text-xs text-ink-soft">#{o.id.slice(0, 8).toUpperCase()} / {o.product_code}</p>
                  {status === "cancelled" ? (
                    <p className="mt-3 text-sm text-sindoor">বাতিল</p>
                  ) : (
                    <ol className="mt-3 grid grid-cols-4 gap-1 text-[11px] sm:text-xs" aria-label="অর্ডারের অবস্থা">
                      {STEPS.map((s, i) => (
                        <li key={s} aria-current={i === step ? "step" : undefined} className={i <= step ? "text-ink" : "text-ink-soft/60"}>
                          <span className={`mb-1.5 block h-1 ${i <= step ? "bg-haldi" : "bg-line"}`} />
                          {ORDER_STATUS_LABEL[s]}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="profile-title">
        <h2 id="profile-title" className="text-xl">ডেলিভারির তথ্য</h2>
        <p className="mt-1 mb-5 text-sm text-ink-soft">অর্ডার ফর্মে এগুলো নিজে থেকেই বসে যাবে।</p>
        <ProfileForm profile={profile ?? null} />
      </section>
    </div>
  );
}
