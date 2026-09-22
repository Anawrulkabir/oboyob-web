import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CouponForm from "@/components/admin/CouponForm";
import { requireAdmin } from "@/lib/admin";
import { deleteCoupon, setCouponActive } from "@/app/admin/actions";
import { formatPrice } from "@/lib/format";
import { btnQuiet } from "@/components/admin/styles";

interface Coupon {
  code: string; kind: "percent" | "fixed"; value: number; min_order: number | null; max_discount: number | null;
  usage_limit: number | null; used_count: number; expires_at: string | null; active: boolean;
}

const dateFmt = new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeZone: "Asia/Dhaka" });
const bn = (n: number) => n.toLocaleString("bn-BD");

function describe(c: Coupon) {
  const off = c.kind === "percent" ? `${bn(c.value)}% ছাড়` : `${formatPrice(c.value)} ছাড়`;
  const parts = [off];
  if (c.max_discount) parts.push(`সর্বোচ্চ ${formatPrice(c.max_discount)}`);
  if (c.min_order) parts.push(`${formatPrice(c.min_order)}+ অর্ডারে`);
  return parts.join(" · ");
}

function status(c: Coupon): { label: string; tone: string } {
  if (!c.active) return { label: "বন্ধ", tone: "text-ink-soft" };
  if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: "মেয়াদ শেষ", tone: "text-sindoor" };
  if (c.usage_limit && c.used_count >= c.usage_limit) return { label: "সব ব্যবহার হয়ে গেছে", tone: "text-sindoor" };
  return { label: "চালু", tone: "text-leaf" };
}

export default async function CouponsAdmin() {
  const { sb } = await requireAdmin();
  const { data, error } = await sb.from("coupons").select("*").order("created_at", { ascending: false });
  const coupons = (data ?? []) as Coupon[];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl">কুপন</h1>
        <p className="mt-1 text-sm text-ink-soft">
          গ্রাহক অর্ডার ফর্মে “কুপন কোড আছে?” চেপে কোড দিলে ছাড় পাবেন। বাতিল হওয়া অর্ডারের কুপন আবার ব্যবহারযোগ্য হয়।
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-xl">নতুন কুপন</h2>
        <CouponForm />
      </section>

      <section>
        <h2 className="mb-4 text-xl">সব কুপন</h2>
        {error && <p className="text-sindoor">লোড করা যায়নি: {error.message}</p>}
        {coupons.length === 0 ? (
          <p className="border-t border-line pt-8 text-center text-ink-soft">এখনও কোনো কুপন নেই।</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {coupons.map((c) => {
              const s = status(c);
              return (
                <li key={c.code} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p>
                      <span className="font-medium tracking-wider tabular-nums">{c.code}</span>
                      <span className={`ml-3 text-sm ${s.tone}`}>● {s.label}</span>
                    </p>
                    <p className="text-sm text-ink-soft">{describe(c)}</p>
                    <p className="text-xs text-ink-soft">
                      ব্যবহার {bn(c.used_count)}{c.usage_limit ? ` / ${bn(c.usage_limit)}` : " (সীমাহীন)"}
                      {c.expires_at && <> · মেয়াদ {dateFmt.format(new Date(c.expires_at))} পর্যন্ত</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={setCouponActive.bind(null, c.code, !c.active)}>
                      <SubmitButton className={btnQuiet}>{c.active ? "বন্ধ করুন" : "চালু করুন"}</SubmitButton>
                    </form>
                    <ConfirmButton action={deleteCoupon.bind(null, c.code)} message={`কুপন ${c.code} মুছে ফেলবেন? আগের অর্ডারের ছাড়ের হিসাব থেকে যাবে।`}
                      className={`${btnQuiet} !text-sindoor`}>
                      মুছুন
                    </ConfirmButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
