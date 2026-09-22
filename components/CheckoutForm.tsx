"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkCoupon, placeOrder, type CheckoutState } from "@/app/actions/order";
import { useCart } from "@/lib/cart";
import { DELIVERY_ZONES, type DeliveryZone } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";
import QtyStepper from "./QtyStepper";

type Fields = { name: string; phone: string; address: string; email: string; note: string };
const EMPTY: Fields = { name: "", phone: "", address: "", email: "", note: "" };
const SAVED = "oboyob:checkout";
const input = "mt-1.5 w-full border border-line bg-paper px-3 py-3 text-[16px] outline-none focus:border-ink aria-[invalid=true]:border-sindoor";

export default function CheckoutForm({ enabled }: { enabled: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, { status: "idle" });
  const [f, setF] = useState<Fields>(EMPTY);
  const [zone, setZone] = useState<DeliveryZone | null>(null);
  const [account, setAccount] = useState<{ email: string | null } | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};
  const set = (k: keyof Fields) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: ev.target.value }));

  // Prefill: signed-in profile first, otherwise details saved on this device.
  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .catch(() => ({ user: null }))
      .then((me) => {
        if (!alive) return;
        if (me.user) {
          setAccount(me.user);
          const p = me.profile ?? {};
          setF((prev) => ({ ...prev, name: p.full_name ?? "", phone: p.phone ?? "", address: p.address ?? "" }));
        } else {
          try {
            const saved = JSON.parse(localStorage.getItem(SAVED) ?? "null");
            if (saved) { setF((prev) => ({ ...prev, ...saved, note: "" })); if (saved.zone) setZone(saved.zone); }
          } catch {}
        }
      });
    return () => { alive = false; };
  }, []);

  // Server results: go to the slip, or fix the cart / focus the first problem.
  useEffect(() => {
    if (state.status === "success" && state.orderId) {
      if (!account) {
        try { localStorage.setItem(SAVED, JSON.stringify({ name: f.name, phone: f.phone, address: f.address, email: f.email, zone })); } catch {}
      }
      cart.clear();
      router.push(`/order/${state.orderId}?t=${state.token}`);
      return;
    }
    if (state.stock) {
      for (const [id, left] of Object.entries(state.stock)) left > 0 ? cart.setQty(id, left) : cart.remove(id);
    }
    if (state.status === "error" && state.errors) {
      const first = Object.keys(state.errors)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const lines = cart.items.map((i) => ({ id: i.id, qty: i.qty }));
  const linesKey = JSON.stringify(lines);

  async function applyCoupon(code = couponInput) {
    if (!code.trim()) return;
    setChecking(true);
    const r = await checkCoupon(code, lines).catch(() => ({ ok: false, message: "এখন কুপন যাচাই করা যাচ্ছে না।" }) as const);
    setChecking(false);
    if (r.ok && r.code) { setCoupon({ code: r.code, discount: r.discount ?? 0 }); setCouponMsg(null); }
    else { setCoupon(null); setCouponMsg(r.message ?? "কুপন কোডটি সঠিক নয়।"); }
  }
  // Minimum order / percentages depend on the cart — re-check when it changes.
  useEffect(() => {
    if (coupon && cart.items.length) applyCoupon(coupon.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey]);

  const fee = DELIVERY_ZONES.find((z) => z.id === zone)?.fee ?? null;
  const discount = coupon?.discount ?? 0;
  const total = cart.subtotal - discount + (fee ?? 0);

  if (!cart.ready) return <div className="mt-10 h-64 bg-paper-deep" aria-busy="true" />;
  if (state.status === "success") return <p className="mt-10 text-ink-soft">পেমেন্ট স্লিপ খোলা হচ্ছে…</p>;
  if (cart.items.length === 0) {
    return (
      <div className="mt-10 border-y border-line py-16 text-center">
        <p className="font-display text-2xl">কার্ট খালি</p>
        <p className="mt-2 text-ink-soft">পছন্দের পণ্য কার্টে যোগ করে এখানে ফিরে আসুন।</p>
        <Link href="/shop" className="mt-6 inline-block bg-ink px-6 py-3 text-paper hover:bg-ink/85">সংগ্রহ দেখুন</Link>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(ev) => { ev.preventDefault(); const fd = new FormData(ev.currentTarget); startTransition(() => action(fd)); }}
      className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14"
    >
      <input type="hidden" name="items" value={linesKey} />
      <input type="hidden" name="zone" value={zone ?? ""} />
      <input type="hidden" name="coupon" value={coupon?.code ?? ""} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="space-y-10">
        {/* 1 — delivery details */}
        <section aria-labelledby="ship-title" className="space-y-5">
          <h2 id="ship-title" className="text-2xl">ডেলিভারির তথ্য</h2>
          {account ? (
            <p className="text-sm text-ink-soft">লগইন করা আছে{account.email && <> ({account.email})</>} — অর্ডারটি আপনার অ্যাকাউন্টে থাকবে।</p>
          ) : (
            <p className="text-sm text-ink-soft">
              <Link href="/login?next=/checkout" className="text-ink underline underline-offset-4">লগইন করুন</Link> অর্ডার ট্র্যাক করতে — অথবা লগইন ছাড়াই অর্ডার করুন।
            </p>
          )}
          <Field label="নাম" error={e.name}>
            <input name="name" value={f.name} onChange={set("name")} autoComplete="name" className={input} aria-invalid={!!e.name} />
          </Field>
          <Field label="মোবাইল নম্বর" error={e.phone}>
            <div className={`mt-1.5 flex border bg-paper focus-within:border-ink ${e.phone ? "border-sindoor" : "border-line"}`}>
              <span className="flex items-center border-r border-line bg-paper-deep px-3 text-ink-soft">+88</span>
              <input name="phone" value={f.phone} onChange={set("phone")} type="tel" inputMode="tel" autoComplete="tel-national"
                placeholder="01XXXXXXXXX" className="w-full bg-paper px-3 py-3 text-[16px] tabular-nums outline-none" aria-invalid={!!e.phone} />
            </div>
          </Field>
          <Field label="পূর্ণ ঠিকানা" hint="বাসা/রোড, এলাকা, থানা, জেলা" error={e.address}>
            <textarea name="address" value={f.address} onChange={set("address")} rows={3} autoComplete="street-address" className={input} aria-invalid={!!e.address} />
          </Field>
          {!account?.email && (
            <Field label="ইমেইল (ঐচ্ছিক)" hint="দিলে পেমেন্ট স্লিপ ও অর্ডারের আপডেট ইমেইলে পাবেন" error={e.email}>
              <input name="email" value={f.email} onChange={set("email")} type="email" inputMode="email" autoComplete="email" className={input} aria-invalid={!!e.email} />
            </Field>
          )}
          <Field label="নোট (ঐচ্ছিক)">
            <textarea name="note" value={f.note} onChange={set("note")} rows={2} placeholder="ডেলিভারির সময় বা অন্য কিছু" className={input} />
          </Field>
        </section>

        {/* 2 — delivery area */}
        <section aria-labelledby="zone-title">
          <h2 id="zone-title" className="text-2xl">ডেলিভারি এলাকা</h2>
          <div role="radiogroup" aria-labelledby="zone-title" className="mt-4 grid gap-3 sm:grid-cols-2">
            {DELIVERY_ZONES.map((z) => (
              <label key={z.id} className={`flex cursor-pointer items-center justify-between gap-3 border px-4 py-4 ${zone === z.id ? "border-ink bg-paper-deep" : "border-line hover:border-ink"}`}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="zone-choice" checked={zone === z.id} onChange={() => setZone(z.id)} className="h-4 w-4 accent-ink" />
                  <span>{z.label}</span>
                </span>
                <span className="tabular-nums">{formatPrice(z.fee)}</span>
              </label>
            ))}
          </div>
          {e.zone && <p role="alert" className="mt-2 text-sm text-sindoor">{e.zone}</p>}
        </section>

        {/* 3 — payment */}
        <section aria-labelledby="pay-title">
          <h2 id="pay-title" className="text-2xl">পেমেন্ট</h2>
          <div className="mt-4 flex items-start gap-3 border border-ink bg-paper-deep px-4 py-4">
            <input type="radio" checked readOnly className="mt-1.5 h-4 w-4 accent-ink" aria-label="ক্যাশ অন ডেলিভারি" />
            <div>
              <p>ক্যাশ অন ডেলিভারি</p>
              <p className="text-sm text-ink-soft">পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে টাকা দিন। এখন কোনো পেমেন্ট লাগবে না।</p>
            </div>
          </div>
        </section>
      </div>

      {/* Order summary */}
      <aside aria-labelledby="sum-title" className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line bg-paper-deep/50 p-5">
          <h2 id="sum-title" className="text-2xl">অর্ডারের সারাংশ</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {cart.items.map((i) => (
              <li key={i.id} className="flex gap-3 py-3">
                <div className="relative h-16 w-[52px] shrink-0 bg-paper-deep">
                  {i.image ? <Image src={i.image} alt="" fill sizes="52px" className="object-cover" /> : <span className="weave block h-full w-full" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{i.name}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <QtyStepper size="sm" value={i.qty} max={Math.min(20, i.stock)} onChange={(n) => cart.setQty(i.id, n)} />
                    <p className="text-sm tabular-nums">{formatPrice(i.price * i.qty)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => cart.remove(i.id)} aria-label={`${i.name} সরান`} className="self-start text-ink-soft hover:text-sindoor">✕</button>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            {!couponOpen && !coupon ? (
              <button type="button" onClick={() => setCouponOpen(true)} className="text-sm underline decoration-line underline-offset-4 hover:decoration-haldi">
                কুপন কোড আছে?
              </button>
            ) : coupon ? (
              <div className="flex items-center justify-between gap-3 border border-leaf/40 bg-leaf/5 px-3 py-2 text-sm">
                <p className="text-leaf">✓ কুপন <span className="font-medium">{coupon.code}</span></p>
                <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); setCouponOpen(false); }}
                  className="text-ink-soft underline underline-offset-4 hover:text-ink">সরান</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={couponInput} autoFocus autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-label="কুপন কোড"
                  onChange={(ev) => { setCouponInput(ev.target.value.toUpperCase()); setCouponMsg(null); }}
                  onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); applyCoupon(); } }}
                  placeholder="কুপন কোড" className={`${input} !mt-0 !py-2 uppercase tracking-wider`} aria-invalid={!!(couponMsg || e.coupon)} />
                <button type="button" onClick={() => applyCoupon()} disabled={checking || !couponInput.trim()}
                  className="shrink-0 border border-ink px-4 text-sm hover:bg-ink hover:text-paper disabled:opacity-50">
                  {checking ? "…" : "প্রয়োগ"}
                </button>
              </div>
            )}
            {(couponMsg || e.coupon) && <p role="alert" className="mt-1.5 text-sm text-sindoor">{couponMsg ?? e.coupon}</p>}
          </div>

          <dl className="mt-5 space-y-2 text-[15px]">
            <Row label="সাবটোটাল" value={formatPrice(cart.subtotal)} />
            {discount > 0 && <Row label={`কুপন (${coupon!.code})`} value={`−${formatPrice(discount)}`} tone="text-leaf" />}
            <Row label="ডেলিভারি চার্জ" value={fee != null ? formatPrice(fee) : "এলাকা বাছাই করুন"} tone={fee == null ? "text-ink-soft text-sm" : undefined} />
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt>মোট (ক্যাশ অন ডেলিভারি)</dt>
              <dd className="text-2xl tabular-nums">{formatPrice(total)}</dd>
            </div>
          </dl>

          {state.status === "error" && state.message && (
            <p role="alert" className="mt-4 text-sm text-sindoor">
              {state.message}{" "}
              {!state.errors && !state.stock && <a href={site.facebook} target="_blank" rel="noopener noreferrer" className="underline">Facebook Page</a>}
            </p>
          )}
          {!enabled && <p className="mt-4 text-sm text-sindoor">অনলাইন অর্ডার এখনও চালু হয়নি — Facebook পেজে মেসেজ করুন।</p>}

          <button type="submit" disabled={pending || !enabled} className="mt-5 w-full bg-ink py-4 text-lg text-paper hover:bg-ink/85 disabled:opacity-60">
            {pending ? "অর্ডার হচ্ছে…" : `অর্ডার কনফার্ম করুন · ${formatPrice(total)}`}
          </button>
          <p className="mt-3 text-xs text-ink-soft">কনফার্ম করলে পেমেন্ট স্লিপ পাবেন (PDF ডাউনলোড করা যাবে)। আমরা ফোন করে অর্ডারটি নিশ্চিত করব।</p>
        </div>
      </aside>
    </form>
  );
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`tabular-nums ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-soft">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-sindoor">{error}</span> : hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}
