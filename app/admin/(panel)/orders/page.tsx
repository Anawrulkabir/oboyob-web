import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/admin";
import { setOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/order-status";
import { formatPrice } from "@/lib/format";
import { deliveryZone } from "@/lib/delivery";
import { ORDER_SELECT, orderRef, type Order } from "@/lib/orders";
import { btnQuiet } from "@/components/admin/styles";

type Props = { searchParams: Promise<{ status?: string; error?: string }> };

const dateFmt = new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

export default async function OrdersAdmin({ searchParams }: Props) {
  const { sb } = await requireAdmin();
  const { status, error: actionError } = await searchParams;
  const valid = (ORDER_STATUSES as readonly string[]).includes(status ?? "");

  let q = sb.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(200);
  if (valid) q = q.eq("status", status!);
  const { data, error } = await q;
  const orders = (data ?? []) as Order[];

  return (
    <div>
      <h1 className="text-2xl">অর্ডার</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {[["সব", ""], ...ORDER_STATUSES.map((s) => [ORDER_STATUS_LABEL[s], s])].map(([label, s]) => (
          <Link key={s} href={s ? `/admin/orders?status=${s}` : "/admin/orders"}
            className={`border px-3 py-1 text-sm ${(status ?? "") === s ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink"}`}>
            {label}
          </Link>
        ))}
      </div>

      {actionError === "restock" && (
        <p role="alert" className="mt-6 text-sindoor">বাতিল অর্ডারটি ফেরানো যায়নি — পণ্যের যথেষ্ট স্টক নেই। আগে পণ্যের স্টক বাড়ান।</p>
      )}
      {error && <p className="mt-6 text-sindoor">লোড করা যায়নি: {error.message}</p>}
      {orders.length === 0 ? (
        <p className="mt-10 border-t border-line pt-10 text-center text-ink-soft">কোনো অর্ডার নেই।</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.id} className="grid gap-3 py-5 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <p className="text-xs text-ink-soft">{dateFmt.format(new Date(o.created_at))}</p>
                <Link href={`/admin/orders/${o.id}`} className="font-medium tabular-nums hover:text-haldi">#{orderRef(o.id)} →</Link>
                <ul className="mt-1 text-sm">
                  {o.items.map((i) => <li key={i.id}>{i.product_name} <span className="text-ink-soft">({i.product_code}) × {i.quantity}</span></li>)}
                </ul>
                <p className="mt-1 text-sm">
                  মোট <span className="font-medium tabular-nums">{formatPrice(o.total) ?? "—"}</span>
                  <span className="text-ink-soft"> · COD{o.delivery_zone && <> · {deliveryZone(o.delivery_zone)?.label}</>}</span>
                </p>
                {o.coupon_code && <p className="text-sm text-leaf">কুপন {o.coupon_code} (−{formatPrice(o.discount)})</p>}
              </div>
              <div className="text-sm">
                <p>{o.customer_name}</p>
                <a href={`tel:${o.customer_phone}`} className="tabular-nums underline underline-offset-4">{o.customer_phone}</a>
                <p className="mt-1 whitespace-pre-line text-ink-soft">{o.customer_address}</p>
                {o.note && <p className="mt-1 italic text-ink-soft">“{o.note}”</p>}
                {o.emailed_at && <p className="mt-1 text-xs text-leaf">✉ ইমেইল পাঠানো হয়েছে</p>}
              </div>
              <form action={setOrderStatus.bind(null, o.id, "list")} className="flex items-start gap-2">
                <select name="status" defaultValue={o.status} className="border border-line bg-paper px-2 py-1.5 text-sm">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
                </select>
                <SubmitButton className={btnQuiet} pendingText="আপডেট হচ্ছে…">আপডেট</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
