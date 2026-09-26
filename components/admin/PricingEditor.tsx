"use client";

import { useActionState, useState } from "react";
import { updateOrderPricing, type PricingState } from "@/app/admin/actions";
import { ADMIN_DELIVERY_ZONES, type AdminDeliveryZone } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/orders";
import { adminInput, btnPrimary } from "./styles";

const n = (s: string) => (s.trim() === "" ? null : Number(s));

/** Set the agreed price, a special discount and the delivery charge before confirming an order. */
export default function PricingEditor({ order }: { order: Order }) {
  const [state, action, pending] = useActionState<PricingState, FormData>(updateOrderPricing.bind(null, order.id), { status: "idle" });
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(order.items.map((i) => [i.id, String(i.unit_price)])));
  const [discount, setDiscount] = useState(order.admin_discount ? String(order.admin_discount) : "");
  const [zone, setZone] = useState<AdminDeliveryZone>((order.delivery_zone as AdminDeliveryZone) ?? "inside_dhaka");
  const [fee, setFee] = useState(String(order.delivery_charge));

  const subtotal = order.items.reduce((s, i) => s + (n(prices[i.id] ?? "") ?? 0) * i.quantity, 0);
  const coupon = Math.min(order.discount, subtotal);
  const delivery = n(fee) ?? ADMIN_DELIVERY_ZONES.find((z) => z.id === zone)!.fee;
  const total = subtotal - coupon - (n(discount) ?? 0) + delivery;
  const changed = total !== order.total;

  return (
    <form action={action} className="space-y-4 border border-haldi/50 bg-haldi-soft/10 p-5">
      <div>
        <h2 className="text-xl">দাম ও ছাড়</h2>
        <p className="text-sm text-ink-soft">দরদামে রাজি হলে কনফার্মের আগে এখানে দাম ঠিক করুন — স্লিপ ও ইমেইলে নতুন মোট দেখাবে।</p>
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {order.items.map((i) => {
          const p = n(prices[i.id] ?? "");
          const regular = i.list_price ?? i.unit_price;
          return (
            <li key={i.id} className="flex flex-wrap items-end justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate">{i.product_name} <span className="text-ink-soft">× {i.quantity}</span></p>
                <p className="text-xs text-ink-soft">{i.product_code} · নিয়মিত দাম {formatPrice(regular)}</p>
                {p != null && p < regular && <p className="text-xs text-leaf">বিশেষ দাম — প্রতি পিসে {formatPrice(regular - p)} কম</p>}
              </div>
              <label className="block">
                <span className="text-xs text-ink-soft">দাম (প্রতি পিস, ৳)</span>
                <input name={`price:${i.id}`} inputMode="numeric" required value={prices[i.id] ?? ""}
                  onChange={(ev) => setPrices({ ...prices, [i.id]: ev.target.value.replace(/[^\d]/g, "") })}
                  className={`${adminInput} !mt-0.5 !w-28`} />
              </label>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm text-ink-soft">অতিরিক্ত ছাড় (৳)</span>
          <input name="admin_discount" inputMode="numeric" value={discount} placeholder="0"
            onChange={(ev) => setDiscount(ev.target.value.replace(/[^\d]/g, ""))} className={adminInput} />
        </label>
        <label className="block">
          <span className="text-sm text-ink-soft">ডেলিভারি</span>
          <select name="zone" value={zone} onChange={(ev) => {
            const z = ev.target.value as AdminDeliveryZone;
            setZone(z); setFee(String(ADMIN_DELIVERY_ZONES.find((x) => x.id === z)!.fee));
          }} className={adminInput}>
            {ADMIN_DELIVERY_ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-ink-soft">ডেলিভারি চার্জ (৳)</span>
          <input name="delivery_charge" inputMode="numeric" value={fee} onChange={(ev) => setFee(ev.target.value.replace(/[^\d]/g, ""))} className={adminInput} />
        </label>
      </div>
      <label className="block">
        <span className="text-sm text-ink-soft">দামের নোট (শুধু অ্যাডমিন দেখবে)</span>
        <input name="price_note" defaultValue={order.price_note ?? ""} placeholder="যেমন Messenger-এ ১০০০ টাকায় রাজি" className={adminInput} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p>
          <span className="text-ink-soft">নতুন মোট </span>
          <span className={`text-xl tabular-nums ${total < 0 ? "text-sindoor" : ""}`}>{formatPrice(total)}</span>
          {changed && <span className="ml-2 text-sm text-ink-soft line-through">{formatPrice(order.total)}</span>}
          {coupon > 0 && <span className="ml-2 text-xs text-ink-soft">(কুপন {order.coupon_code} −{formatPrice(coupon)} সহ)</span>}
        </p>
        <button disabled={pending || total < 0} className={btnPrimary}>{pending ? "সংরক্ষণ হচ্ছে…" : "দাম সংরক্ষণ করুন"}</button>
      </div>
      {state.message && <p role="status" className={state.status === "error" ? "text-sm text-sindoor" : "text-sm text-leaf"}>{state.status === "saved" && "✓ "}{state.message}</p>}
    </form>
  );
}
