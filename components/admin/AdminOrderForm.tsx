"use client";

import { useActionState, useMemo, useState, startTransition } from "react";
import { createAdminOrder, lookupCustomer, type AdminOrderState, type CustomerLookup } from "@/app/admin/actions";
import { ADMIN_DELIVERY_ZONES, ORDER_CHANNELS, type AdminDeliveryZone } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { adminInput, btnPrimary, btnQuiet } from "./styles";

export interface OrderProduct { id: string; name: string; code: string; price: number | null; stock: number; archived: boolean }
interface Line { product_id: string; quantity: number; unit_price: string }

const n = (s: string) => (s.trim() === "" ? null : Number(s));

/** Admin places an order for a customer who ordered on Facebook, phone, WhatsApp or in person. */
export default function AdminOrderForm({ products }: { products: OrderProduct[] }) {
  const [state, action, pending] = useActionState<AdminOrderState, FormData>(createAdminOrder, { status: "idle" });
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState("");
  const [zone, setZone] = useState<AdminDeliveryZone>("inside_dhaka");
  const [fee, setFee] = useState("");          // empty = the zone's normal charge
  const [discount, setDiscount] = useState("");
  const [cust, setCust] = useState({ name: "", phone: "", address: "", email: "" });
  const [known, setKnown] = useState<CustomerLookup | null>(null);
  const e = state.errors ?? {};
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const zoneFee = ADMIN_DELIVERY_ZONES.find((z) => z.id === zone)!.fee;
  const delivery = n(fee) ?? zoneFee;
  const subtotal = lines.reduce((sum, l) => sum + (n(l.unit_price) ?? byId.get(l.product_id)?.price ?? 0) * l.quantity, 0);
  const listTotal = lines.reduce((sum, l) => sum + (byId.get(l.product_id)?.price ?? n(l.unit_price) ?? 0) * l.quantity, 0);
  const total = subtotal - (n(discount) ?? 0) + delivery;

  function addProduct(id: string) {
    const p = byId.get(id);
    if (!p) return;
    setLines((ls) => ls.some((l) => l.product_id === id)
      ? ls.map((l) => (l.product_id === id ? { ...l, quantity: l.quantity + 1 } : l))
      : [...ls, { product_id: id, quantity: 1, unit_price: p.price != null ? String(p.price) : "" }]);
    setPick("");
  }
  const setLine = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.product_id === id ? { ...l, ...patch } : l)));

  async function onPhoneBlur() {
    if (cust.phone.replace(/\D/g, "").length < 11) return;
    const found = await lookupCustomer(cust.phone).catch(() => null);
    setKnown(found);
    if (found) setCust((c) => ({ ...c, name: c.name || found.name, address: c.address || found.address || "", email: c.email || found.email || "" }));
  }

  return (
    <form
      onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
      <input type="hidden" name="items" value={JSON.stringify(lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity, unit_price: n(l.unit_price) })))} />
      <input type="hidden" name="zone" value={zone} />

      <div className="space-y-10">
        {/* Customer */}
        <section className="space-y-4">
          <h2 className="text-xl">গ্রাহক</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm text-ink-soft">মোবাইল নম্বর</span>
              <input name="phone" type="tel" inputMode="tel" required placeholder="01XXXXXXXXX" value={cust.phone}
                onChange={(ev) => setCust({ ...cust, phone: ev.target.value })} onBlur={onPhoneBlur}
                className={adminInput} aria-invalid={!!e.phone} />
              {e.phone ? <span className="mt-1 block text-sm text-sindoor">{e.phone}</span>
                : known && <span className="mt-1 block text-xs text-leaf">✓ পুরোনো গ্রাহক — {known.orders.toLocaleString("bn-BD")}টি আগের অর্ডার, তথ্য বসানো হয়েছে</span>}
            </label>
            <label className="block">
              <span className="text-sm text-ink-soft">নাম</span>
              <input name="name" required value={cust.name} onChange={(ev) => setCust({ ...cust, name: ev.target.value })} className={adminInput} aria-invalid={!!e.name} />
              {e.name && <span className="mt-1 block text-sm text-sindoor">{e.name}</span>}
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm text-ink-soft">ঠিকানা {zone === "pickup" && "(পিকআপে ঐচ্ছিক)"}</span>
              <textarea name="address" rows={2} value={cust.address} onChange={(ev) => setCust({ ...cust, address: ev.target.value })} className={adminInput} aria-invalid={!!e.address} />
              {e.address && <span className="mt-1 block text-sm text-sindoor">{e.address}</span>}
            </label>
            <label className="block">
              <span className="text-sm text-ink-soft">ইমেইল (ঐচ্ছিক)</span>
              <input name="email" type="email" value={cust.email} onChange={(ev) => setCust({ ...cust, email: ev.target.value })} className={adminInput} aria-invalid={!!e.email} />
              {e.email && <span className="mt-1 block text-sm text-sindoor">{e.email}</span>}
            </label>
            <label className="block">
              <span className="text-sm text-ink-soft">কোথা থেকে অর্ডার</span>
              <select name="channel" defaultValue="facebook" className={adminInput}>
                {ORDER_CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        {/* Products */}
        <section>
          <h2 className="text-xl">পণ্য ও দাম</h2>
          <p className="mt-1 text-sm text-ink-soft">দরদামে রাজি হওয়া দাম “দাম (প্রতি পিস)” ঘরে লিখুন।</p>
          <select value={pick} onChange={(ev) => addProduct(ev.target.value)} className={`${adminInput} mt-3`} aria-label="পণ্য যোগ করুন">
            <option value="">+ পণ্য যোগ করুন…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock < 1}>
                {p.name} ({p.code}) — {p.price != null ? formatPrice(p.price) : "দাম নেই"} · স্টক {p.stock}{p.archived ? " · আর্কাইভ" : ""}
              </option>
            ))}
          </select>
          {e.items && <p className="mt-2 text-sm text-sindoor">{e.items}</p>}

          {lines.length > 0 && (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {lines.map((l) => {
                const p = byId.get(l.product_id)!;
                const price = n(l.unit_price);
                const special = p.price != null && price != null && price < p.price;
                return (
                  <li key={l.product_id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                    <div className="min-w-0">
                      <p className="truncate">{p.name}</p>
                      <p className="text-xs text-ink-soft">{p.code} · নিয়মিত দাম {p.price != null ? formatPrice(p.price) : "নেই"} · স্টক {p.stock}</p>
                    </div>
                    <label className="block">
                      <span className="text-xs text-ink-soft">পরিমাণ</span>
                      <input type="number" min={1} max={Math.max(1, p.stock)} value={l.quantity}
                        onChange={(ev) => setLine(l.product_id, { quantity: Math.max(1, Math.min(p.stock || 1, Number(ev.target.value) || 1)) })}
                        className={`${adminInput} !mt-0.5 !w-20`} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-ink-soft">দাম (প্রতি পিস)</span>
                      <input inputMode="numeric" required value={l.unit_price} placeholder="৳"
                        onChange={(ev) => setLine(l.product_id, { unit_price: ev.target.value.replace(/[^\d]/g, "") })}
                        className={`${adminInput} !mt-0.5 !w-28 ${special ? "!border-leaf" : ""}`} />
                    </label>
                    <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.product_id !== l.product_id))}
                      className={`${btnQuiet} !text-sindoor`}>সরান</button>
                    {special && <p className="text-xs text-leaf sm:col-span-4">বিশেষ দাম — প্রতি পিসে {formatPrice(p.price! - price!)} কম</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Delivery */}
        <section className="grid gap-4 sm:grid-cols-2">
          <h2 className="text-xl sm:col-span-2">ডেলিভারি</h2>
          <div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">
            {ADMIN_DELIVERY_ZONES.map((z) => (
              <label key={z.id} className={`flex cursor-pointer items-center justify-between gap-2 border px-3 py-2.5 text-sm ${zone === z.id ? "border-ink bg-paper-deep" : "border-line"}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" checked={zone === z.id} onChange={() => { setZone(z.id); setFee(""); }} className="accent-ink" />
                  {z.label}
                </span>
                <span className="tabular-nums">{formatPrice(z.fee)}</span>
              </label>
            ))}
          </div>
          <label className="block">
            <span className="text-sm text-ink-soft">ডেলিভারি চার্জ (বদলাতে চাইলে)</span>
            <input name="delivery_charge" inputMode="numeric" value={fee} onChange={(ev) => setFee(ev.target.value.replace(/[^\d]/g, ""))}
              placeholder={`${zoneFee} (স্বাভাবিক)`} className={adminInput} aria-invalid={!!e.delivery_charge} />
            <span className="mt-1 block text-xs text-ink-soft">ফ্রি ডেলিভারি হলে 0 লিখুন।</span>
          </label>
          <label className="block">
            <span className="text-sm text-ink-soft">গ্রাহকের নোট (ঐচ্ছিক)</span>
            <input name="note" placeholder="যেমন সন্ধ্যার পরে দিন" className={adminInput} />
          </label>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="space-y-4 border border-line bg-paper-deep/50 p-5">
          <h2 className="text-xl">সারাংশ</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">পণ্য (নিয়মিত দামে)</dt><dd className="tabular-nums">{formatPrice(listTotal)}</dd></div>
            {listTotal > subtotal && <div className="flex justify-between text-leaf"><dt>বিশেষ দামে কম</dt><dd className="tabular-nums">−{formatPrice(listTotal - subtotal)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-soft">সাবটোটাল</dt><dd className="tabular-nums">{formatPrice(subtotal)}</dd></div>
          </dl>
          <label className="block">
            <span className="text-sm text-ink-soft">অতিরিক্ত ছাড় (৳, ঐচ্ছিক)</span>
            <input name="admin_discount" inputMode="numeric" value={discount} onChange={(ev) => setDiscount(ev.target.value.replace(/[^\d]/g, ""))}
              placeholder="0" className={adminInput} aria-invalid={!!e.admin_discount} />
            {e.admin_discount && <span className="mt-1 block text-sm text-sindoor">{e.admin_discount}</span>}
          </label>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">ডেলিভারি</dt><dd className="tabular-nums">{formatPrice(delivery)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-2 text-base">
              <dt>মোট (ক্যাশ অন ডেলিভারি)</dt><dd className={`text-xl tabular-nums ${total < 0 ? "text-sindoor" : ""}`}>{formatPrice(total)}</dd>
            </div>
          </dl>
          <label className="block">
            <span className="text-sm text-ink-soft">দামের নোট (শুধু অ্যাডমিন দেখবে)</span>
            <input name="price_note" placeholder="যেমন Messenger-এ ১০০০ টাকায় রাজি" className={adminInput} />
          </label>
          <label className="block">
            <span className="text-sm text-ink-soft">অবস্থা</span>
            <select name="status" defaultValue="confirmed" className={adminInput}>
              <option value="confirmed">কনফার্মড (গ্রাহকের সাথে কথা হয়ে গেছে)</option>
              <option value="new">নতুন (পরে কনফার্ম করব)</option>
            </select>
          </label>
          {state.status === "error" && state.message && <p role="alert" className="text-sm text-sindoor">{state.message}</p>}
          <button disabled={pending || !lines.length || total < 0} className={`${btnPrimary} w-full`}>
            {pending ? "তৈরি হচ্ছে…" : `অর্ডার তৈরি করুন · ${formatPrice(total)}`}
          </button>
          <p className="text-xs text-ink-soft">স্টক কমে যাবে। তৈরি হলে পেমেন্ট স্লিপ ও গ্রাহককে ইমেইল পাঠানোর অপশন পাবেন।</p>
        </div>
      </aside>
    </form>
  );
}
